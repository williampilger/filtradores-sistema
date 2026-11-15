/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 PATCH | DELETE post
 */
import { prisma } from '@filt/db';
import { audit } from '@filt/core';
import { zodSchema_post } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const PATCH = route<{ id: string }>({ perm: 'feed.write' }, async ({ req, params, auth }) => {
    const id = idParam(params.id);
    const { published, ...b } = zodSchema_post.partial().parse(await req.json());
    const cur = await prisma.post.findUniqueOrThrow({ where: { id } });
    await prisma.post.update({
        where: { id },
        data: { ...b, ...(b.visibility && b.visibility !== 'MIN_TIER' ? { minTierLevel: null } : {}), ...(published === undefined ? {} : { publishedAt: published ? (cur.publishedAt ?? new Date()) : null }) },
    });
    await audit({ userId: auth.user.id, action: 'post.update', entity: 'post', entityId: id });
    return { ok: true };
});

export const DELETE = route<{ id: string }>({ perm: 'feed.write' }, async ({ params, auth }) => {
    const id = idParam(params.id);
    await prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({ userId: auth.user.id, action: 'post.delete', entity: 'post', entityId: id });
    return { ok: true };
});
