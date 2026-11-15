/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST estorno total/parcial (via gateway). Estorno total cancela ingressos e devolve itens não entregues.
 */
import { z } from 'zod';
import { refundPayment } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'payments.refund' }, async ({ req, params, auth }) => {
    const b = z.object({ amountCents: z.number().int().positive().optional(), reason: z.string().trim().min(3).max(255) }).parse(await req.json());
    await refundPayment(idParam(params.id), { ...b, byUserId: auth.user.id });
    return { msg: '261115320002 - Estorno registrado' };
});
