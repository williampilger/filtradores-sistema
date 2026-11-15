/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET/PUT equipe do evento (restringe validadores/organizadores a eventos específicos)
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { audit } from '@filt/core';
import { invalidateUserAuth, route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: 'events.write' }, async ({ params }) => {
    const rows = await prisma.eventStaff.findMany({ where: { eventId: idParam(params.id) }, include: { User: { select: { id: true, name: true, email: true } } } });
    return rows.map(r => r.User);
});

export const PUT = route<{ id: string }>({ perm: 'events.write' }, async ({ req, params, auth }) => {
    const eventId = idParam(params.id);
    const b = z.object({ userIds: z.array(z.number().int()) }).parse(await req.json());
    const before = await prisma.eventStaff.findMany({ where: { eventId }, select: { userId: true } });
    await prisma.$transaction([
        prisma.eventStaff.deleteMany({ where: { eventId } }),
        prisma.eventStaff.createMany({ data: b.userIds.map(userId => ({ eventId, userId })) }),
    ]);
    for (const id of new Set([...before.map(x => x.userId), ...b.userIds])) await invalidateUserAuth(id);
    await audit({ userId: auth.user.id, action: 'event.staff', entity: 'event', entityId: eventId, data: b });
    return { ok: true };
});
