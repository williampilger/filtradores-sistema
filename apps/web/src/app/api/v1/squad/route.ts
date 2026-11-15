/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 GET elenco ativo
 */
import { route } from '@/lib/authenticate';
import { squad } from '@/server/catalog';

export const GET = route({ auth: 'none' }, async () => squad());
