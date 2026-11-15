/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST reenvia o e-mail de confirmação
 */
import { route } from '@/lib/authenticate';
import { sendTokenMail } from '@/server/users';

export const POST = route({}, async ({ auth }) => {
    await sendTokenMail(auth.user.id, 'EMAIL_CONFIRMATION');
    return { msg: '261115250005 - E-mail de confirmação reenviado' };
});
