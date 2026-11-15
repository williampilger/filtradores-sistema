/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET auditoria (?action=&userId=&entity=&entityId=&page=)
 */
import { prisma, type Prisma } from '@filt/db';
import { route } from '@/lib/authenticate';
import { paging, qp } from '@/lib/http';

export const GET = route({ perm: 'audit.read' }, async ({ req }) => {
    const { page, pageSize, skip, take } = paging(req);
    const where: Prisma.AuditLogWhereInput = {
        ...(qp(req, 'action') ? { action: { startsWith: qp(req, 'action') } } : {}),
        ...(qp(req, 'userId') ? { userId: Number(qp(req, 'userId')) } : {}),
        ...(qp(req, 'entity') ? { entity: qp(req, 'entity'), entityId: qp(req, 'entityId') } : {}),
    };
    const [rows, total] = await Promise.all([
        prisma.auditLog.findMany({ where, skip, take, orderBy: { id: 'desc' }, include: { User: { select: { name: true } } } }),
        prisma.auditLog.count({ where }),
    ]);
    return { page, pageSize, total, rows: rows.map(r => ({ id: r.id.toString(), action: r.action, entity: r.entity, entityId: r.entityId, data: r.data, ip: r.ip, createdAt: r.createdAt, user: r.User?.name ?? null })) };
});
