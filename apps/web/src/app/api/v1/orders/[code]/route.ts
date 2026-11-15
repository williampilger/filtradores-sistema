/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓/🔐 GET pedido pelo código (dono, staff com orders.read, ou pedido avulso sem conta - cortesia/portaria)
 */
import { prisma } from '@filt/db';
import { NotFoundError, ORDER_INCLUDE, toOrderDTO } from '@filt/core';
import { can, route } from '@/lib/authenticate';

export const GET = route<{ code: string }>({ auth: 'optional' }, async ({ params, auth }) => {
    const o = await prisma.order.findUnique({ where: { code: params.code.toUpperCase() }, include: ORDER_INCLUDE });
    if (!o) throw new NotFoundError('Pedido não encontrado', 261115260005);
    const owner = auth && o.userId === auth.user.id;
    if (o.userId && !owner && !can(auth, 'orders.read')) throw new NotFoundError('Pedido não encontrado', 261115260005);
    return toOrderDTO(o);
});
