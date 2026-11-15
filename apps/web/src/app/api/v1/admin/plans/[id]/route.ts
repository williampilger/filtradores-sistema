/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 PATCH altera plano (vale para as PRÓXIMAS cobranças) | DELETE desativa (soft delete)
 */
import { prisma } from '@filt/db';
import { audit, toPlanDTO } from '@filt/core';
import { zodSchema_plan } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const PATCH = route<{ id: string }>({ perm: 'plans.manage' }, async ({ req, params, auth }) => {
    const b = zodSchema_plan.partial().parse(await req.json());
    const p = await prisma.membershipPlan.update({ where: { id: idParam(params.id) }, data: b });
    await audit({ userId: auth.user.id, action: 'plan.update', entity: 'plan', entityId: p.id, data: b });
    return toPlanDTO(p);
});

export const DELETE = route<{ id: string }>({ perm: 'plans.manage' }, async ({ params, auth }) => {
    const id = idParam(params.id);
    await prisma.membershipPlan.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    await audit({ userId: auth.user.id, action: 'plan.delete', entity: 'plan', entityId: id });
    return { ok: true };
});
