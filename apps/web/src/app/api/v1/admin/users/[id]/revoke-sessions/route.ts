/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST encerra todas as sessões do usuário
 */
import { audit } from '@filt/core';
import { invalidateUserAuth, route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';
import { getUserOr404 } from '@/server/users';

export const POST = route<{ id: string }>({ perm: 'users.write' }, async ({ params, auth }) => {
    const u = await getUserOr404(idParam(params.id));
    await invalidateUserAuth(u.id, { revoke: true });
    await audit({ userId: auth.user.id, action: 'user.revoke_sessions', entity: 'user', entityId: u.id });
    return { ok: true };
});
