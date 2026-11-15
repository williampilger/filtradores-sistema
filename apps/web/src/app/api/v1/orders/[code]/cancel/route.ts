/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST cliente cancela o próprio pedido pendente (libera a reserva)
 */
import { prisma } from '@filt/db';
import { cancelPendingOrder, NotFoundError } from '@filt/core';
import { route } from '@/lib/authenticate';

export const POST = route<{ code: string }>({}, async ({ params, auth }) => {
    const o = await prisma.order.findUnique({ where: { code: params.code.toUpperCase() } });
    if (!o || o.userId !== auth.user.id) throw new NotFoundError('Pedido não encontrado', 261115260007);
    await cancelPendingOrder(o.id, auth.user.id);
    return { ok: true };
});
