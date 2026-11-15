/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 GET formas de pagamento disponíveis agora (gateways habilitados)
 */
import { availablePublicMethods } from '@filt/core';
import { route } from '@/lib/authenticate';

export const GET = route({ auth: 'none' }, async () => availablePublicMethods());
