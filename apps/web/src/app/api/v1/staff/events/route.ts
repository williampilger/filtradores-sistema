/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET eventos que o staff pode operar (de ontem em diante; respeita EventStaff)
 */
import { prisma } from '@filt/db';
import { eventCounters } from '@filt/core';
import type { StaffEventDTO } from '@filt/shared';
import { canOnEvent, route } from '@/lib/authenticate';

export const GET = route({ perm: ['checkin.validate', 'events.read', 'tickets.sell_manual'] }, async ({ auth }) => {
    const rows = await prisma.event.findMany({
        where: { deletedAt: null, status: { in: ['PUBLISHED', 'CLOSED'] }, startsAt: { gte: new Date(Date.now() - 36 * 3_600_000) } },
        orderBy: { startsAt: 'asc' }, take: 30,
    });
    const allowed = rows.filter(e => canOnEvent(auth, e.id, 'checkin.validate') || canOnEvent(auth, e.id, 'events.read') || canOnEvent(auth, e.id, 'tickets.sell_manual'));
    return Promise.all(allowed.map(async (e): Promise<StaffEventDTO> => ({
        id: e.id, slug: e.slug, title: e.title, startsAt: e.startsAt.toISOString(), venue: e.venue, status: e.status, counters: await eventCounters(e.id),
    })));
});
