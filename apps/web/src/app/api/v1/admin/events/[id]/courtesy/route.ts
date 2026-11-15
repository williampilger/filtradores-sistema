/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST emite cortesias (motivo obrigatório; vai para a auditoria)
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { issueCourtesy } from '@filt/core';
import { zodSchema_cpf, zodSchema_email } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'tickets.courtesy' }, async ({ req, params, auth }) => {
    const b = z.object({
        ticketTypeId: z.number().int().nullable().optional(), reason: z.string().trim().min(3).max(255),
        holders: z.array(z.object({ name: z.string().trim().min(2).max(160), email: zodSchema_email.optional(), cpf: zodSchema_cpf.optional() })).min(1).max(100),
        /** vincula os ingressos à conta de um usuário (aparecem no app dele) */
        userEmail: zodSchema_email.optional(),
    }).parse(await req.json());
    const user = b.userEmail ? await prisma.user.findUnique({ where: { email: b.userEmail } }) : null;
    const order = await issueCourtesy({ eventId: idParam(params.id), ticketTypeId: b.ticketTypeId, holders: b.holders, reason: b.reason, byUserId: auth.user.id, byUserName: auth.user.name, userId: user?.id ?? null });
    return { orderCode: order.code };
});
