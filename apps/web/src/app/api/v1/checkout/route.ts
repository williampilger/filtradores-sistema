/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 POST cria o pedido (reserva) e inicia o pagamento no método escolhido
 *
 * ⚠️ Exige login (o histórico de compras e os ingressos ficam na conta do torcedor).
 * Se o pagamento falhar ao iniciar, o pedido continua reservado: o cliente pode tentar outro método em /pedido/<code>.
 */
import { prisma } from '@filt/db';
import { createOrder, InputError, LogSystem, ORDER_INCLUDE, startPayment, toOrderDTO } from '@filt/core';
import { zodSchema_checkout } from '@filt/shared';
import { route } from '@/lib/authenticate';

export const POST = route({}, async ({ req, auth }) => {
    const b = zodSchema_checkout.parse(await req.json());
    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.user.id } });
    const customer = b.customer ?? { name: user.name, email: user.email, cpf: user.cpf ?? '', phone: user.phone ?? undefined };
    if (!customer.cpf) throw new InputError('Informe o CPF para concluir a compra', 261115260003);
    if (!user.cpf) await prisma.user.update({ where: { id: user.id }, data: { cpf: customer.cpf } }).catch(() => undefined);

    const order = await createOrder({
        userId: user.id, channel: b.channel, customer,
        lines: b.items.map(i => i.kind === 'TICKET'
            ? { kind: 'TICKET' as const, ticketTypeId: i.ticketTypeId, quantity: i.quantity, holderNames: i.holderNames }
            : { kind: 'PRODUCT' as const, variantId: i.variantId, quantity: i.quantity, waitlistEntryId: i.waitlistEntryId }),
    });
    let paymentError: string | null = null;
    try {
        await startPayment(order.id, b.method);
    } catch (e) {
        paymentError = (e as Error).message;
        LogSystem.warn(261115260004, `Pedido ${order.code} criado, mas o pagamento não iniciou: ${paymentError}`);
    }
    const full = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE });
    return { order: toOrderDTO(full), paymentError };
});
