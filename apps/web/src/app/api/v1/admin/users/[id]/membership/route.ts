/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 PUT cadastra/ajusta o vínculo de sócio manualmente (sócios antigos, pagamento fora do sistema)
 */
import { z } from 'zod';
import { adminSetMembership } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const PUT = route<{ id: string }>({ perm: 'members.write' }, async ({ req, params, auth }) => {
    const b = z.object({ planId: z.number().int(), status: z.enum(['ACTIVE', 'PENDING']), currentPeriodEnd: z.coerce.date().nullable() }).parse(await req.json());
    const m = await adminSetMembership({ userId: idParam(params.id), ...b, byUserId: auth.user.id });
    return { id: m.id };
});
