/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST valida o 2FA do login (TOTP ou código de recuperação)
 */
import { zodSchema_mfaVerify } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { verifyMfa } from '@/server/users';

export const POST = route({ allowMfaPending: true }, async ({ req, auth }) => {
    const b = zodSchema_mfaVerify.parse(await req.json());
    await verifyMfa(req, auth, b.code);
    return { ok: true };
});
