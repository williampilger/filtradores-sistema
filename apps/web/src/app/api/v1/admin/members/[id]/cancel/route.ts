/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST cancela o vínculo de sócio
 */
import { z } from 'zod';
import { cancelMembership } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'members.write' }, async ({ req, params, auth }) => {
    const b = z.object({ reason: z.string().trim().min(3).max(255) }).parse(await req.json());
    await cancelMembership(idParam(params.id), b.reason, auth.user.id);
    return { ok: true };
});
