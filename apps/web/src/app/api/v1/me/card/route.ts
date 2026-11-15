/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 GET carteirinha (inclui a chave do QR rotativo - só para o próprio sócio)
 */
import { memberCard, NotFoundError } from '@filt/core';
import { route } from '@/lib/authenticate';

export const GET = route({}, async ({ auth }) => {
    const card = await memberCard(auth.user.id);
    if (!card) throw new NotFoundError('Você ainda não é sócio ativo', 261115250004);
    return card;
});
