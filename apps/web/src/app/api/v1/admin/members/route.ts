/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET sócios (?status=&planId=&q=&page=)
 */
import { prisma, type Prisma, type MembershipStatus } from '@filt/db';
import { MEMBERSHIP_STATUS } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { paging, qp } from '@/lib/http';

export const GET = route({ perm: 'members.read' }, async ({ req }) => {
    const { page, pageSize, skip, take } = paging(req);
    const status = qp(req, 'status');
    const q = qp(req, 'q');
    const where: Prisma.MembershipWhereInput = {
        ...(status && (MEMBERSHIP_STATUS as readonly string[]).includes(status) ? { status: status as MembershipStatus } : {}),
        ...(qp(req, 'planId') ? { planId: Number(qp(req, 'planId')) } : {}),
        ...(q ? { OR: [{ User: { name: { contains: q } } }, { User: { email: { contains: q } } }, ...(/^\d+$/.test(q) ? [{ memberNumber: Number(q) }, { User: { cpf: { contains: q } } }] : [])] } : {}),
    };
    const [rows, total] = await Promise.all([
        prisma.membership.findMany({ where, skip, take, orderBy: [{ memberNumber: 'asc' }, { id: 'asc' }], include: { User: true, Plan: true, Charges: { where: { status: { in: ['OPEN', 'OVERDUE'] } } } } }),
        prisma.membership.count({ where }),
    ]);
    return {
        page, pageSize, total,
        rows: rows.map(m => ({
            id: m.id, userId: m.userId, name: m.User.name, email: m.User.email, cpf: m.User.cpf, phone: m.User.phone, memberNumber: m.memberNumber,
            status: m.status, plan: m.Plan.name, planId: m.planId, startedAt: m.startedAt, currentPeriodEnd: m.currentPeriodEnd,
            openChargesCents: m.Charges.reduce((s, c) => s + c.amountCents, 0),
        })),
    };
});
