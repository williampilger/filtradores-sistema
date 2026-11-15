/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 GET ingressos do usuário (?scope=upcoming|all)
 */
import { prisma } from '@filt/db';
import { toTicketDTO } from '@filt/core';
import { route } from '@/lib/authenticate';
import { qp } from '@/lib/http';

export const GET = route({}, async ({ req, auth }) => {
    const all = qp(req, 'scope') === 'all';
    const rows = await prisma.ticket.findMany({
        where: { userId: auth.user.id, ...(all ? {} : { status: { in: ['VALID', 'USED'] }, Event: { startsAt: { gte: new Date(Date.now() - 12 * 3_600_000) } } }) },
        include: { Event: true, TicketType: true }, orderBy: { Event: { startsAt: all ? 'desc' : 'asc' } }, take: 200,
    });
    return rows.map(toTicketDTO);
});
