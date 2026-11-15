/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET pedido completo (itens, pagamentos, estornos, ingressos)
 */
import { prisma } from '@filt/db';
import { NotFoundError, toTicketDTO } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: 'orders.read' }, async ({ params }) => {
    const o = await prisma.order.findUnique({
        where: { id: idParam(params.id) },
        include: {
            User: { select: { id: true, name: true, email: true } }, CreatedBy: { select: { name: true } },
            Items: { include: { Tickets: { include: { Event: true, TicketType: true } } } },
            Payments: { orderBy: { id: 'asc' }, include: { Refunds: { include: { CreatedBy: { select: { name: true } } } }, RegisteredBy: { select: { name: true } } } },
        },
    });
    if (!o) throw new NotFoundError('Pedido não encontrado', 261115320001);
    return {
        id: o.id, code: o.code, status: o.status, channel: o.channel, subtotalCents: o.subtotalCents, discountCents: o.discountCents, totalCents: o.totalCents, refundedCents: o.refundedCents,
        customer: { name: o.customerName, email: o.customerEmail, cpf: o.customerCpf, phone: o.customerPhone }, user: o.User, createdBy: o.CreatedBy?.name ?? null,
        notes: o.notes, expiresAt: o.expiresAt, paidAt: o.paidAt, canceledAt: o.canceledAt, createdAt: o.createdAt,
        items: o.Items.map(i => ({ id: i.id, kind: i.kind, name: i.ref_name, quantity: i.quantity, unitPriceCents: i.unitPriceCents, discountCents: i.discountCents, totalCents: i.totalCents, deliveryStatus: i.deliveryStatus, deliveredAt: i.deliveredAt, tickets: i.Tickets.map(toTicketDTO) })),
        payments: o.Payments.map(p => ({
            id: p.id, gateway: p.gateway, method: p.method, status: p.status, amountCents: p.amountCents, refundedCents: p.refundedCents, externalId: p.externalId, paidAt: p.paidAt, createdAt: p.createdAt,
            note: p.note, registeredBy: p.RegisteredBy?.name ?? null, refunds: p.Refunds.map(r => ({ id: r.id, amountCents: r.amountCents, reason: r.reason, status: r.status, by: r.CreatedBy?.name ?? null, createdAt: r.createdAt })),
        })),
    };
});
