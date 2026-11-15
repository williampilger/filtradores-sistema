/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST inicia o cadastro do 2FA (QR para o app autenticador)
 */
import { route } from '@/lib/authenticate';
import { startTotpSetup } from '@/server/users';

export const POST = route({ allowMfaPending: true }, async ({ auth }) => {
    if (auth.mfaPending) return { msg: '261115240001 - Valide o código atual antes' };
    return startTotpSetup(auth);
});
