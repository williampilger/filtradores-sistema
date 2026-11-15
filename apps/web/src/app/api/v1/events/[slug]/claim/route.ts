/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST sócio (plano CLAIM) resgata o ingresso do jogo
 */
import { prisma } from '@filt/db';
import { claimMemberTicket, NotFoundError, toTicketDTO } from '@filt/core';
import { route } from '@/lib/authenticate';

export const POST = route<{ slug: string }>({}, async ({ params, auth }) => {
    const ev = await prisma.event.findUnique({ where: { slug: params.slug } });
    if (!ev) throw new NotFoundError('Evento não encontrado', 261115260001);
    const t = await claimMemberTicket(auth.user.id, ev.id);
    return toTicketDTO(await prisma.ticket.findUniqueOrThrow({ where: { id: t.id }, include: { Event: true, TicketType: true } }));
});
