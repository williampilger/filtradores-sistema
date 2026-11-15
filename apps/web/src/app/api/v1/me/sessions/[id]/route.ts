/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 DELETE encerra uma sessão (outro aparelho)
 */
import { prisma } from '@filt/db';
import { cache } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const DELETE = route<{ id: string }>({}, async ({ params, auth }) => {
    const s = await prisma.userSession.findFirst({ where: { id: idParam(params.id), userId: auth.user.id } });
    if (s) {
        await prisma.userSession.update({ where: { id: s.id }, data: { revokedAt: new Date() } });
        await cache.del(`auth:${s.tokenHash}`);
    }
    return { ok: true };
});
