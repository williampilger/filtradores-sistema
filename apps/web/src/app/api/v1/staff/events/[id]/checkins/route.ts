/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET últimas leituras do evento (log da portaria)
 */
import { prisma } from '@filt/db';
import { LABELS } from '@filt/shared';
import { assertEventAccess, route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: ['checkin.reports', 'checkin.validate'] }, async ({ params, auth }) => {
    const eventId = idParam(params.id);
    assertEventAccess(auth, eventId, 'checkin.validate');
    const rows = await prisma.checkIn.findMany({
        where: { eventId }, orderBy: { id: 'desc' }, take: 200,
        include: { Ticket: { select: { holderName: true } }, Membership: { select: { User: { select: { name: true } } } }, Operator: { select: { name: true } } },
    });
    return rows.map(c => ({
        id: c.id.toString(), result: c.result, label: LABELS.checkInResult[c.result], createdAt: c.createdAt, operator: c.Operator.name,
        name: c.Ticket?.holderName ?? c.Membership?.User.name ?? null, kind: c.ticketId ? 'ticket' : c.membershipId ? 'member' : null, deviceId: c.deviceId,
    }));
});
