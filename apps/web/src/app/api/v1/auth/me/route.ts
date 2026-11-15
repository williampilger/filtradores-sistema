/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 GET sessão atual (usuário, permissões efetivas, situação de sócio, flags de 2FA)
 */
import { route } from '@/lib/authenticate';
import { sessionInfo } from '@/server/users';

export const GET = route({ allowMfaPending: true }, async ({ auth }) => sessionInfo(auth));
