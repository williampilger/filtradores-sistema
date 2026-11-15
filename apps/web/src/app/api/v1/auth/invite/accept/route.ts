/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 POST aceita convite (define a senha)
 */
import { z } from 'zod';
import { zodSchema_password } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { setPasswordWithToken } from '@/server/users';

export const POST = route({ auth: 'none' }, async ({ req }) => {
    const b = z.object({ token: z.string().min(10), password: zodSchema_password }).parse(await req.json());
    await setPasswordWithToken(b.token, b.password, 'INVITE');
    return { msg: '261115240004 - Senha definida. Faça login.' };
});
