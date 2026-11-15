/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET elenco completo (inclusive inativos) | POST cadastra jogador/comissão
 */
import { prisma } from '@filt/db';
import { audit, toPlayerDTO } from '@filt/core';
import { zodSchema_player } from '@filt/shared';
import { route } from '@/lib/authenticate';

export const GET = route({ perm: ['squad.write', 'lineups.write'] }, async () => {
    const rows = await prisma.player.findMany({ orderBy: [{ active: 'desc' }, { position: 'asc' }, { number: 'asc' }] });
    return rows.map(toPlayerDTO);
});

export const POST = route({ perm: 'squad.write' }, async ({ req, auth }) => {
    const b = zodSchema_player.parse(await req.json());
    const p = await prisma.player.create({ data: b });
    await audit({ userId: auth.user.id, action: 'player.create', entity: 'player', entityId: p.id });
    return toPlayerDTO(p);
});
