/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET painel do evento para a organização (contadores, lotes, vendas por canal)
 */
import { prisma } from '@filt/db';
import { eventCounters, NotFoundError, toTicketTypeDTO } from '@filt/core';
import { can, canOnEvent, route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: ['checkin.validate', 'events.read', 'tickets.sell_manual'] }, async ({ params, auth }) => {
    const id = idParam(params.id);
    // qualquer uma das permissões de evento (portaria, organização ou venda), respeitando a restrição por EventStaff
    if (!(['events.read', 'checkin.validate', 'tickets.sell_manual'] as const).some(p => canOnEvent(auth, id, p))) throw new NotFoundError('Evento não encontrado', 261115270003);
    const e = await prisma.event.findUnique({ where: { id }, include: { TicketTypes: { orderBy: { sortOrder: 'asc' } } } });
    if (!e || e.deletedAt) throw new NotFoundError('Evento não encontrado', 261115270001);
    const [counters, byOrigin, byResult] = await Promise.all([
        eventCounters(id),
        prisma.ticket.groupBy({ by: ['origin'], where: { eventId: id, status: { in: ['VALID', 'USED'] } }, _count: { _all: true } }),
        prisma.checkIn.groupBy({ by: ['result'], where: { eventId: id }, _count: { _all: true } }),
    ]);
    return {
        id: e.id, slug: e.slug, title: e.title, startsAt: e.startsAt, venue: e.venue, status: e.status, capacity: e.capacity, memberCapacity: e.memberCapacity,
        counters,
        ticketTypes: e.TicketTypes.map(t => ({ ...toTicketTypeDTO(t, null), quantity: t.quantity, allocated: t.calc_allocated })),
        ticketsByOrigin: Object.fromEntries(byOrigin.map(g => [g.origin, g._count._all])),
        checkinsByResult: can(auth, 'events.read', 'checkin.reports') ? Object.fromEntries(byResult.map(g => [g.result, g._count._all])) : undefined,
    };
});
