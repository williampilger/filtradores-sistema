/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET todos os eventos (inclusive rascunhos) | POST cria evento
 */
import { prisma } from '@filt/db';
import { audit } from '@filt/core';
import { zodSchema_event } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { qp } from '@/lib/http';

export const GET = route({ perm: ['events.read', 'events.write', 'lineups.write'] }, async ({ req }) => {
    const past = qp(req, 'past') === '1';
    const rows = await prisma.event.findMany({
        where: { deletedAt: null, startsAt: past ? { lt: new Date() } : { gte: new Date(Date.now() - 2 * 86_400_000) } },
        orderBy: { startsAt: past ? 'desc' : 'asc' }, take: 200,
        include: { _count: { select: { Tickets: { where: { status: { in: ['VALID', 'USED'] } } }, MemberEntries: true } }, Lineup: { select: { publishedAt: true } } },
    });
    return rows.map(e => ({
        id: e.id, slug: e.slug, title: e.title, opponent: e.opponent, startsAt: e.startsAt, venue: e.venue, status: e.status, capacity: e.capacity,
        tickets: e._count.Tickets, memberEntries: e._count.MemberEntries, lineupPublished: !!e.Lineup?.publishedAt,
    }));
});

export const POST = route({ perm: 'events.write' }, async ({ req, auth }) => {
    const { eligiblePlanIds, ...b } = zodSchema_event.parse(await req.json());
    const e = await prisma.event.create({ data: { ...b, EligiblePlans: { create: eligiblePlanIds.map(planId => ({ planId })) } } });
    await audit({ userId: auth.user.id, action: 'event.create', entity: 'event', entityId: e.id });
    return { id: e.id };
});
