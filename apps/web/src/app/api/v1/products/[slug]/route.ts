/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 GET detalhe do produto (variações, preço de sócio, lote aberto, minha lista de espera)
 */
import { route } from '@/lib/authenticate';
import { productDetail } from '@/server/catalog';

export const GET = route<{ slug: string }>({ auth: 'optional' }, async ({ params, auth }) => productDetail(params.slug, auth));
