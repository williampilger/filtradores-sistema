/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST cancela uma cobrança em aberto
 */
import { prisma } from '@filt/db';
import { audit, InconsistencyError } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'memberships.charges' }, async ({ params, auth }) => {
    const id = idParam(params.id);
    const r = await prisma.membershipCharge.updateMany({ where: { id, status: { in: ['OPEN', 'OVERDUE'] } }, data: { status: 'CANCELED' } });
    if (!r.count) throw new InconsistencyError('Somente cobranças em aberto podem ser canceladas', 261115290005);
    await audit({ userId: auth.user.id, action: 'membership.charge_cancel', entity: 'charge', entityId: id });
    return { ok: true };
});
