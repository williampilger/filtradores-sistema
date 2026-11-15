/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST desativa o 2FA de outro usuário (celular perdido). Master: só por script no servidor.
 */
import { ForbiddenError } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';
import { disableTotp, getUserOr404 } from '@/server/users';

export const POST = route<{ id: string }>({ perm: 'roles.manage' }, async ({ params, auth }) => {
    const u = await getUserOr404(idParam(params.id));
    if (u.isMaster) throw new ForbiddenError('O 2FA do master só pode ser redefinido no servidor (ver docs/permissoes.md)', 261115280006);
    await disableTotp(auth, '', u.id);
    return { msg: '261115280007 - 2FA desativado e sessões encerradas. O usuário deverá cadastrar novamente se o papel exigir.' };
});
