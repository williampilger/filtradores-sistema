/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST confirma o cadastro do 2FA -> devolve os códigos de recuperação (exibidos UMA vez)
 */
import { zodSchema_totp } from '@filt/shared';
import { z } from 'zod';
import { route } from '@/lib/authenticate';
import { confirmTotpSetup } from '@/server/users';

export const POST = route({ allowMfaPending: true }, async ({ req, auth }) => {
    const b = z.object({ code: zodSchema_totp }).parse(await req.json());
    return confirmTotpSetup(auth, b.code);
});
