/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST gera cobrança avulsa para o sócio
 */
import { z } from 'zod';
import { createCharge } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'memberships.charges' }, async ({ req, params, auth }) => {
    const b = z.object({ amountCents: z.number().int().min(0).optional(), dueDate: z.coerce.date().optional() }).parse(await req.json().catch(() => ({})));
    const c = await createCharge(idParam(params.id), { ...b, byUserId: auth.user.id });
    return { id: c.id };
});
