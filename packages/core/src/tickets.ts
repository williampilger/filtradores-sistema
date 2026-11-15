/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Ingressos: cortesia, venda na portaria (PDV), resgate de sócio, cancelamento
 */
import { prisma, Prisma, type Membership, type MembershipPlan, type Event } from '@filt/db';
import { onlyDigits } from '@filt/shared';
import { audit } from './audit';
import { InconsistencyError, InputError, NotFoundError } from './errors';
import { newTicketCode } from './ids';
import { eventFreeSeats, lockEvent, releaseTickets } from './inventory';
import { createOrder, startPayment } from './orders';

/** Cortesias: N ingressos (um por titular), pedido de valor zero pago pelo gateway `courtesy` */
export async function issueCourtesy(input: { eventId: number, ticketTypeId?: number | null, holders: { name: string, email?: string | null, cpf?: string | null }[], reason: string, byUserId: number, byUserName: string, userId?: number | null }) {
    if (!input.holders.length) throw new InputError('Informe ao menos um titular', 261115150001);
    if (!input.reason.trim()) throw new InputError('Informe o motivo da cortesia', 261115150002);
    const first = input.holders[0];
    const order = await createOrder({
        userId: input.userId ?? null, channel: 'POS', pos: true, createdById: input.byUserId, notes: input.reason,
        customer: { name: first.name, email: first.email ?? null, cpf: first.cpf ?? null },
        lines: [{ kind: 'TICKET', eventId: input.eventId, ticketTypeId: input.ticketTypeId ?? null, quantity: input.holders.length, holderNames: input.holders.map(h => h.name), unitPriceCents: 0 }],
    });
    await startPayment(order.id, 'COURTESY', { registeredById: input.byUserId, registeredByName: input.byUserName, note: input.reason });
    await audit({ userId: input.byUserId, action: 'ticket.courtesy', entity: 'event', entityId: input.eventId, data: { orderId: order.id, holders: input.holders.map(h => h.name), reason: input.reason } });
    return order;
}

/** Venda na portaria / PDV: pedido + pagamento manual (dinheiro/PIX direto) já quitado */
export async function sellAtGate(input: {
    eventId: number, lines: { ticketTypeId: number, quantity: number }[], customerName: string, customerCpf?: string | null,
    method: 'CASH' | 'MANUAL' | 'PIX', byUserId: number, byUserName: string, note?: string | null,
}) {
    const order = await createOrder({
        userId: null, channel: 'POS', pos: true, createdById: input.byUserId, notes: input.note ?? null,
        customer: { name: input.customerName || 'Venda na portaria', cpf: input.customerCpf ? onlyDigits(input.customerCpf) : null },
        lines: input.lines.map(l => ({ kind: 'TICKET' as const, eventId: input.eventId, ticketTypeId: l.ticketTypeId, quantity: l.quantity })),
    });
    // PIX direto na chave do clube = registrado como pagamento manual
    await startPayment(order.id, input.method === 'CASH' ? 'CASH' : 'MANUAL', { registeredById: input.byUserId, registeredByName: input.byUserName, note: input.method === 'PIX' ? `PIX direto${input.note ? ' - ' + input.note : ''}` : input.note });
    return prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { Items: { include: { Tickets: true } } } });
}

/** Planos elegíveis do evento (sem linhas = todos com eventAccess != NONE) */
export async function memberEligibility(event: Pick<Event, 'id' | 'memberAccess'>, m: (Membership & { Plan: MembershipPlan }) | null): Promise<{ eligible: boolean, reason: string | null }> {
    if (!m) return { eligible: false, reason: 'Não é sócio' };
    if (m.status !== 'ACTIVE') return { eligible: false, reason: 'Sócio não está em dia' };
    if (!event.memberAccess) return { eligible: false, reason: 'Este evento não tem entrada de sócio' };
    if (m.Plan.eventAccess === 'NONE') return { eligible: false, reason: 'Seu plano não inclui entrada nos jogos' };
    const eligible = await prisma.eventEligiblePlan.findMany({ where: { eventId: event.id }, select: { planId: true } });
    if (eligible.length && !eligible.some(e => e.planId === m.planId)) return { eligible: false, reason: 'Seu plano não dá acesso a este evento' };
    return { eligible: true, reason: null };
}

/** Sócio com plano CLAIM resgata o ingresso do jogo no app */
export async function claimMemberTicket(userId: number, eventId: number) {
    const m = await prisma.membership.findUnique({ where: { userId }, include: { Plan: true, User: true } });
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.deletedAt || event.status !== 'PUBLISHED') throw new NotFoundError('Evento não encontrado', 261115150003);
    const el = await memberEligibility(event, m);
    if (!el.eligible) throw new InconsistencyError(el.reason!, 261115150004);
    if (m!.Plan.eventAccess !== 'CLAIM') throw new InconsistencyError('Seu plano entra com a carteirinha: não precisa resgatar', 261115150005);

    return prisma.$transaction(async tx => {
        await lockEvent(tx, eventId);
        const existing = await tx.ticket.findFirst({ where: { eventId, membershipId: m!.id, origin: 'MEMBER_CLAIM', status: { in: ['VALID', 'USED'] } } });
        if (existing) return existing;
        const ev = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
        if (ev.memberCapacity != null && ev.calc_memberClaims >= ev.memberCapacity) throw new InconsistencyError('Os ingressos de sócio deste jogo esgotaram', 261115150006);
        const free = await eventFreeSeats(tx, eventId);
        if (free !== null && free <= 0) throw new InconsistencyError('Capacidade do evento esgotada', 261115150007);
        await tx.event.update({ where: { id: eventId }, data: { calc_memberClaims: { increment: 1 } } });
        return tx.ticket.create({
            data: { code: newTicketCode(), eventId, userId, membershipId: m!.id, holderName: m!.User.name, holderCpf: m!.User.cpf, origin: 'MEMBER_CLAIM' },
        });
    });
}

/** Cancela um ingresso VÁLIDO (sem estorno financeiro - para isso use o estorno do pagamento) */
export async function cancelTicket(ticketId: number, byUserId: number, reason: string) {
    await prisma.$transaction(async tx => {
        const t = await tx.ticket.findUnique({ where: { id: ticketId } });
        if (!t) throw new NotFoundError('Ingresso não encontrado', 261115150008);
        const n = await tx.ticket.updateMany({ where: { id: ticketId, status: 'VALID' }, data: { status: 'CANCELED', canceledAt: new Date() } });
        if (n.count === 0) throw new InconsistencyError('Apenas ingressos válidos (não utilizados) podem ser cancelados', 261115150009);
        if (t.origin === 'MEMBER_CLAIM') await tx.event.update({ where: { id: t.eventId }, data: { calc_memberClaims: { decrement: 1 } } });
        else await releaseTickets(tx, t.ticketTypeId, 1);
    });
    await audit({ userId: byUserId, action: 'ticket.cancel', entity: 'ticket', entityId: ticketId, data: { reason } });
}

export type TicketWithEvent = Prisma.TicketGetPayload<{ include: { Event: true, TicketType: true } }>;
