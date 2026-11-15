/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET papéis (com permissões e nº de usuários) | POST cria papel
 */
import { prisma } from '@filt/db';
import { audit } from '@filt/core';
import { zodSchema_role as zodRole } from '@/server/adminSchemas';
import { route } from '@/lib/authenticate';

export const GET = route({ perm: ['roles.manage', 'users.read'] }, async () => {
    const rows = await prisma.role.findMany({ include: { Permissions: true, _count: { select: { Users: true } } }, orderBy: { name: 'asc' } });
    return rows.map(r => ({ id: r.id, key: r.key, name: r.name, description: r.description, require2fa: r.require2fa, permissions: r.Permissions.map(p => p.permission), users: r._count.Users }));
});

export const POST = route({ perm: 'roles.manage' }, async ({ req, auth }) => {
    const b = zodRole.parse(await req.json());
    const r = await prisma.role.create({ data: { name: b.name, description: b.description ?? null, require2fa: b.require2fa, Permissions: { create: b.permissions.map(permission => ({ permission })) } } });
    await audit({ userId: auth.user.id, action: 'role.create', entity: 'role', entityId: r.id, data: b });
    return { id: r.id };
});
