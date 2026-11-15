/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET lote de produção: resumo por variação, encomendas pagas e fila
 */
import { prisma } from '@filt/db';
import { batchSummary, NotFoundError } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: ['waitlist.manage', 'orders.read'] }, async ({ params }) => {
    const id = idParam(params.id);
    const b = await prisma.productionBatch.findUnique({ where: { id }, include: { Product: true } });
    if (!b) throw new NotFoundError('Lote não encontrado', 261115310002);
    const [summary, items, entries] = await Promise.all([
        batchSummary(id),
        prisma.orderItem.findMany({ where: { batchId: id, Order: { status: { in: ['PAID', 'PENDING_PAYMENT'] } } }, include: { Order: true, Variant: true }, orderBy: { id: 'asc' } }),
        prisma.waitlistEntry.findMany({ where: { batchId: id }, include: { User: { select: { name: true, email: true, phone: true } }, Variant: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    return {
        id: b.id, name: b.name, status: b.status, minQuantity: b.minQuantity, closesAt: b.closesAt, notes: b.notes, product: { id: b.Product.id, name: b.Product.name, waitlistPayment: b.Product.waitlistPayment },
        summary,
        orders: items.map(i => ({ itemId: i.id, orderCode: i.Order.code, orderStatus: i.Order.status, customer: i.Order.customerName, phone: i.Order.customerPhone, variant: i.Variant?.name, quantity: i.quantity, deliveryStatus: i.deliveryStatus })),
        waitlist: entries.map(e => ({ id: e.id, name: e.User.name, email: e.User.email, phone: e.User.phone, variant: e.Variant.name, quantity: e.quantity, status: e.status, createdAt: e.createdAt, reservationExpiresAt: e.reservationExpiresAt })),
    };
});
