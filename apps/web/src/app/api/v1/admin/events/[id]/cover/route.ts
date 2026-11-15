/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST capa do evento
 */
import { prisma } from '@filt/db';
import { StorageSystem } from '@filt/integrations/storage';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';
import { uploadImage } from '@/lib/upload';

export const POST = route<{ id: string }>({ perm: 'events.write' }, async ({ req, params }) => {
    const key = await uploadImage(req, 'public/events');
    await prisma.event.update({ where: { id: idParam(params.id) }, data: { coverKey: key } });
    return { coverUrl: StorageSystem.url(key) };
});
