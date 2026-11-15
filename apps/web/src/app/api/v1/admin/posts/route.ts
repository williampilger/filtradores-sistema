/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET posts (inclusive rascunhos) | POST cria post
 */
import { prisma } from '@filt/db';
import { audit, toPostDTO } from '@filt/core';
import { zodSchema_post } from '@filt/shared';
import { route } from '@/lib/authenticate';

const include = { Author: { select: { name: true } }, Event: { select: { id: true, slug: true, title: true } } } as const;

export const GET = route({ perm: 'feed.write' }, async () => {
    const rows = await prisma.post.findMany({ where: { deletedAt: null }, include, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }], take: 200 });
    return rows.map(p => ({ ...toPostDTO(p, true), imageKeys: p.imageKeys ?? [], published: !!p.publishedAt }));
});

export const POST = route({ perm: 'feed.write' }, async ({ req, auth }) => {
    const { published, ...b } = zodSchema_post.parse(await req.json());
    const p = await prisma.post.create({ data: { ...b, eventId: b.eventId ?? null, minTierLevel: b.visibility === 'MIN_TIER' ? (b.minTierLevel ?? 1) : null, publishedAt: published ? new Date() : null, authorId: auth.user.id } });
    await audit({ userId: auth.user.id, action: 'post.create', entity: 'post', entityId: p.id });
    return { id: p.id };
});
