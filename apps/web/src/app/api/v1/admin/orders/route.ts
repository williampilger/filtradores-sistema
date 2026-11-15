/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET pedidos (?status=&channel=&q=&delivery=pending&page=)
 */
import { prisma, type Prisma, type OrderStatus, type OrderChannel } from '@filt/db';
import { route } from '@/lib/authenticate';
import { paging, qp } from '@/lib/http';

export const GET = route({ perm: 'orders.read' }, async ({ req }) => {
    const { page, pageSize, skip, take } = paging(req);
    const q = qp(req, 'q');
    const where: Prisma.OrderWhereInput = {
        ...(qp(req, 'status') ? { status: qp(req, 'status') as OrderStatus } : {}),
        ...(qp(req, 'channel') ? { channel: qp(req, 'channel') as OrderChannel } : {}),
        ...(qp(req, 'delivery') === 'pending' ? { status: 'PAID', Items: { some: { deliveryStatus: { in: ['PENDING', 'READY_FOR_PICKUP', 'IN_PRODUCTION'] } } } } : {}),
        ...(q ? { OR: [{ code: q.toUpperCase() }, { customerName: { contains: q } }, { customerEmail: { contains: q } }, ...(/^\d{3,}$/.test(q) ? [{ customerCpf: { contains: q } }] : [])] } : {}),
    };
    const [rows, total] = await Promise.all([
        prisma.order.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: { Items: true, Payments: { orderBy: { id: 'desc' }, take: 1 } } }),
        prisma.order.count({ where }),
    ]);
    return {
        page, pageSize, total,
        rows: rows.map(o => ({
            id: o.id, code: o.code, status: o.status, channel: o.channel, customerName: o.customerName, customerEmail: o.customerEmail, totalCents: o.totalCents,
            refundedCents: o.refundedCents, createdAt: o.createdAt, paidAt: o.paidAt, items: o.Items.map(i => `${i.quantity}x ${i.ref_name}`).join(', '),
            lastPayment: o.Payments[0] ? { gateway: o.Payments[0].gateway, method: o.Payments[0].method, status: o.Payments[0].status } : null,
            pendingDelivery: o.Items.filter(i => ['PENDING', 'READY_FOR_PICKUP', 'IN_PRODUCTION'].includes(i.deliveryStatus)).length,
        })),
    };
});
