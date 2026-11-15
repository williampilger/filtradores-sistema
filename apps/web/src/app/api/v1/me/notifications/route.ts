/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 GET notificações | POST marca todas como lidas
 */
import { prisma } from '@filt/db';
import type { NotificationDTO } from '@filt/shared';
import { route } from '@/lib/authenticate';

export const GET = route({}, async ({ auth }) => {
    const rows = await prisma.notification.findMany({ where: { userId: auth.user.id }, orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map((n): NotificationDTO => ({ id: n.id, title: n.title, body: n.body, link: n.link, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() }));
});

export const POST = route({}, async ({ auth }) => {
    await prisma.notification.updateMany({ where: { userId: auth.user.id, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
});
