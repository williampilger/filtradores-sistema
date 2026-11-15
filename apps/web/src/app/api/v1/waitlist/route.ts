/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST entrar na lista de espera de uma variação
 */
import { z } from 'zod';
import { joinWaitlist } from '@filt/core';
import { route } from '@/lib/authenticate';

export const POST = route({}, async ({ req, auth }) => {
    const b = z.object({ variantId: z.number().int(), quantity: z.number().int().min(1).max(20).default(1), note: z.string().max(255).optional() }).parse(await req.json());
    const e = await joinWaitlist(auth.user.id, b.variantId, b.quantity, b.note);
    return { id: e.id, msg: '261115260002 - Você entrou na lista de espera. Avisaremos quando chegar a sua vez!' };
});
