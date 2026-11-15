/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST registra pagamento manual de um pedido pendente (dinheiro, PIX direto, transferência)
 */
import { z } from 'zod';
import { startPayment, toPaymentDTO } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'payments.manual' }, async ({ req, params, auth }) => {
    const b = z.object({ method: z.enum(['CASH', 'MANUAL']), note: z.string().max(255).optional() }).parse(await req.json());
    return toPaymentDTO(await startPayment(idParam(params.id), b.method, { registeredById: auth.user.id, registeredByName: auth.user.name, note: b.note }));
});
