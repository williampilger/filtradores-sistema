/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST troca de senha (encerra as outras sessões)
 */
import { zodSchema_changePassword } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { changePassword } from '@/server/users';

export const POST = route({}, async ({ req, auth }) => {
    const b = zodSchema_changePassword.parse(await req.json());
    await changePassword(auth, b.currentPassword, b.newPassword);
    return { msg: '261115250002 - Senha alterada' };
});
