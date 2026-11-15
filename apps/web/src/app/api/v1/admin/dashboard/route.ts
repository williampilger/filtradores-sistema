/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET painel inicial da gestão (indicadores conforme as permissões)
 */
import { prisma } from '@filt/db';
import { can, route } from '@/lib/authenticate';

export const GET = route({ perm: ['members.read', 'events.read', 'orders.read', 'payments.read', 'reports.finance', 'users.read', 'feed.write', 'lineups.write', 'products.write'] }, async ({ auth }) => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const out: Record<string, unknown> = {};
    if (can(auth, 'members.read')) {
        const g = await prisma.membership.groupBy({ by: ['status'], _count: { _all: true } });
        out.members = Object.fromEntries(g.map(x => [x.status, x._count._all]));
    }
    if (can(auth, 'events.read')) {
        out.upcomingEvents = await prisma.event.findMany({ where: { deletedAt: null, startsAt: { gte: new Date(now.getTime() - 6 * 3_600_000) }, status: { not: 'CANCELED' } }, orderBy: { startsAt: 'asc' }, take: 5, select: { id: true, title: true, startsAt: true, status: true, capacity: true, _count: { select: { Tickets: { where: { status: { in: ['VALID', 'USED'] } } } } } } });
    }
    if (can(auth, 'orders.read')) {
        out.ordersPending = await prisma.order.count({ where: { status: 'PENDING_PAYMENT' } });
        out.itemsToDeliver = await prisma.orderItem.count({ where: { deliveryStatus: { in: ['PENDING', 'READY_FOR_PICKUP'] }, Order: { status: 'PAID' } } });
        out.waitlistWaiting = await prisma.waitlistEntry.count({ where: { status: { in: ['WAITING', 'NOTIFIED'] } } });
    }
    if (can(auth, 'payments.read', 'reports.finance')) {
        const paid = await prisma.payment.groupBy({ by: ['gateway'], where: { status: { in: ['PAID', 'PARTIALLY_REFUNDED'] }, paidAt: { gte: monthStart } }, _sum: { amountCents: true, refundedCents: true } });
        out.revenueMonth = paid.map(p => ({ gateway: p.gateway, cents: (p._sum.amountCents ?? 0) - (p._sum.refundedCents ?? 0) }));
        out.paymentsToRefund = await prisma.payment.count({ where: { note: { startsWith: 'PAGO APÓS EXPIRAÇÃO' }, status: 'PAID' } });
    }
    return out;
});
