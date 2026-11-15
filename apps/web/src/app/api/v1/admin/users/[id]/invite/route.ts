/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST reenvia o convite (ou link de redefinição de senha) - o link também volta na resposta
 */
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';
import { getUserOr404, sendTokenMail } from '@/server/users';

export const POST = route<{ id: string }>({ perm: 'users.write' }, async ({ params }) => {
    const u = await getUserOr404(idParam(params.id));
    const url = await sendTokenMail(u.id, u.passwordHash ? 'PASSWORD_RESET' : 'INVITE');
    return { url };
});
