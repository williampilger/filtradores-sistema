/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST (re)inicia o pagamento de um pedido pendente no método escolhido
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { NotFoundError, startPayment, toPaymentDTO } from '@filt/core';
import { PUBLIC_PAYMENT_METHODS } from '@filt/shared';
import { route } from '@/lib/authenticate';

export const POST = route<{ code: string }>({}, async ({ req, params, auth }) => {
    const b = z.object({ method: z.enum(PUBLIC_PAYMENT_METHODS as [string, ...string[]]) }).parse(await req.json());
    const o = await prisma.order.findUnique({ where: { code: params.code.toUpperCase() } });
    if (!o || o.userId !== auth.user.id) throw new NotFoundError('Pedido não encontrado', 261115260006);
    return toPaymentDTO(await startPayment(o.id, b.method as never));
});
