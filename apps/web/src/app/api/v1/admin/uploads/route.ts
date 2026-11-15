/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST upload genérico de imagem pública (?folder=posts|products|events|players) -> { key, url }
 */
import { InputError } from '@filt/core';
import { StorageSystem } from '@filt/integrations/storage';
import { can, route } from '@/lib/authenticate';
import { qp } from '@/lib/http';
import { uploadImage } from '@/lib/upload';
import type { Permission } from '@filt/shared';

const FOLDERS: Record<string, Permission> = { posts: 'feed.write', products: 'products.write', events: 'events.write', players: 'squad.write' };

export const POST = route({ perm: ['feed.write', 'products.write', 'events.write', 'squad.write'] }, async ({ req, auth }) => {
    const folder = qp(req, 'folder') ?? '';
    if (!FOLDERS[folder] || !can(auth, FOLDERS[folder])) throw new InputError('Pasta inválida', 261115280009);
    const key = await uploadImage(req, `public/${folder}`);
    return { key, url: StorageSystem.url(key) };
});
