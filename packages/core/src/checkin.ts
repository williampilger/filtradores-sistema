/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Controle de entrada (leitura de QR de ingresso e de carteirinha)
 *
 * ATOMICIDADE (dois leitores lendo o mesmo QR ao mesmo tempo):
 *  - Ingresso: UPDATE ... WHERE status = 'VALID' -> só um leitor consegue (o outro recebe ALREADY_USED).
 *  - Sócio AUTOMATIC: INSERT em member_event_entries (PK eventId+membershipId) -> duplicado = ALREADY_USED.
 * Toda leitura (inclusive negada) é registrada em CheckIn.
 */
import { prisma, Prisma } from '@filt/db';
import { LABELS, maskCpf, parseQr, verifyMemberQr, type CheckInResponse, type CheckInResult, type EventCounters } from '@filt/shared';
import { StorageSystem } from '@filt/integrations/storage';
import { NotFoundError } from './errors';
import { eventFreeSeats, lockEvent } from './inventory';
import { cardKeyFor } from './memberships';
import { memberEligibility } from './tickets';

export async function eventCounters(eventId: number): Promise<EventCounters> {
    const [sold, used, entries, ev] = await Promise.all([
        prisma.ticket.count({ where: { eventId, status: { in: ['VALID', 'USED'] } } }),
        prisma.ticket.count({ where: { eventId, status: 'USED' } }),
        prisma.memberEventEntry.count({ where: { eventId } }),
        prisma.event.findUnique({ where: { id: eventId }, select: { capacity: true } }),
    ]);
    return { ticketsSold: sold, ticketsUsed: used, memberEntries: entries, capacity: ev?.capacity ?? null };
}

type Ctx = { eventId: number, operatorId: number, deviceId?: string | null };

async function finish(ctx: Ctx, result: CheckInResult, extra: Omit<CheckInResponse, 'result' | 'message' | 'counters'> & { ticketId?: number, membershipId?: number, rawCode?: string, message?: string }): Promise<CheckInResponse> {
    await prisma.checkIn.create({
        data: {
            eventId: ctx.eventId, operatorId: ctx.operatorId, result, deviceId: ctx.deviceId?.slice(0, 64) ?? null,
            ticketId: extra.ticketId ?? null, membershipId: extra.membershipId ?? null, rawCode: extra.rawCode?.slice(0, 160) ?? null,
        },
    });
    return { result, message: extra.message ?? LABELS.checkInResult[result], ticket: extra.ticket, member: extra.member, counters: await eventCounters(ctx.eventId) };
}

/** Valida o conteúdo lido de um QR na entrada do evento */
export async function validateQr(ctx: Ctx, raw: string): Promise<CheckInResponse> {
    const event = await prisma.event.findUnique({ where: { id: ctx.eventId } });
    if (!event || event.deletedAt) throw new NotFoundError('Evento não encontrado', 261115160001);
    const q = parseQr(raw);
    if (q.kind === 'invalid') return finish(ctx, 'INVALID', { rawCode: raw });
    if (q.kind === 'ticket') return checkInTicket(ctx, { code: q.code }, raw);

    const m = await prisma.membership.findUnique({ where: { id: q.membershipId } });
    if (!m) return finish(ctx, 'INVALID', { rawCode: raw });
    const v = verifyMemberQr(cardKeyFor(m), q);
    if (v === 'BAD_SIGNATURE') return finish(ctx, 'INVALID', { rawCode: raw, membershipId: m.id });
    if (v === 'EXPIRED') return finish(ctx, 'EXPIRED_CODE', { rawCode: raw, membershipId: m.id });
    return checkInMember(ctx, m.id, raw);
}

/** Entrada por ingresso (QR ou busca manual por id) */
export async function checkInTicket(ctx: Ctx, by: { code?: string, id?: number }, rawCode?: string): Promise<CheckInResponse> {
    const t = await prisma.ticket.findFirst({ where: by.id ? { id: by.id } : { code: by.code }, include: { TicketType: true } });
    if (!t) return finish(ctx, 'INVALID', { rawCode });
    const info = { id: t.id, holderName: t.holderName, ticketTypeName: t.TicketType?.name ?? (t.origin === 'MEMBER_CLAIM' ? 'Sócio' : null), origin: t.origin, usedAt: t.usedAt?.toISOString() ?? null };
    if (t.eventId !== ctx.eventId) return finish(ctx, 'WRONG_EVENT', { rawCode, ticketId: t.id, ticket: info });
    if (t.status === 'CANCELED' || t.status === 'REFUNDED') return finish(ctx, 'CANCELED', { rawCode, ticketId: t.id, ticket: info });

    // sócio com ingresso resgatado: precisa continuar em dia
    if (t.membershipId) {
        const m = await prisma.membership.findUnique({ where: { id: t.membershipId } });
        if (!m || m.status !== 'ACTIVE') return finish(ctx, 'MEMBER_INACTIVE', { rawCode, ticketId: t.id, ticket: info });
    }

    const now = new Date();
    const n = await prisma.ticket.updateMany({ where: { id: t.id, status: 'VALID' }, data: { status: 'USED', usedAt: now } });
    if (n.count === 0) {
        const fresh = await prisma.ticket.findUnique({ where: { id: t.id } });
        return finish(ctx, 'ALREADY_USED', { rawCode, ticketId: t.id, ticket: { ...info, usedAt: fresh?.usedAt?.toISOString() ?? null } });
    }
    return finish(ctx, 'OK', { rawCode, ticketId: t.id, ticket: { ...info, usedAt: now.toISOString() } });
}

/** Entrada por carteirinha (QR validado ou busca manual) */
export async function checkInMember(ctx: Ctx, membershipId: number, rawCode?: string): Promise<CheckInResponse> {
    const m = await prisma.membership.findUnique({ where: { id: membershipId }, include: { Plan: true, User: true } });
    if (!m) return finish(ctx, 'INVALID', { rawCode });
    const member = {
        membershipId: m.id, name: m.User.name, memberNumber: m.memberNumber, planName: m.Plan.name, status: m.status,
        photoUrl: StorageSystem.url(m.User.photoKey), cpfMasked: maskCpf(m.User.cpf),
    };
    const base = { rawCode, membershipId: m.id, member };
    if (m.status !== 'ACTIVE') return finish(ctx, 'MEMBER_INACTIVE', base);

    const event = await prisma.event.findUniqueOrThrow({ where: { id: ctx.eventId } });
    const el = await memberEligibility(event, m);
    if (!el.eligible) return finish(ctx, 'NOT_ELIGIBLE', { ...base, message: el.reason ?? undefined });

    if (m.Plan.eventAccess === 'CLAIM') {
        const t = await prisma.ticket.findFirst({ where: { eventId: ctx.eventId, membershipId: m.id, origin: 'MEMBER_CLAIM', status: { in: ['VALID', 'USED'] } } });
        if (!t) return finish(ctx, 'NOT_ELIGIBLE', { ...base, message: 'Sócio sem ingresso resgatado para este jogo (resgate no app)' });
        const r = await checkInTicket(ctx, { id: t.id }, rawCode);
        return { ...r, member };
    }

    // AUTOMATIC: a carteirinha é a entrada
    try {
        const outcome = await prisma.$transaction(async tx => {
            await lockEvent(tx, ctx.eventId);
            const ev = await tx.event.findUniqueOrThrow({ where: { id: ctx.eventId } });
            if (ev.memberCapacity != null) {
                const entries = await tx.memberEventEntry.count({ where: { eventId: ctx.eventId } });
                if (entries + ev.calc_memberClaims >= ev.memberCapacity) return 'CAPACITY_FULL' as const;
            }
            const free = await eventFreeSeats(tx, ctx.eventId);
            if (free !== null && free <= 0) return 'CAPACITY_FULL' as const;
            await tx.memberEventEntry.create({ data: { eventId: ctx.eventId, membershipId: m.id } });
            return 'OK' as const;
        });
        return finish(ctx, outcome, base);
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return finish(ctx, 'ALREADY_USED', base);
        throw e;
    }
}

/** Busca manual na portaria (sem QR): ingressos por titular/CPF e sócios por nome/CPF/número */
export async function searchAttendees(eventId: number, q: string) {
    const term = q.trim();
    if (term.length < 2) return { tickets: [], members: [] };
    const digits = term.replace(/\D/g, '');
    const [tickets, members] = await Promise.all([
        prisma.ticket.findMany({
            where: { eventId, OR: [{ holderName: { contains: term } }, ...(digits.length >= 3 ? [{ holderCpf: { contains: digits } }] : [])] },
            include: { TicketType: true }, take: 20, orderBy: { holderName: 'asc' },
        }),
        prisma.membership.findMany({
            where: {
                status: { in: ['ACTIVE', 'OVERDUE'] },
                OR: [
                    { User: { name: { contains: term } } },
                    ...(digits.length >= 3 ? [{ User: { cpf: { contains: digits } } }] : []),
                    ...(digits && digits === term ? [{ memberNumber: Number(digits) }] : []),
                ],
            },
            include: { User: true, Plan: true }, take: 20,
        }),
    ]);
    return {
        tickets: tickets.map(t => ({ id: t.id, holderName: t.holderName, cpfMasked: maskCpf(t.holderCpf), ticketTypeName: t.TicketType?.name ?? null, status: t.status, origin: t.origin, usedAt: t.usedAt })),
        members: members.map(m => ({ membershipId: m.id, name: m.User.name, memberNumber: m.memberNumber, planName: m.Plan.name, status: m.status, cpfMasked: maskCpf(m.User.cpf), photoUrl: StorageSystem.url(m.User.photoKey) })),
    };
}
