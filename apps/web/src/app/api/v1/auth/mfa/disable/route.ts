/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST desativa o próprio 2FA (exige código; master não pode)
 */
import { zodSchema_totp } from '@filt/shared';
import { z } from 'zod';
import { route } from '@/lib/authenticate';
import { disableTotp } from '@/server/users';

export const POST = route({}, async ({ req, auth }) => {
    const b = z.object({ code: zodSchema_totp }).parse(await req.json());
    await disableTotp(auth, b.code);
    return { ok: true };
});
