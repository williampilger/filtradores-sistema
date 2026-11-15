/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST abre lote de produção (itens sob encomenda)
 */
import { z } from 'zod';
import { createBatch } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'waitlist.manage' }, async ({ req, params, auth }) => {
    const b = z.object({ name: z.string().trim().min(1).max(80), minQuantity: z.number().int().min(1).nullable().optional(), closesAt: z.coerce.date().nullable().optional(), notes: z.string().max(5000).nullable().optional() }).parse(await req.json());
    const batch = await createBatch({ productId: idParam(params.id), ...b, byUserId: auth.user.id });
    return { id: batch.id };
});
