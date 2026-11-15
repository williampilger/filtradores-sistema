/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST invalida o QR atual da carteirinha (celular perdido / compartilhamento)
 */
import { rotateMemberCard } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'members.write' }, async ({ params, auth }) => {
    await rotateMemberCard(idParam(params.id), auth.user.id);
    return { msg: '261115290002 - Carteirinha reemitida. O sócio precisa abrir o app conectado para atualizar.' };
});
