/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 PATCH altera variação (nome, SKU, preço, ativo)
 */
import { prisma } from '@filt/db';
import { audit } from '@filt/core';
import { zodSchema_variant } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const PATCH = route<{ id: string }>({ perm: 'products.write' }, async ({ req, params, auth }) => {
    const id = idParam(params.id);
    const b = zodSchema_variant.partial().parse(await req.json());
    await prisma.productVariant.update({ where: { id }, data: b });
    await audit({ userId: auth.user.id, action: 'variant.update', entity: 'variant', entityId: id, data: b });
    return { ok: true };
});
