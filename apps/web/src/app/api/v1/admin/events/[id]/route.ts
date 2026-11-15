/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET evento completo | PATCH altera | DELETE remove (somente sem ingressos emitidos)
 */
import { prisma } from '@filt/db';
import { audit, eventCounters, InconsistencyError, NotFoundError } from '@filt/core';
import { StorageSystem } from '@filt/integrations/storage';
import { zodSchema_event } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: ['events.read', 'events.write', 'lineups.write'] }, async ({ params }) => {
    const e = await prisma.event.findUnique({ where: { id: idParam(params.id) }, include: { TicketTypes: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }, EligiblePlans: true } });
    if (!e || e.deletedAt) throw new NotFoundError('Evento não encontrado', 261115300001);
    return {
        ...e, coverUrl: StorageSystem.url(e.coverKey), eligiblePlanIds: e.EligiblePlans.map(p => p.planId), counters: await eventCounters(e.id),
        ticketTypes: e.TicketTypes.map(t => ({ ...t, available: t.quantity - t.calc_allocated })),
    };
});

export const PATCH = route<{ id: string }>({ perm: 'events.write' }, async ({ req, params, auth }) => {
    const id = idParam(params.id);
    const { eligiblePlanIds, ...b } = zodSchema_event.partial().parse(await req.json());
    await prisma.$transaction(async tx => {
        await tx.event.update({ where: { id }, data: b });
        if (eligiblePlanIds) {
            await tx.eventEligiblePlan.deleteMany({ where: { eventId: id } });
            if (eligiblePlanIds.length) await tx.eventEligiblePlan.createMany({ data: eligiblePlanIds.map(planId => ({ eventId: id, planId })) });
        }
    });
    await audit({ userId: auth.user.id, action: 'event.update', entity: 'event', entityId: id, data: b });
    return { ok: true };
});

export const DELETE = route<{ id: string }>({ perm: 'events.write' }, async ({ params, auth }) => {
    const id = idParam(params.id);
    if (await prisma.ticket.count({ where: { eventId: id } })) throw new InconsistencyError('Evento com ingressos emitidos: altere o status para Cancelado', 261115300002);
    await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ userId: auth.user.id, action: 'event.delete', entity: 'event', entityId: id });
    return { ok: true };
});
