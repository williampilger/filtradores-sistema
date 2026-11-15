/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST adiciona imagem | DELETE ?key= remove | PUT { keys } reordena (a 1ª é a capa)
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { StorageSystem } from '@filt/integrations/storage';
import { route } from '@/lib/authenticate';
import { idParam, qp } from '@/lib/http';
import { uploadImage } from '@/lib/upload';

const keysOf = (j: unknown) => (Array.isArray(j) ? (j as string[]) : []);

export const POST = route<{ id: string }>({ perm: 'products.write' }, async ({ req, params }) => {
    const id = idParam(params.id);
    const key = await uploadImage(req, `public/products/${id}`);
    const p = await prisma.product.findUniqueOrThrow({ where: { id } });
    await prisma.product.update({ where: { id }, data: { imageKeys: [...keysOf(p.imageKeys), key].slice(0, 12) } });
    return { key, url: StorageSystem.url(key) };
});

export const DELETE = route<{ id: string }>({ perm: 'products.write' }, async ({ req, params }) => {
    const id = idParam(params.id);
    const key = qp(req, 'key') ?? '';
    const p = await prisma.product.findUniqueOrThrow({ where: { id } });
    await prisma.product.update({ where: { id }, data: { imageKeys: keysOf(p.imageKeys).filter(k => k !== key) } });
    if (key.startsWith(`public/products/${id}/`)) await StorageSystem.remove(key).catch(() => undefined);
    return { ok: true };
});

export const PUT = route<{ id: string }>({ perm: 'products.write' }, async ({ req, params }) => {
    const id = idParam(params.id);
    const b = z.object({ keys: z.array(z.string()) }).parse(await req.json());
    const p = await prisma.product.findUniqueOrThrow({ where: { id } });
    const current = keysOf(p.imageKeys);
    await prisma.product.update({ where: { id }, data: { imageKeys: b.keys.filter(k => current.includes(k)) } });
    return { ok: true };
});
