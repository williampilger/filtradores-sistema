/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET produtos (inclusive inativos) | POST cria produto (com variações opcionais)
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { audit, toProductListItem } from '@filt/core';
import { zodSchema_product, zodSchema_variant } from '@filt/shared';
import { route } from '@/lib/authenticate';

export const GET = route({ perm: ['products.write', 'orders.read', 'waitlist.manage', 'stock.adjust'] }, async () => {
    const rows = await prisma.product.findMany({
        where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }],
        include: { Variants: true, _count: { select: { WaitlistEntries: { where: { status: { in: ['WAITING', 'NOTIFIED'] } } } } } },
    });
    return rows.map(p => ({
        ...toProductListItem(p), active: p.active, stock: p.Variants.reduce((s, v) => s + v.stock, 0), reserved: p.Variants.reduce((s, v) => s + v.reserved, 0),
        waitlist: p._count.WaitlistEntries, waitlistPayment: p.waitlistPayment,
    }));
});

export const POST = route({ perm: 'products.write' }, async ({ req, auth }) => {
    const b = zodSchema_product.extend({ variants: z.array(zodSchema_variant).default([]) }).parse(await req.json());
    const { variants, ...data } = b;
    const p = await prisma.product.create({
        data: { ...data, description: data.description ?? null, category: data.category ?? null, Variants: { create: (variants.length ? variants : [{ name: 'Único', active: true, sortOrder: 0 }]).map(v => ({ ...v, sku: (v as { sku?: string | null }).sku ?? null, priceCents: (v as { priceCents?: number | null }).priceCents ?? null })) } },
    });
    await audit({ userId: auth.user.id, action: 'product.create', entity: 'product', entityId: p.id });
    return { id: p.id };
});
