/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST registra pagamento manual de uma cobrança de sócio (dinheiro / PIX direto)
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { createOrder, InconsistencyError, NotFoundError, startPayment } from '@filt/core';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'payments.manual' }, async ({ req, params, auth }) => {
    const b = z.object({ method: z.enum(['CASH', 'MANUAL']), note: z.string().max(255).optional() }).parse(await req.json());
    const charge = await prisma.membershipCharge.findUnique({ where: { id: idParam(params.id) }, include: { Membership: { include: { User: true } } } });
    if (!charge) throw new NotFoundError('Cobrança não encontrada', 261115290003);
    if (charge.status === 'PAID' || charge.status === 'CANCELED') throw new InconsistencyError('Cobrança já paga ou cancelada', 261115290004);
    const u = charge.Membership.User;
    // reaproveita pedido pendente (ex.: o sócio gerou um PIX e acabou pagando em dinheiro)
    const pending = await prisma.order.findFirst({ where: { status: 'PENDING_PAYMENT', Items: { some: { membershipChargeId: charge.id } } } });
    const order = pending ?? await createOrder({ userId: u.id, channel: 'POS', pos: true, createdById: auth.user.id, customer: { name: u.name, email: u.email, cpf: u.cpf, phone: u.phone }, lines: [{ kind: 'MEMBERSHIP', chargeId: charge.id }] });
    await startPayment(order.id, b.method, { registeredById: auth.user.id, registeredByName: auth.user.name, note: b.note });
    return { orderCode: order.code };
});
