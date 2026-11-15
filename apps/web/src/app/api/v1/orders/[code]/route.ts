/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓/🔐 GET pedido pelo código (dono, staff com orders.read, ou pedido avulso sem conta - cortesia/portaria)
 */
import { prisma } from '@filt/db';
import { demoTick, isDemoMode, NotFoundError, ORDER_INCLUDE, toOrderDTO } from '@filt/core';
import { can, route } from '@/lib/authenticate';

export const GET = route<{ code: string }>({ auth: 'optional' }, async ({ params, auth }) => {
    const o = await prisma.order.findUnique({ where: { code: params.code.toUpperCase() }, include: ORDER_INCLUDE });
    if (!o) throw new NotFoundError('Pedido não encontrado', 261115260005);
    const owner = auth && o.userId === auth.user.id;
    if (o.userId && !owner && !can(auth, 'orders.read')) throw new NotFoundError('Pedido não encontrado', 261115260005);
    // demonstração: aprova o PIX/boleto simulado após alguns segundos (o front consulta o pedido periodicamente)
    if (isDemoMode() && o.status === 'PENDING_PAYMENT' && o.Payments.some(p => p.gateway === 'demo' && p.status === 'PENDING')) {
        await demoTick(o.id);
        return toOrderDTO(await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: ORDER_INCLUDE }));
    }
    return toOrderDTO(o);
});
