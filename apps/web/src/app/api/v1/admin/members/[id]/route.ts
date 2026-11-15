/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET detalhe do sócio (cobranças, entradas em jogos)
 */
import { prisma } from '@filt/db';
import { NotFoundError, toPlanDTO } from '@filt/core';
import { StorageSystem } from '@filt/integrations/storage';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: 'members.read' }, async ({ params }) => {
    const m = await prisma.membership.findUnique({
        where: { id: idParam(params.id) },
        include: {
            User: true, Plan: true,
            Charges: { orderBy: { createdAt: 'desc' }, include: { OrderItems: { include: { Order: { include: { Payments: true } } } } } },
            EventEntries: { include: { Event: { select: { id: true, title: true, startsAt: true } } }, orderBy: { createdAt: 'desc' }, take: 50 },
        },
    });
    if (!m) throw new NotFoundError('Sócio não encontrado', 261115290001);
    return {
        id: m.id, status: m.status, memberNumber: m.memberNumber, startedAt: m.startedAt, currentPeriodStart: m.currentPeriodStart, currentPeriodEnd: m.currentPeriodEnd,
        canceledAt: m.canceledAt, cancelReason: m.cancelReason, qrVersion: m.qrVersion, plan: toPlanDTO(m.Plan),
        user: { id: m.User.id, name: m.User.name, email: m.User.email, cpf: m.User.cpf, phone: m.User.phone, photoUrl: StorageSystem.url(m.User.photoKey) },
        charges: m.Charges.map(c => ({
            id: c.id, amountCents: c.amountCents, dueDate: c.dueDate, status: c.status, isEnrollment: c.isEnrollment, periodStart: c.periodStart, periodEnd: c.periodEnd, paidAt: c.paidAt,
            orders: c.OrderItems.map(i => ({ id: i.Order.id, code: i.Order.code, status: i.Order.status, payments: i.Order.Payments.map(p => ({ id: p.id, gateway: p.gateway, method: p.method, status: p.status, amountCents: p.amountCents })) })),
        })),
        entries: m.EventEntries.map(e => ({ event: e.Event, at: e.createdAt })),
    };
});
