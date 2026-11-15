/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 GET minhas entradas em listas de espera / encomendas
 */
import { prisma } from '@filt/db';
import { toWaitlistDTOs } from '@filt/core';
import { route } from '@/lib/authenticate';

export const GET = route({}, async ({ auth }) => {
    const rows = await prisma.waitlistEntry.findMany({ where: { userId: auth.user.id }, include: { Product: true, Variant: true, Batch: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return toWaitlistDTOs(rows);
});
