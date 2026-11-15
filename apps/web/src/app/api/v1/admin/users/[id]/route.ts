/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET detalhe | PATCH dados, status, papéis e permissões individuais
 *
 * ⚠️ Papéis/overrides exigem roles.manage. O master só é alterado por ele mesmo. Ninguém altera o próprio status/papéis.
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { audit, ForbiddenError, InconsistencyError } from '@filt/core';
import { PERMISSIONS, zodSchema_cpf, zodSchema_name, zodSchema_phone } from '@filt/shared';
import { StorageSystem } from '@filt/integrations/storage';
import { can, invalidateUserAuth, route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';
import { getUserOr404 } from '@/server/users';

export const GET = route<{ id: string }>({ perm: ['users.read', 'members.read'] }, async ({ params }) => {
    const u = await prisma.user.findUnique({
        where: { id: idParam(params.id) },
        include: { Roles: true, Overrides: true, EventStaff: { include: { Event: { select: { id: true, title: true, startsAt: true } } } }, Membership: { include: { Plan: true } } },
    });
    if (!u || u.deletedAt) return getUserOr404(-1);
    const sessions = await prisma.userSession.count({ where: { userId: u.id, revokedAt: null, expiresAt: { gt: new Date() } } });
    return {
        id: u.id, name: u.name, email: u.email, cpf: u.cpf, phone: u.phone, birthDate: u.birthDate, photoUrl: StorageSystem.url(u.photoKey),
        isMaster: u.isMaster, status: u.status, totpEnabled: !!u.totpEnabledAt, emailVerified: !!u.emailVerifiedAt, invitePending: !u.passwordHash,
        lastLoginAt: u.lastLoginAt, createdAt: u.createdAt, activeSessions: sessions,
        roleIds: u.Roles.map(r => r.roleId), overrides: u.Overrides.map(o => ({ permission: o.permission, effect: o.effect })),
        eventStaff: u.EventStaff.map(e => e.Event),
        membership: u.Membership ? { id: u.Membership.id, status: u.Membership.status, planId: u.Membership.planId, planName: u.Membership.Plan.name, memberNumber: u.Membership.memberNumber, currentPeriodEnd: u.Membership.currentPeriodEnd } : null,
    };
});

export const PATCH = route<{ id: string }>({ perm: ['users.write', 'roles.manage'] }, async ({ req, params, auth }) => {
    const id = idParam(params.id);
    const target = await getUserOr404(id);
    if (target.isMaster && !auth.user.isMaster) throw new ForbiddenError('Somente o master altera a própria conta', 261115280002);
    const b = z.object({
        name: zodSchema_name.optional(), cpf: zodSchema_cpf.nullable().optional(), phone: zodSchema_phone.nullable().optional(),
        status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
        roleIds: z.array(z.number().int()).optional(),
        overrides: z.array(z.object({ permission: z.enum(PERMISSIONS as [string, ...string[]]), effect: z.enum(['GRANT', 'DENY']) })).optional(),
    }).parse(await req.json());

    const touchesAccess = b.roleIds !== undefined || b.overrides !== undefined;
    if (touchesAccess && !can(auth, 'roles.manage')) throw new ForbiddenError('Sem permissão para alterar papéis/permissões', 261115280003);
    if ((b.name !== undefined || b.cpf !== undefined || b.phone !== undefined || b.status !== undefined) && !can(auth, 'users.write')) throw new ForbiddenError('Sem permissão para editar usuários', 261115280004);
    if (id === auth.user.id && (touchesAccess || b.status)) throw new InconsistencyError('Você não pode alterar seus próprios papéis ou status', 261115280005);

    await prisma.$transaction(async tx => {
        await tx.user.update({ where: { id }, data: { name: b.name, cpf: b.cpf, phone: b.phone, status: b.status } });
        if (b.roleIds) {
            await tx.userRole.deleteMany({ where: { userId: id } });
            if (b.roleIds.length) await tx.userRole.createMany({ data: b.roleIds.map(roleId => ({ userId: id, roleId })) });
        }
        if (b.overrides) {
            await tx.userPermissionOverride.deleteMany({ where: { userId: id } });
            if (b.overrides.length) await tx.userPermissionOverride.createMany({ data: b.overrides.map(o => ({ userId: id, permission: o.permission, effect: o.effect })) });
        }
    });
    await invalidateUserAuth(id, { revoke: b.status === 'BLOCKED' });
    await audit({ userId: auth.user.id, action: 'user.update', entity: 'user', entityId: id, data: b });
    return { ok: true };
});
