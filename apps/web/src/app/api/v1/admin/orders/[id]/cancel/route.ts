/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST cancela pedido PENDENTE (devolve reservas). Pedido pago: use o estorno.
 */
import { cancelPendingOrder } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'orders.manage' }, async ({ params, auth }) => {
    await cancelPendingOrder(idParam(params.id), auth.user.id);
    return { ok: true };
});
