/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST associar-se a um plano -> pedido (o front segue para o pagamento)
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { joinPlan, ORDER_INCLUDE, toOrderDTO } from '@filt/core';
import { route } from '@/lib/authenticate';

export const POST = route({}, async ({ req, auth }) => {
    const b = z.object({ planId: z.number().int(), channel: z.enum(['WEB', 'APP']).default('WEB') }).parse(await req.json());
    const order = await joinPlan(auth.user.id, b.planId, b.channel);
    return toOrderDTO(await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE }));
});
