/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST foto do jogador
 */
import { prisma } from '@filt/db';
import { StorageSystem } from '@filt/integrations/storage';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';
import { uploadImage } from '@/lib/upload';

export const POST = route<{ id: string }>({ perm: 'squad.write' }, async ({ req, params }) => {
    const key = await uploadImage(req, 'public/players', 800);
    await prisma.player.update({ where: { id: idParam(params.id) }, data: { photoKey: key } });
    return { photoUrl: StorageSystem.url(key) };
});
