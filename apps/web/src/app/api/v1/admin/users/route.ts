/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET usuários (?q=&roleId=&staff=1&page=) | POST cria usuário e envia convite
 */
import { z } from 'zod';
import { prisma, type Prisma } from '@filt/db';
import { ForbiddenError } from '@filt/core';
import { zodSchema_cpf, zodSchema_email, zodSchema_name, zodSchema_phone } from '@filt/shared';
import { can, route } from '@/lib/authenticate';
import { paging, qp } from '@/lib/http';
import { inviteUser } from '@/server/users';

export const GET = route({ perm: ['users.read', 'members.read'] }, async ({ req }) => {
    const { page, pageSize, skip, take } = paging(req);
    const q = qp(req, 'q');
    const roleId = Number(qp(req, 'roleId')) || undefined;
    // AND: a busca (q) e o filtro de equipe (staff) usam OR cada um; no mesmo objeto um sobrescreveria o outro
    const where: Prisma.UserWhereInput = {
        deletedAt: null,
        ...(roleId ? { Roles: { some: { roleId } } } : {}),
        AND: [
            ...(q ? [{ OR: [{ name: { contains: q } }, { email: { contains: q } }, { cpf: { contains: q.replace(/\D/g, '') || '§' } }] }] : []),
            ...(qp(req, 'staff') === '1' ? [{ OR: [{ isMaster: true }, { Roles: { some: {} } }] }] : []),
        ],
    };
    const [rows, total] = await Promise.all([
        prisma.user.findMany({ where, skip, take, orderBy: { name: 'asc' }, include: { Roles: { include: { Role: true } }, Membership: { include: { Plan: true } } } }),
        prisma.user.count({ where }),
    ]);
    return {
        page, pageSize, total,
        rows: rows.map(u => ({
            id: u.id, name: u.name, email: u.email, cpf: u.cpf, phone: u.phone, isMaster: u.isMaster, status: u.status, totpEnabled: !!u.totpEnabledAt,
            invitePending: !u.passwordHash, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt, roles: u.Roles.map(r => ({ id: r.roleId, name: r.Role.name })),
            membership: u.Membership ? { status: u.Membership.status, plan: u.Membership.Plan.name, memberNumber: u.Membership.memberNumber } : null,
        })),
    };
});

export const POST = route({ perm: 'users.write' }, async ({ req, auth }) => {
    const b = z.object({
        name: zodSchema_name, email: zodSchema_email, cpf: zodSchema_cpf.nullable().optional(), phone: zodSchema_phone.nullable().optional(),
        roleIds: z.array(z.number().int()).default([]),
    }).parse(await req.json());
    if (b.roleIds.length && !can(auth, 'roles.manage')) throw new ForbiddenError('Sem permissão para atribuir papéis', 261115280001);
    const r = await inviteUser(auth, b);
    return { id: r.user.id, inviteUrl: r.inviteUrl };
});
