/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST cancela um ingresso válido (sem estorno financeiro - use o estorno do pagamento para devolver o valor)
 */
import { z } from 'zod';
import { cancelTicket } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'tickets.refund' }, async ({ req, params, auth }) => {
    const b = z.object({ reason: z.string().trim().min(3).max(255) }).parse(await req.json());
    await cancelTicket(idParam(params.id), auth.user.id, b.reason);
    return { ok: true };
});
