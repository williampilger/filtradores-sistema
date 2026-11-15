/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 PATCH altera papel (nome, 2FA obrigatório, permissões) | DELETE remove (sem usuários)
 */
import { prisma } from '@filt/db';
import { audit, InconsistencyError } from '@filt/core';
import { invalidateUserAuth, route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';
import { zodSchema_role as zodRole } from '@/server/adminSchemas';

export const PATCH = route<{ id: string }>({ perm: 'roles.manage' }, async ({ req, params, auth }) => {
    const id = idParam(params.id);
    const b = zodRole.parse(await req.json());
    await prisma.$transaction([
        prisma.role.update({ where: { id }, data: { name: b.name, description: b.description ?? null, require2fa: b.require2fa } }),
        prisma.rolePermission.deleteMany({ where: { roleId: id } }),
        prisma.rolePermission.createMany({ data: b.permissions.map(permission => ({ roleId: id, permission })) }),
    ]);
    const users = await prisma.userRole.findMany({ where: { roleId: id }, select: { userId: true } });
    for (const u of users) await invalidateUserAuth(u.userId);
    await audit({ userId: auth.user.id, action: 'role.update', entity: 'role', entityId: id, data: b });
    return { ok: true };
});

export const DELETE = route<{ id: string }>({ perm: 'roles.manage' }, async ({ params, auth }) => {
    const id = idParam(params.id);
    if (await prisma.userRole.count({ where: { roleId: id } })) throw new InconsistencyError('Remova o papel dos usuários antes de excluí-lo', 261115280008);
    await prisma.role.delete({ where: { id } });
    await audit({ userId: auth.user.id, action: 'role.delete', entity: 'role', entityId: id });
    return { ok: true };
});
