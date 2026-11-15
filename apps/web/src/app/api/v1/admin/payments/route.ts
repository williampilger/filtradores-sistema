/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET pagamentos (?status=&gateway=&from=&to=&page=) + totais do filtro
 */
import { prisma, type Prisma, type PaymentStatus } from '@filt/db';
import { route } from '@/lib/authenticate';
import { paging, qp } from '@/lib/http';

export const GET = route({ perm: ['payments.read', 'reports.finance'] }, async ({ req }) => {
    const { page, pageSize, skip, take } = paging(req);
    const from = qp(req, 'from'), to = qp(req, 'to');
    const where: Prisma.PaymentWhereInput = {
        ...(qp(req, 'status') ? { status: qp(req, 'status') as PaymentStatus } : {}),
        ...(qp(req, 'gateway') ? { gateway: qp(req, 'gateway') } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(new Date(to).getTime() + 86_400_000) } : {}) } } : {}),
        ...(qp(req, 'attention') === '1' ? { note: { startsWith: 'PAGO APÓS EXPIRAÇÃO' }, status: 'PAID' } : {}),
    };
    const [rows, total, sums] = await Promise.all([
        prisma.payment.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: { Order: { select: { id: true, code: true, customerName: true } }, RegisteredBy: { select: { name: true } } } }),
        prisma.payment.count({ where }),
        prisma.payment.groupBy({ by: ['status'], where, _sum: { amountCents: true, refundedCents: true }, _count: { _all: true } }),
    ]);
    return {
        page, pageSize, total,
        totals: sums.map(s => ({ status: s.status, count: s._count._all, amountCents: s._sum.amountCents ?? 0, refundedCents: s._sum.refundedCents ?? 0 })),
        rows: rows.map(p => ({
            id: p.id, gateway: p.gateway, method: p.method, status: p.status, amountCents: p.amountCents, refundedCents: p.refundedCents, externalId: p.externalId,
            createdAt: p.createdAt, paidAt: p.paidAt, note: p.note, registeredBy: p.RegisteredBy?.name ?? null, order: p.Order,
        })),
    };
});
