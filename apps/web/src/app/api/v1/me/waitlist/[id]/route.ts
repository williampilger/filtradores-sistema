/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 DELETE sair da lista de espera
 */
import { cancelWaitlistEntry } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const DELETE = route<{ id: string }>({}, async ({ params, auth }) => {
    await cancelWaitlistEntry(idParam(params.id), auth.user.id);
    return { ok: true };
});
