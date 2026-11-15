/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 GET situação de sócio + histórico de cobranças
 */
import { prisma } from '@filt/db';
import { toPlanDTO } from '@filt/core';
import type { ChargeDTO } from '@filt/shared';
import { route } from '@/lib/authenticate';

export const GET = route({}, async ({ auth }) => {
    const m = await prisma.membership.findUnique({
        where: { userId: auth.user.id },
        include: { Plan: true, Charges: { orderBy: { createdAt: 'desc' }, take: 50, include: { OrderItems: { include: { Order: true } } } } },
    });
    if (!m) return { membership: null, charges: [] };
    const charges: ChargeDTO[] = m.Charges.map(c => ({
        id: c.id, amountCents: c.amountCents, dueDate: c.dueDate.toISOString(), status: c.status, periodStart: c.periodStart?.toISOString() ?? null,
        periodEnd: c.periodEnd?.toISOString() ?? null, paidAt: c.paidAt?.toISOString() ?? null,
        orderId: c.OrderItems.map(i => i.Order).find(o => o.status === 'PENDING_PAYMENT' || o.status === 'PAID')?.id ?? null,
    }));
    return {
        membership: { id: m.id, status: m.status, memberNumber: m.memberNumber, startedAt: m.startedAt, currentPeriodEnd: m.currentPeriodEnd, plan: toPlanDTO(m.Plan) },
        charges,
    };
});
