/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 PATCH | DELETE (sem escalações: exclui; com escalações: desativa)
 */
import { prisma } from '@filt/db';
import { audit, toPlayerDTO } from '@filt/core';
import { zodSchema_player } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const PATCH = route<{ id: string }>({ perm: 'squad.write' }, async ({ req, params, auth }) => {
    const id = idParam(params.id);
    const p = await prisma.player.update({ where: { id }, data: zodSchema_player.partial().parse(await req.json()) });
    await audit({ userId: auth.user.id, action: 'player.update', entity: 'player', entityId: id });
    return toPlayerDTO(p);
});

export const DELETE = route<{ id: string }>({ perm: 'squad.write' }, async ({ params, auth }) => {
    const id = idParam(params.id);
    if (await prisma.lineupEntry.count({ where: { playerId: id } })) await prisma.player.update({ where: { id }, data: { active: false } });
    else await prisma.player.delete({ where: { id } });
    await audit({ userId: auth.user.id, action: 'player.delete', entity: 'player', entityId: id });
    return { ok: true };
});
