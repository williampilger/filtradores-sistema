/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓/🔐 GET arquivos do storage
 *  - public/... : qualquer um (cache longo - as chaves são imutáveis)
 *  - users/<id>/... : o próprio usuário ou staff (validação de entrada / gestão de sócios)
 */
import { Readable } from 'node:stream';
import { NotFoundError } from '@filt/core';
import { StorageSystem, safeKey } from '@filt/integrations/storage';
import { can, route } from '@/lib/authenticate';

export const GET = route<{ key: string[] }>({ auth: 'optional' }, async ({ params, auth }) => {
    let key: string;
    try { key = safeKey(params.key.join('/')); } catch { throw new NotFoundError('Arquivo não encontrado', 261115260008); }
    if (!key.startsWith('public/')) {
        const m = key.match(/^users\/(\d+)\//);
        const allowed = m && auth && (Number(m[1]) === auth.user.id || can(auth, 'checkin.validate', 'members.read', 'users.read'));
        if (!allowed) throw new NotFoundError('Arquivo não encontrado', 261115260008);
    }
    if (!(await StorageSystem.exists(key))) throw new NotFoundError('Arquivo não encontrado', 261115260008);
    const stream = Readable.toWeb(StorageSystem.stream(key)) as ReadableStream;
    return new Response(stream, {
        headers: {
            'Content-Type': key.endsWith('.webp') ? 'image/webp' : 'application/octet-stream',
            'Cache-Control': key.startsWith('public/') ? 'public, max-age=31536000, immutable' : 'private, max-age=3600',
        },
    });
});
