/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Testes de integração das regras críticas (reserva, pagamento, expiração, check-in, lista de espera, sócios)
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@filt/db';
import { buildMemberQr, buildTicketQr } from '@filt/shared';
import {
    adjustStock, cardKeyFor, checkInMember, createOrder, expireOrders, fulfillOrder, getRedis, joinPlan, joinWaitlist,
    refundPayment, startPayment, validateQr, waitlistSweep, issueCourtesy, claimMemberTicket,
} from '../src';
import { customer, mkEvent, mkProduct, mkUser, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(async () => { await prisma.$disconnect(); getRedis().disconnect(); });

const operator = async () => mkUser({ name: 'Operador', isMaster: true });

describe('reserva de ingressos', () => {
    it('não vende acima da quantidade do lote com compras simultâneas', async () => {
        const ev = await mkEvent({ types: [{ qty: 5 }] });
        const results = await Promise.allSettled(Array.from({ length: 10 }, () =>
            createOrder({ userId: null, channel: 'WEB', customer, lines: [{ kind: 'TICKET', ticketTypeId: ev.TicketTypes[0].id, quantity: 1 }] })));
        expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(5);
        const t = await prisma.ticketType.findUniqueOrThrow({ where: { id: ev.TicketTypes[0].id } });
        expect(t.calc_allocated).toBe(5);
    });

    it('respeita a capacidade total do evento somando os lotes', async () => {
        const ev = await mkEvent({ capacity: 3, types: [{ qty: 5 }, { qty: 5 }] });
        await createOrder({ userId: null, channel: 'WEB', customer, lines: [{ kind: 'TICKET', ticketTypeId: ev.TicketTypes[0].id, quantity: 2 }] });
        await expect(createOrder({ userId: null, channel: 'WEB', customer, lines: [{ kind: 'TICKET', ticketTypeId: ev.TicketTypes[1].id, quantity: 2 }] })).rejects.toThrow(/Restam apenas 1/);
    });

    it('pedido expirado devolve a reserva', async () => {
        const ev = await mkEvent({ types: [{ qty: 2 }] });
        const o = await createOrder({ userId: null, channel: 'WEB', customer, lines: [{ kind: 'TICKET', ticketTypeId: ev.TicketTypes[0].id, quantity: 2 }] });
        expect(await expireOrders(new Date(Date.now() + 3_600_000))).toBe(1);
        expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('EXPIRED');
        expect((await prisma.ticketType.findUniqueOrThrow({ where: { id: ev.TicketTypes[0].id } })).calc_allocated).toBe(0);
    });
});

describe('pagamento manual, idempotência, estorno', () => {
    it('emite ingressos uma única vez e o estorno total cancela', async () => {
        const op = await operator();
        const ev = await mkEvent({ types: [{ qty: 10, price: 2500 }] });
        const o = await createOrder({ userId: null, channel: 'POS', pos: true, createdById: op.id, customer, lines: [{ kind: 'TICKET', ticketTypeId: ev.TicketTypes[0].id, quantity: 2, holderNames: ['Ana', 'Bia'] }] });
        const pay = await startPayment(o.id, 'CASH', { registeredById: op.id, registeredByName: op.name });
        expect(pay.status).toBe('PAID');
        await fulfillOrder(o.id, pay.id); // repetido (webhook duplicado)
        const tickets = await prisma.ticket.findMany({ where: { eventId: ev.id } });
        expect(tickets.map(t => t.holderName).sort()).toEqual(['Ana', 'Bia']);
        expect(tickets.every(t => t.origin === 'MANUAL')).toBe(true);

        await refundPayment(pay.id, { reason: 'desistência', byUserId: op.id });
        expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('REFUNDED');
        expect((await prisma.ticket.findMany({ where: { eventId: ev.id } })).every(t => t.status === 'REFUNDED')).toBe(true);
        expect((await prisma.ticketType.findUniqueOrThrow({ where: { id: ev.TicketTypes[0].id } })).calc_allocated).toBe(0);
        expect(await prisma.auditLog.count({ where: { action: { in: ['payment.manual', 'payment.refund'] } } })).toBe(2);
    });

    it('cortesia exige motivo e gera ingressos COURTESY', async () => {
        const op = await operator();
        const ev = await mkEvent();
        await issueCourtesy({ eventId: ev.id, holders: [{ name: 'Imprensa' }], reason: 'Jornal local', byUserId: op.id, byUserName: op.name });
        const t = await prisma.ticket.findFirstOrThrow({ where: { eventId: ev.id } });
        expect(t.origin).toBe('COURTESY');
        expect(t.courtesyReason).toBe('Jornal local');
    });
});

describe('check-in', () => {
    it('ingresso: entra uma vez; segunda leitura = já utilizado; outro evento = WRONG_EVENT', async () => {
        const op = await operator();
        const ev = await mkEvent(); const other = await mkEvent();
        await issueCourtesy({ eventId: ev.id, holders: [{ name: 'Fulano' }], reason: 'teste', byUserId: op.id, byUserName: op.name });
        const t = await prisma.ticket.findFirstOrThrow({ where: { eventId: ev.id } });
        const [a, b] = await Promise.all([
            validateQr({ eventId: ev.id, operatorId: op.id }, buildTicketQr(t.code)),
            validateQr({ eventId: ev.id, operatorId: op.id }, buildTicketQr(t.code)),
        ]);
        expect([a.result, b.result].sort()).toEqual(['ALREADY_USED', 'OK']);
        expect((await validateQr({ eventId: other.id, operatorId: op.id }, buildTicketQr(t.code))).result).toBe('WRONG_EVENT');
        expect((await validateQr({ eventId: ev.id, operatorId: op.id }, 'lixo')).result).toBe('INVALID');
        expect(await prisma.checkIn.count()).toBe(4);
    });

    it('carteirinha AUTOMATIC: QR rotativo vale uma entrada; inadimplente é barrado', async () => {
        const op = await operator();
        const ev = await mkEvent();
        const user = await mkUser({ cpf: '52998224725' });
        const plan = await prisma.membershipPlan.create({ data: { name: 'Ouro', slug: 'ouro', priceCents: 5000, eventAccess: 'AUTOMATIC' } });
        const m = await prisma.membership.create({ data: { userId: user.id, planId: plan.id, status: 'ACTIVE', memberNumber: 1, currentPeriodEnd: new Date(Date.now() + 86_400_000) } });
        const qr = buildMemberQr(cardKeyFor(m), m.id);
        expect((await validateQr({ eventId: ev.id, operatorId: op.id }, qr)).result).toBe('OK');
        expect((await validateQr({ eventId: ev.id, operatorId: op.id }, qr)).result).toBe('ALREADY_USED');
        // QR de versão antiga (carteirinha invalidada)
        await prisma.membership.update({ where: { id: m.id }, data: { qrVersion: 2 } });
        expect((await validateQr({ eventId: ev.id, operatorId: op.id }, qr)).result).toBe('INVALID');
        await prisma.membership.update({ where: { id: m.id }, data: { status: 'OVERDUE' } });
        const ev2 = await mkEvent();
        expect((await checkInMember({ eventId: ev2.id, operatorId: op.id }, m.id)).result).toBe('MEMBER_INACTIVE');
    });

    it('carteirinha CLAIM: precisa resgatar; resgate respeita a cota de sócios', async () => {
        const op = await operator();
        const ev = await prisma.event.update({ where: { id: (await mkEvent()).id }, data: { memberCapacity: 1 } });
        const plan = await prisma.membershipPlan.create({ data: { name: 'Prata', slug: 'prata', priceCents: 3000, eventAccess: 'CLAIM' } });
        const mk = async (cpf: string) => {
            const u = await mkUser({ cpf });
            const m = await prisma.membership.create({ data: { userId: u.id, planId: plan.id, status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 86_400_000) } });
            return { u, m };
        };
        const a = await mk('52998224725'); const b = await mk('11144477735');
        expect((await checkInMember({ eventId: ev.id, operatorId: op.id }, a.m.id)).result).toBe('NOT_ELIGIBLE');
        await claimMemberTicket(a.u.id, ev.id);
        await expect(claimMemberTicket(b.u.id, ev.id)).rejects.toThrow(/esgotaram/);
        expect((await checkInMember({ eventId: ev.id, operatorId: op.id }, a.m.id)).result).toBe('OK');
    });
});

describe('lista de espera', () => {
    it('FIFO com reserva ao repor estoque e repasse ao próximo quando a chamada expira', async () => {
        const op = await operator();
        const p = await mkProduct({ stock: 0, waitlist: true });
        const v = p.Variants[0];
        const u1 = await mkUser(); const u2 = await mkUser();
        await expect(createOrder({ userId: u1.id, channel: 'WEB', customer, lines: [{ kind: 'PRODUCT', variantId: v.id, quantity: 1 }] })).rejects.toThrow(/esgotado/);
        const e1 = await joinWaitlist(u1.id, v.id, 1);
        const e2 = await joinWaitlist(u2.id, v.id, 1);

        await adjustStock(v.id, 1, 'RESTOCK', op.id);
        expect((await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: e1.id } })).status).toBe('NOTIFIED');
        expect((await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: e2.id } })).status).toBe('WAITING');
        expect((await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).reserved).toBe(1);
        // ninguém de fora consegue comprar a unidade reservada
        await expect(createOrder({ userId: null, channel: 'WEB', customer, lines: [{ kind: 'PRODUCT', variantId: v.id, quantity: 1 }] })).rejects.toThrow(/esgotado/);

        await waitlistSweep(new Date(Date.now() + 100 * 3_600_000));
        expect((await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: e1.id } })).status).toBe('EXPIRED');
        const e2b = await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: e2.id } });
        expect(e2b.status).toBe('NOTIFIED');

        // u2 compra usando a chamada
        const o = await createOrder({ userId: u2.id, channel: 'WEB', customer, lines: [{ kind: 'PRODUCT', variantId: v.id, quantity: 1, waitlistEntryId: e2.id }] });
        const pay = await startPayment(o.id, 'CASH', { registeredById: op.id, registeredByName: op.name });
        expect(pay.status).toBe('PAID');
        const vv = await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } });
        expect([vv.stock, vv.reserved]).toEqual([0, 0]);
        expect((await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: e2.id } })).status).toBe('CONVERTED');
    });
});

describe('sócios', () => {
    it('adesão paga ativa o vínculo, numera o sócio e aplica desconto na loja', async () => {
        const op = await operator();
        const user = await mkUser({ cpf: '52998224725' });
        const plan = await prisma.membershipPlan.create({ data: { name: 'Bronze', slug: 'bronze', priceCents: 2000, enrollmentFeeCents: 1000, storeDiscountPct: 10, period: 'MONTHLY' } });
        const order = await joinPlan(user.id, plan.id, 'APP');
        expect(order.totalCents).toBe(3000);
        await startPayment(order.id, 'CASH', { registeredById: op.id, registeredByName: op.name });
        const m = await prisma.membership.findUniqueOrThrow({ where: { userId: user.id } });
        expect(m.status).toBe('ACTIVE');
        expect(m.memberNumber).toBe(1);
        expect(m.currentPeriodEnd!.getTime()).toBeGreaterThan(Date.now() + 27 * 86_400_000);

        const p = await mkProduct({ stock: 5 });
        const o2 = await createOrder({ userId: user.id, channel: 'APP', customer, lines: [{ kind: 'PRODUCT', variantId: p.Variants[0].id, quantity: 1 }] });
        expect(o2.totalCents).toBe(10800);
    });
});
