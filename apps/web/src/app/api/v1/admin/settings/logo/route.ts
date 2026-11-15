/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST logo do clube
 */
import { prisma } from '@filt/db';
import { StorageSystem } from '@filt/integrations/storage';
import { route } from '@/lib/authenticate';
import { uploadImage } from '@/lib/upload';

export const POST = route({ perm: 'settings.manage' }, async ({ req }) => {
    const key = await uploadImage(req, 'public/club', 600);
    await prisma.clubSettings.update({ where: { id: 1 }, data: { logoKey: key } });
    return { logoUrl: StorageSystem.url(key), key };
});
