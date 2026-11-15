/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 POST envia link de redefinição (resposta sempre igual)
 */
import { z } from 'zod';
import { zodSchema_email } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { forgotPassword } from '@/server/users';

export const POST = route({ auth: 'none' }, async ({ req }) => {
    const b = z.object({ email: zodSchema_email }).parse(await req.json());
    await forgotPassword(req, b.email);
    return { msg: '261115240002 - Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.' };
});
