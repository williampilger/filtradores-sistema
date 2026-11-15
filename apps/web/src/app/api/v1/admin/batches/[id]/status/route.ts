/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST avança o lote (fechar, produzir, pronto, entregue, cancelar) - notifica os compradores
 */
import { z } from 'zod';
import { setBatchStatus } from '@filt/core';
import { PRODUCTION_BATCH_STATUS } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'waitlist.manage' }, async ({ req, params, auth }) => {
    const b = z.object({ status: z.enum(PRODUCTION_BATCH_STATUS) }).parse(await req.json());
    await setBatchStatus(idParam(params.id), b.status, auth.user.id);
    return { ok: true };
});
