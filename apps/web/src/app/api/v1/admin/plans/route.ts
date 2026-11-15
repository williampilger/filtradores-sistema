/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET planos (inclusive inativos, com nº de sócios) | POST cria plano
 */
import { prisma } from '@filt/db';
import { audit, toPlanDTO } from '@filt/core';
import { zodSchema_plan } from '@filt/shared';
import { route } from '@/lib/authenticate';

export const GET = route({ perm: ['plans.manage', 'members.read', 'events.write'] }, async () => {
    const rows = await prisma.membershipPlan.findMany({ where: { deletedAt: null }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], include: { _count: { select: { Memberships: { where: { status: { in: ['ACTIVE', 'OVERDUE'] } } } } } } });
    return rows.map(p => ({ ...toPlanDTO(p), activeMembers: p._count.Memberships }));
});

export const POST = route({ perm: 'plans.manage' }, async ({ req, auth }) => {
    const b = zodSchema_plan.parse(await req.json());
    const p = await prisma.membershipPlan.create({ data: { ...b, description: b.description ?? null, color: b.color ?? null } });
    await audit({ userId: auth.user.id, action: 'plan.create', entity: 'plan', entityId: p.id, data: b });
    return toPlanDTO(p);
});
