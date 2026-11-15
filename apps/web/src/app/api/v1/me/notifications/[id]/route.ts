/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST marca uma notificação como lida
 */
import { prisma } from '@filt/db';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({}, async ({ params, auth }) => {
    await prisma.notification.updateMany({ where: { id: idParam(params.id), userId: auth.user.id }, data: { readAt: new Date() } });
    return { ok: true };
});
