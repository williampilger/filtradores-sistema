/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 DELETE remove alguém da lista de espera (devolve a reserva e chama o próximo)
 */
import { cancelWaitlistEntry } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const DELETE = route<{ id: string }>({ perm: 'waitlist.manage' }, async ({ params, auth }) => {
    await cancelWaitlistEntry(idParam(params.id), auth.user.id, true);
    return { ok: true };
});
