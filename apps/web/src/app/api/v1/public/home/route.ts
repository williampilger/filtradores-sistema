/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 GET dados da página inicial (clube, próximos jogos, planos, loja, feed)
 */
import { route } from '@/lib/authenticate';
import { publicHome } from '@/server/catalog';

export const GET = route({ auth: 'optional' }, async ({ auth }) => publicHome(auth));
