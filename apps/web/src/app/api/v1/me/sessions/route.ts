/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 GET sessões ativas (aparelhos conectados)
 */
import { prisma } from '@filt/db';
import { route } from '@/lib/authenticate';

export const GET = route({}, async ({ auth }) => {
    const rows = await prisma.userSession.findMany({ where: { userId: auth.user.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: 'desc' } });
    return rows.map(s => ({ id: s.id, client: s.client, ip: s.ip, userAgent: s.userAgent, lastSeenAt: s.lastSeenAt, createdAt: s.createdAt, current: s.id === auth.sessionId }));
});
