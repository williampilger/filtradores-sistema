/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 GET detalhe do evento (lotes, benefício de sócio do usuário logado, escalação publicada)
 */
import { route } from '@/lib/authenticate';
import { eventDetail } from '@/server/catalog';

export const GET = route<{ slug: string }>({ auth: 'optional' }, async ({ params, auth }) => eventDetail(params.slug, auth));
