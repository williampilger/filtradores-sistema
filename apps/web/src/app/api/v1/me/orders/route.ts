/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 GET histórico de pedidos do usuário
 */
import { prisma } from '@filt/db';
import { ORDER_INCLUDE, toOrderDTO } from '@filt/core';
import { route } from '@/lib/authenticate';

export const GET = route({}, async ({ auth }) => {
    const rows = await prisma.order.findMany({ where: { userId: auth.user.id }, include: ORDER_INCLUDE, orderBy: { createdAt: 'desc' }, take: 100 });
    return rows.map(toOrderDTO);
});
