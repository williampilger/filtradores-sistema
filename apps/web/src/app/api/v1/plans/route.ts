/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 GET planos de sócio ativos
 */
import { route } from '@/lib/authenticate';
import { listPlans } from '@/server/catalog';

export const GET = route({ auth: 'none' }, async () => listPlans());
