/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST pagar cobrança de sócio -> pedido
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { orderForCharge, ORDER_INCLUDE, toOrderDTO } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({}, async ({ req, params, auth }) => {
    const b = z.object({ channel: z.enum(['WEB', 'APP']).default('WEB') }).parse(await req.json().catch(() => ({})));
    const order = await orderForCharge(idParam(params.id), auth.user.id, b.channel);
    return toOrderDTO(await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE }));
});
