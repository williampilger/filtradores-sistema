/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET produto completo (variações com estoque) | PATCH | DELETE (soft)
 */
import { prisma } from '@filt/db';
import { audit, NotFoundError } from '@filt/core';
import { StorageSystem } from '@filt/integrations/storage';
import { zodSchema_product } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: ['products.write', 'stock.adjust', 'waitlist.manage', 'orders.read'] }, async ({ params }) => {
    const p = await prisma.product.findUnique({ where: { id: idParam(params.id) }, include: { Variants: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }, Batches: { orderBy: { id: 'desc' } } } });
    if (!p || p.deletedAt) throw new NotFoundError('Produto não encontrado', 261115310001);
    const keys = Array.isArray(p.imageKeys) ? (p.imageKeys as string[]) : [];
    const waiting = await prisma.waitlistEntry.groupBy({ by: ['variantId'], where: { productId: p.id, status: { in: ['WAITING', 'NOTIFIED'] } }, _sum: { quantity: true } });
    return {
        ...p, images: keys.map(k => ({ key: k, url: StorageSystem.url(k) })),
        variants: p.Variants.map(v => ({ ...v, available: v.stock - v.reserved, waitlistQty: waiting.find(w => w.variantId === v.id)?._sum.quantity ?? 0 })),
        batches: p.Batches,
    };
});

export const PATCH = route<{ id: string }>({ perm: 'products.write' }, async ({ req, params, auth }) => {
    const id = idParam(params.id);
    const b = zodSchema_product.partial().parse(await req.json());
    await prisma.product.update({ where: { id }, data: b });
    await audit({ userId: auth.user.id, action: 'product.update', entity: 'product', entityId: id, data: b });
    return { ok: true };
});

export const DELETE = route<{ id: string }>({ perm: 'products.write' }, async ({ params, auth }) => {
    const id = idParam(params.id);
    await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    await audit({ userId: auth.user.id, action: 'product.delete', entity: 'product', entityId: id });
    return { ok: true };
});
