/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 GET feed do time (posts bloqueados aparecem com teaser + locked=true)
 */
import { route } from '@/lib/authenticate';
import { paging } from '@/lib/http';
import { feed } from '@/server/catalog';

export const GET = route({ auth: 'optional' }, async ({ req, auth }) => {
    const { page, pageSize } = paging(req, 50);
    return feed(auth, page, pageSize);
});
