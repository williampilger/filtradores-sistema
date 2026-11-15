/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST entrada/ajuste de estoque (entrada positiva chama a lista de espera automaticamente) | GET movimentações
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { adjustStock } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: ['stock.adjust', 'products.write'] }, async ({ params }) => {
    const rows = await prisma.stockMovement.findMany({ where: { variantId: idParam(params.id) }, orderBy: { id: 'desc' }, take: 200, include: { User: { select: { name: true } } } });
    return rows.map(r => ({ id: r.id, delta: r.delta, reason: r.reason, note: r.note, orderId: r.orderId, user: r.User?.name ?? null, createdAt: r.createdAt }));
});

export const POST = route<{ id: string }>({ perm: 'stock.adjust' }, async ({ req, params, auth }) => {
    const b = z.object({ delta: z.number().int().refine(v => v !== 0, 'Informe a quantidade'), reason: z.enum(['RESTOCK', 'ADJUST']), note: z.string().max(255).optional() }).parse(await req.json());
    await adjustStock(idParam(params.id), b.delta, b.reason, auth.user.id, b.note);
    return { ok: true };
});
