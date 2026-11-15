/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST cria variação (estoque inicial via ajuste de estoque)
 */
import { prisma } from '@filt/db';
import { audit } from '@filt/core';
import { zodSchema_variant } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'products.write' }, async ({ req, params, auth }) => {
    const b = zodSchema_variant.parse(await req.json());
    const v = await prisma.productVariant.create({ data: { ...b, sku: b.sku ?? null, priceCents: b.priceCents ?? null, productId: idParam(params.id) } });
    await audit({ userId: auth.user.id, action: 'variant.create', entity: 'variant', entityId: v.id });
    return { id: v.id };
});
