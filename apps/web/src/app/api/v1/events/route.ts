/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 GET eventos publicados (?past=1 para encerrados)
 */
import { route } from '@/lib/authenticate';
import { qp } from '@/lib/http';
import { listEvents } from '@/server/catalog';

export const GET = route({ auth: 'none' }, async ({ req }) => listEvents({ past: qp(req, 'past') === '1' }));
