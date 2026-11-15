/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST foto de perfil (usada na conferência da carteirinha na portaria)
 */
import { prisma } from '@filt/db';
import { StorageSystem } from '@filt/integrations/storage';
import { route } from '@/lib/authenticate';
import { uploadImage } from '@/lib/upload';

export const POST = route({}, async ({ req, auth }) => {
    const key = await uploadImage(req, `users/${auth.user.id}`, 800);
    const old = await prisma.user.findUniqueOrThrow({ where: { id: auth.user.id }, select: { photoKey: true } });
    await prisma.user.update({ where: { id: auth.user.id }, data: { photoKey: key } });
    if (old.photoKey) await StorageSystem.remove(old.photoKey).catch(() => undefined);
    return { photoUrl: StorageSystem.url(key) };
});
