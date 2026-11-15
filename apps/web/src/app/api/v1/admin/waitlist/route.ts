/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET listas de espera (?productId=&status=)
 */
import { prisma, type Prisma, type WaitlistStatus } from '@filt/db';
import { route } from '@/lib/authenticate';
import { qp } from '@/lib/http';

export const GET = route({ perm: 'waitlist.manage' }, async ({ req }) => {
    const where: Prisma.WaitlistEntryWhereInput = {
        ...(qp(req, 'productId') ? { productId: Number(qp(req, 'productId')) } : {}),
        ...(qp(req, 'status') ? { status: qp(req, 'status') as WaitlistStatus } : { status: { in: ['WAITING', 'NOTIFIED'] } }),
    };
    const rows = await prisma.waitlistEntry.findMany({ where, include: { User: { select: { name: true, email: true, phone: true } }, Product: { select: { name: true } }, Variant: { select: { name: true } }, Batch: { select: { name: true } } }, orderBy: { createdAt: 'asc' }, take: 1000 });
    return rows.map(e => ({
        id: e.id, product: e.Product.name, productId: e.productId, variant: e.Variant.name, quantity: e.quantity, status: e.status, batch: e.Batch?.name ?? null,
        name: e.User.name, email: e.User.email, phone: e.User.phone, createdAt: e.createdAt, notifiedAt: e.notifiedAt, reservationExpiresAt: e.reservationExpiresAt, note: e.note,
    }));
});
