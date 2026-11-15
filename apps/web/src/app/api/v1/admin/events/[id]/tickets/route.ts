/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET ingressos do evento (?q=&origin=&status=&page=)
 */
import { prisma, type Prisma, type TicketOrigin, type TicketStatus } from '@filt/db';
import { maskCpf } from '@filt/shared';
import { can, route } from '@/lib/authenticate';
import { idParam, paging, qp } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: ['events.read', 'tickets.refund'] }, async ({ req, params, auth }) => {
    const { page, pageSize, skip, take } = paging(req, 500);
    const q = qp(req, 'q');
    const where: Prisma.TicketWhereInput = {
        eventId: idParam(params.id),
        ...(qp(req, 'origin') ? { origin: qp(req, 'origin') as TicketOrigin } : {}),
        ...(qp(req, 'status') ? { status: qp(req, 'status') as TicketStatus } : {}),
        ...(q ? { OR: [{ holderName: { contains: q } }, { code: q }, { OrderItem: { Order: { code: q.toUpperCase() } } }] } : {}),
    };
    const [rows, total] = await Promise.all([
        prisma.ticket.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: { TicketType: true, OrderItem: { include: { Order: true } }, IssuedBy: { select: { name: true } } } }),
        prisma.ticket.count({ where }),
    ]);
    const fullCpf = can(auth, 'members.read');
    return {
        page, pageSize, total,
        rows: rows.map(t => ({
            id: t.id, holderName: t.holderName, cpf: fullCpf ? t.holderCpf : maskCpf(t.holderCpf), ticketType: t.TicketType?.name ?? null, origin: t.origin, status: t.status,
            usedAt: t.usedAt, createdAt: t.createdAt, orderCode: t.OrderItem?.Order.code ?? null, issuedBy: t.IssuedBy?.name ?? null, courtesyReason: t.courtesyReason,
        })),
    };
});
