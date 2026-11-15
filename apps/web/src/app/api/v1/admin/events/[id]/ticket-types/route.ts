/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST cria lote de ingresso
 */
import { prisma } from '@filt/db';
import { audit } from '@filt/core';
import { zodSchema_ticketType } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'events.write' }, async ({ req, params, auth }) => {
    const b = zodSchema_ticketType.parse(await req.json());
    const t = await prisma.ticketType.create({ data: { ...b, eventId: idParam(params.id), description: b.description ?? null } });
    await audit({ userId: auth.user.id, action: 'ticket_type.create', entity: 'ticket_type', entityId: t.id, data: b });
    return { id: t.id };
});
