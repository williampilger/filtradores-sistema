/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST status de entrega/retirada de item da loja
 */
import { z } from 'zod';
import { setDeliveryStatus } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'orders.manage' }, async ({ req, params, auth }) => {
    const b = z.object({ status: z.enum(['PENDING', 'READY_FOR_PICKUP', 'DELIVERED']) }).parse(await req.json());
    await setDeliveryStatus(idParam(params.id), b.status, auth.user.id);
    return { ok: true };
});
