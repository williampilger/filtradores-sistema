/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Pedidos: carrinho -> pedido (com reserva) -> pagamento -> efeitos -> expiração/estorno
 *
 * FLUXO (ver docs/pagamentos.md):
 *  1. createOrder()      : valida, precifica (desconto de sócio), RESERVA ingressos/estoque, expira em ORDER_RESERVATION_MINUTES
 *  2. startPayment()     : cria Payment + cobrança no gateway escolhido (PIX/cartão/boleto/checkout | manual | cortesia)
 *  3. applyPaymentStatus(): chamado por webhook / reconciliação / pagamento manual
 *  4. fulfillOrder()     : IDEMPOTENTE - emite ingressos, baixa estoque, ativa sócio, converte lista de espera
 *  5. expireOrders()     : worker devolve as reservas dos pedidos não pagos
 */
import { prisma, Prisma, type Order, type OrderItem, type OrderItemKind, type PaymentMethod } from '@filt/db';
import { applyDiscount, renewalPeriod, onlyDigits, type OrderChannel } from '@filt/shared';
import type { ChargeStatus } from '@williampilger/payment-gateways';
import { audit } from './audit';
import { CoreEnv } from './env';
import { GenericError, InconsistencyError, InputError, NotFoundError } from './errors';
import { getPayments, pickGateway } from './gateways';
import { newIdempotencyKey, newOrderCode, newTicketCode } from './ids';
import { commitStock, lockEvent, lockOrder, releaseStock, releaseTickets, reserveStock, reserveTickets, returnStock } from './inventory';
import { LogSystem } from './log';
import { notifyUser } from './notify';

type Tx = Prisma.TransactionClient;

export type Customer = { name: string, email?: string | null, cpf?: string | null, phone?: string | null };

/** Linha do pedido (uso interno: o carrinho público é validado por zodSchema_checkout) */
export type OrderLine =
    | { kind: 'TICKET', ticketTypeId?: number | null, eventId?: number, quantity: number, holderNames?: string[], unitPriceCents?: number }
    | { kind: 'PRODUCT', variantId: number, quantity: number, waitlistEntryId?: number }
    | { kind: 'MEMBERSHIP', chargeId: number };

export type CreateOrderInput = {
    userId: number | null;
    channel: OrderChannel;
    customer: Customer;
    lines: OrderLine[];
    /** operador (PDV/cortesia) */
    createdById?: number | null;
    /** PDV: ignora janela de vendas e "somente sócios"; permite preço informado (unitPriceCents) */
    pos?: boolean;
    notes?: string | null;
};

type PricedItem = Prisma.OrderItemCreateWithoutOrderInput & { _reserve?: () => Promise<void> };

async function activeMembershipPlan(tx: Tx, userId: number | null) {
    if (!userId) return null;
    const m = await tx.membership.findUnique({ where: { userId }, include: { Plan: true } });
    return m && m.status === 'ACTIVE' ? m : null;
}

// ─── 1. Criação ─────────────────────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput): Promise<Order & { Items: OrderItem[] }> {
    if (!input.lines.length) throw new InputError('Carrinho vazio', 261115130001);
    const now = new Date();

    for (let attempt = 0; ; attempt++) {
        try {
            return await prisma.$transaction(async tx => {
                const membership = await activeMembershipPlan(tx, input.userId);
                const items: Prisma.OrderItemCreateWithoutOrderInput[] = [];
                let needsExpiry = false;

                for (const line of input.lines) {
                    if (line.kind === 'TICKET') {
                        items.push(await priceTicketLine(tx, line, membership, input, now));
                        needsExpiry = true;
                    } else if (line.kind === 'PRODUCT') {
                        items.push(await priceProductLine(tx, line, membership, input));
                        needsExpiry = true;
                    } else {
                        items.push(await priceMembershipLine(tx, line, input));
                    }
                }

                const subtotal = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
                const discount = items.reduce((s, i) => s + (i.discountCents ?? 0), 0);
                const c = input.customer;
                return tx.order.create({
                    data: {
                        code: newOrderCode(), userId: input.userId, channel: input.channel, status: 'PENDING_PAYMENT',
                        subtotalCents: subtotal, discountCents: discount, totalCents: subtotal - discount,
                        customerName: c.name.trim().slice(0, 160), customerEmail: c.email?.toLowerCase() ?? null,
                        customerCpf: c.cpf ? onlyDigits(c.cpf) : null, customerPhone: c.phone ? onlyDigits(c.phone) : null,
                        expiresAt: needsExpiry ? new Date(now.getTime() + CoreEnv.ORDER_RESERVATION_MINUTES * 60_000) : null,
                        createdById: input.createdById ?? null, notes: input.notes ?? null,
                        Items: { create: items },
                    },
                    include: { Items: true },
                });
            }, { timeout: 20_000 });
        } catch (e) {
            // colisão do código legível do pedido (raríssimo): tenta de novo
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 3) continue;
            throw e;
        }
    }
}

async function priceTicketLine(tx: Tx, line: Extract<OrderLine, { kind: 'TICKET' }>, membership: Awaited<ReturnType<typeof activeMembershipPlan>>, input: CreateOrderInput, now: Date): Promise<Prisma.OrderItemCreateWithoutOrderInput> {
    if (line.quantity < 1) throw new InputError('Quantidade inválida', 261115130002);

    const type = line.ticketTypeId ? await tx.ticketType.findUnique({ where: { id: line.ticketTypeId } }) : null;
    if (line.ticketTypeId && !type) throw new NotFoundError('Lote de ingresso não encontrado', 261115130003);
    const eventId = type?.eventId ?? line.eventId;
    if (!eventId) throw new InputError('Evento não informado', 261115130004);

    await lockEvent(tx, eventId);
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event || event.deletedAt) throw new NotFoundError('Evento não encontrado', 261115130005);
    if (event.status !== 'PUBLISHED' && !(input.pos && event.status !== 'CANCELED')) throw new InconsistencyError('As vendas deste evento não estão abertas', 261115130006);

    if (type) {
        if (!type.active) throw new InconsistencyError(`Lote "${type.name}" indisponível`, 261115130007);
        if (!input.pos) {
            if (type.salesStartAt && type.salesStartAt > now) throw new InconsistencyError(`As vendas do lote "${type.name}" ainda não começaram`, 261115130008);
            if (type.salesEndAt && type.salesEndAt < now) throw new InconsistencyError(`As vendas do lote "${type.name}" foram encerradas`, 261115130009);
            if (type.membersOnly && !membership) throw new InconsistencyError(`O lote "${type.name}" é exclusivo para sócios em dia`, 261115130010);
            if (line.quantity > type.maxPerOrder) throw new InputError(`Máximo de ${type.maxPerOrder} ingresso(s) do lote "${type.name}" por pedido`, 261115130011);
        }
    }

    await reserveTickets(tx, eventId, type?.id ?? null, line.quantity);

    const base = input.pos && line.unitPriceCents != null ? line.unitPriceCents : (type?.priceCents ?? 0);
    const unit = membership && type?.memberDiscount && !input.pos ? applyDiscount(base, membership.Plan.ticketDiscountPct) : base;
    const holderNames = (line.holderNames ?? []).map(n => n.trim()).filter(Boolean).slice(0, line.quantity);
    return {
        kind: 'TICKET', Event: { connect: { id: eventId } }, ...(type ? { TicketType: { connect: { id: type.id } } } : {}),
        quantity: line.quantity, unitPriceCents: base, discountCents: (base - unit) * line.quantity, totalCents: unit * line.quantity,
        ref_name: `${event.title} - ${type?.name ?? 'Ingresso'}`.slice(0, 200),
        holderNames: holderNames.length ? holderNames : undefined,
    };
}

async function priceProductLine(tx: Tx, line: Extract<OrderLine, { kind: 'PRODUCT' }>, membership: Awaited<ReturnType<typeof activeMembershipPlan>>, input: CreateOrderInput): Promise<Prisma.OrderItemCreateWithoutOrderInput> {
    if (line.quantity < 1) throw new InputError('Quantidade inválida', 261115130012);
    const variant = await tx.productVariant.findUnique({ where: { id: line.variantId }, include: { Product: true } });
    if (!variant || !variant.active || !variant.Product.active || variant.Product.deletedAt) throw new NotFoundError('Produto indisponível', 261115130013);
    const p = variant.Product;
    if (!input.pos && line.quantity > p.maxPerOrder) throw new InputError(`Máximo de ${p.maxPerOrder} unidade(s) de "${p.name}" por pedido`, 261115130014);

    const base = variant.priceCents ?? p.basePriceCents;
    const unit = membership && p.allowMemberDiscount && !input.pos ? applyDiscount(base, membership.Plan.storeDiscountPct) : base;
    const common = {
        Product: { connect: { id: p.id } }, Variant: { connect: { id: variant.id } }, quantity: line.quantity,
        unitPriceCents: base, discountCents: (base - unit) * line.quantity, totalCents: unit * line.quantity,
        ref_name: `${p.name} - ${variant.name}`.slice(0, 200),
    };

    // chamada da lista de espera: usa a reserva/vez da entrada
    if (line.waitlistEntryId) {
        const entry = await tx.waitlistEntry.findUnique({ where: { id: line.waitlistEntryId } });
        if (!entry || entry.userId !== input.userId || entry.variantId !== variant.id) throw new NotFoundError('Chamada da lista de espera não encontrada', 261115130015);
        if (entry.status !== 'NOTIFIED' || (entry.reservationExpiresAt && entry.reservationExpiresAt < new Date())) throw new InconsistencyError('O prazo desta chamada da lista de espera expirou', 261115130016);
        if (line.quantity > entry.quantity) throw new InputError(`Sua reserva na lista de espera é de ${entry.quantity} unidade(s)`, 261115130017);
        if (p.fulfillment === 'ON_DEMAND') {
            return { ...common, kind: 'PREORDER', ...(entry.batchId ? { Batch: { connect: { id: entry.batchId } } } : {}), WaitlistEntry: { connect: { id: entry.id } } };
        }
        return { ...common, kind: 'PRODUCT', WaitlistEntry: { connect: { id: entry.id } } };
    }

    if (p.fulfillment === 'ON_DEMAND') {
        if (p.waitlistPayment !== 'UPFRONT') throw new InconsistencyError('Este item é sob encomenda: entre na lista de espera e pague quando ficar pronto', 261115130018);
        const batch = await tx.productionBatch.findFirst({ where: { productId: p.id, status: 'OPEN', OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }] }, orderBy: { id: 'desc' } });
        if (!batch) throw new InconsistencyError('Não há lote de encomendas aberto para este item no momento', 261115130019);
        return { ...common, kind: 'PREORDER', Batch: { connect: { id: batch.id } } };
    }

    await reserveStock(tx, variant.id, line.quantity);
    return { ...common, kind: 'PRODUCT' };
}

async function priceMembershipLine(tx: Tx, line: Extract<OrderLine, { kind: 'MEMBERSHIP' }>, input: CreateOrderInput): Promise<Prisma.OrderItemCreateWithoutOrderInput> {
    const charge = await tx.membershipCharge.findUnique({ where: { id: line.chargeId }, include: { Membership: true, Plan: true } });
    if (!charge || (input.userId && charge.Membership.userId !== input.userId && !input.pos)) throw new NotFoundError('Cobrança não encontrada', 261115130020);
    if (charge.status === 'PAID' || charge.status === 'CANCELED') throw new InconsistencyError('Esta cobrança já foi paga ou cancelada', 261115130021);
    return {
        kind: 'MEMBERSHIP', MembershipCharge: { connect: { id: charge.id } }, quantity: 1, unitPriceCents: charge.amountCents, discountCents: 0,
        totalCents: charge.amountCents, ref_name: `Sócio ${charge.Plan.name}${charge.isEnrollment ? ' (adesão)' : ' (renovação)'}`.slice(0, 200),
    };
}

// ─── 2. Pagamento ───────────────────────────────────────────────────────────

export type StartPaymentOpts = {
    /** operador que registrou (manual/cortesia) */
    registeredById?: number | null;
    registeredByName?: string;
    note?: string | null;
};

export async function startPayment(orderId: number, method: PaymentMethod, opts: StartPaymentOpts = {}) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { Items: true } });
    if (!order) throw new NotFoundError('Pedido não encontrado', 261115130101);
    if (order.status !== 'PENDING_PAYMENT') throw new InconsistencyError('Este pedido não está aguardando pagamento', 261115130102);
    if (order.expiresAt && order.expiresAt < new Date()) throw new InconsistencyError('A reserva deste pedido expirou. Faça um novo pedido.', 261115130103);

    // pedido gratuito = cortesia automática
    if (order.totalCents === 0 && method !== 'COURTESY') { method = 'COURTESY'; opts = { ...opts, note: opts.note ?? 'Pedido gratuito' }; }
    if (method === 'COURTESY' && !opts.note) throw new InputError('Informe o motivo da cortesia', 261115130104);
    if ((method === 'CASH' || method === 'MANUAL') && !opts.registeredById) throw new InputError('Pagamento manual exige o operador', 261115130105);
    if (['PIX', 'CARD', 'BOLETO', 'CHECKOUT'].includes(method) && !order.customerCpf) throw new InputError('Informe o CPF do pagador', 261115130106);

    const gateway = await pickGateway(method);

    // cancela pendências anteriores (ex.: trocou PIX por cartão). Se uma delas for paga mesmo assim, o webhook trata.
    const previous = await prisma.payment.findMany({ where: { orderId, status: 'PENDING' } });
    for (const p of previous) {
        await prisma.payment.update({ where: { id: p.id }, data: { status: 'CANCELED' } });
        if (p.externalId && !['manual', 'courtesy'].includes(p.gateway)) {
            void (async () => { try { const { registry } = await getPayments(); await registry.get(p.gateway).cancelCharge(p.externalId!); } catch { /* best-effort */ } })();
        }
    }

    const payment = await prisma.payment.create({
        data: {
            orderId, gateway: gateway.id, method, amountCents: method === 'COURTESY' ? 0 : order.totalCents, status: 'PENDING',
            idempotencyKey: newIdempotencyKey(), registeredById: opts.registeredById ?? null, note: opts.note ?? null,
        },
    });

    const expiresAt = order.expiresAt ?? new Date(Date.now() + 3 * 86_400_000);
    try {
        const r = await gateway.createCharge({
            amountCents: payment.amountCents, method, description: `Filtradores - pedido ${order.code}`,
            customer: { name: order.customerName, email: order.customerEmail ?? 'sem-email@filtradores.local', cpf: order.customerCpf ?? undefined, phone: order.customerPhone ?? undefined },
            items: method === 'COURTESY' ? undefined : order.Items.map(i => ({ id: String(i.id), title: i.ref_name, quantity: 1, unitAmountCents: i.totalCents })),
            externalReference: `pay_${payment.id}`, idempotencyKey: payment.idempotencyKey, expiresAt,
            returnUrls: { success: `${CoreEnv.APP_URL}/pedido/${order.code}`, failure: `${CoreEnv.APP_URL}/pedido/${order.code}`, pending: `${CoreEnv.APP_URL}/pedido/${order.code}` },
            notificationUrl: `${CoreEnv.PAYMENTS_WEBHOOK_BASE}/api/v1/webhooks/payments/${gateway.id}`,
            metadata: { orderCode: order.code, paymentId: String(payment.id) },
            manual: method === 'CASH' || method === 'MANUAL' ? { receivedBy: opts.registeredByName ?? `user:${opts.registeredById}`, receivedMethod: method, note: opts.note ?? undefined } : undefined,
            courtesy: method === 'COURTESY' ? { reason: opts.note ?? 'Cortesia', grantedBy: opts.registeredByName ?? (opts.registeredById ? `user:${opts.registeredById}` : 'sistema') } : undefined,
        });
        const updated = await prisma.payment.update({
            where: { id: payment.id },
            data: {
                externalId: r.externalId, checkoutUrl: r.checkoutUrl ?? null, pixCopiaECola: r.pix?.copiaECola ?? null,
                pixQrBase64: r.pix?.qrCodeBase64 ?? null, boletoUrl: r.boletoUrl ?? null, expiresAt: r.expiresAt ?? expiresAt,
                rawLast: safeJson(r.raw),
            },
        });
        if (r.status !== 'PENDING') await applyPaymentStatus(payment.id, r.status, { paidAt: r.paidAt });
        if (method === 'CASH' || method === 'MANUAL' || method === 'COURTESY') {
            await audit({ userId: opts.registeredById, action: method === 'COURTESY' ? 'payment.courtesy' : 'payment.manual', entity: 'order', entityId: orderId, data: { paymentId: payment.id, amountCents: payment.amountCents, note: opts.note } });
        }
        return prisma.payment.findUniqueOrThrow({ where: { id: updated.id } });
    } catch (e) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED', note: `${opts.note ? opts.note + ' | ' : ''}${(e as Error).message}`.slice(0, 500) } });
        if (e instanceof GenericError) throw e;
        LogSystem.error(261115130107, `Falha ao criar cobrança (${gateway.id}/${method}) do pedido ${order.code}: ${(e as Error).message}`);
        throw new InconsistencyError(`Não foi possível iniciar o pagamento: ${(e as Error).message}`, 261115130107, 502);
    }
}

const safeJson = (v: unknown): Prisma.InputJsonValue | undefined => {
    try { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue; } catch { return undefined; }
};

// ─── 3. Atualização de status (webhook / reconciliação) ─────────────────────

export async function applyPaymentStatus(paymentId: number, status: ChargeStatus, extra: { paidAt?: Date, raw?: unknown, refundedCents?: number } = {}): Promise<void> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;

    if (payment.status !== status) {
        await prisma.payment.update({
            where: { id: paymentId },
            data: { status, paidAt: status === 'PAID' ? (extra.paidAt ?? payment.paidAt ?? new Date()) : payment.paidAt, rawLast: extra.raw === undefined ? undefined : safeJson(extra.raw) },
        });
        LogSystem.info(261115130201, `Pagamento #${paymentId} (${payment.gateway}): ${payment.status} -> ${status}`);
    }

    if (status === 'PAID') await fulfillOrder(payment.orderId, paymentId);
    if ((status === 'REFUNDED' || status === 'CHARGEBACK') && payment.status !== status) {
        // estorno/chargeback feito direto no painel do gateway
        await applyRefundEffects(payment.orderId, payment.amountCents, null, `gateway: ${status}`);
        if (status === 'CHARGEBACK') LogSystem.ERROR(261115130202, `CHARGEBACK no pagamento #${paymentId} (pedido ${payment.orderId})`);
    }
}

// ─── 4. Efeitos do pagamento ────────────────────────────────────────────────

/** IDEMPOTENTE: pode ser chamado N vezes para o mesmo pedido (webhooks repetidos, reconciliação...) */
export async function fulfillOrder(orderId: number, paymentId: number): Promise<void> {
    const result = await prisma.$transaction(async tx => {
        await lockOrder(tx, orderId);
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { Items: true } });
        if (order.status === 'PAID' || order.status === 'REFUNDED' || order.status === 'PARTIALLY_REFUNDED') return null;
        const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });

        // pago DEPOIS de expirar/cancelar: tenta reservar de novo
        if (order.status === 'EXPIRED' || order.status === 'CANCELED') {
            try {
                await reserveItems(tx, order.Items);
            } catch (e) {
                await tx.payment.update({ where: { id: paymentId }, data: { note: `PAGO APÓS EXPIRAÇÃO SEM DISPONIBILIDADE - ESTORNAR. ${(e as Error).message}`.slice(0, 500) } });
                return { lateFailure: true as const, order };
            }
        }

        await tx.order.update({ where: { id: orderId }, data: { status: 'PAID', paidAt: payment.paidAt ?? new Date(), expiresAt: null } });

        const origin = payment.method === 'COURTESY' ? 'COURTESY' : order.channel === 'POS' ? 'MANUAL' : 'SALE';
        for (const item of order.Items) await fulfillItem(tx, order, item, origin, payment.registeredById);
        return { lateFailure: false as const, order };
    }, { timeout: 30_000 });

    if (!result) return;
    const { order } = result;
    if (result.lateFailure) {
        LogSystem.ERROR(261115130301, `Pedido ${order.code} pago após expirar e sem disponibilidade: ESTORNAR o pagamento #${paymentId}`);
        await audit({ action: 'order.paid_late_unavailable', entity: 'order', entityId: orderId, data: { paymentId } });
        if (order.userId) await notifyUser(order.userId, { title: 'Pagamento recebido após o prazo', body: `Recebemos o pagamento do pedido ${order.code}, mas a reserva tinha expirado e não há mais disponibilidade. O valor será estornado.`, link: `/pedido/${order.code}` });
        return;
    }
    LogSystem.info(261115130302, `Pedido ${order.code} PAGO`, { orderId });
    if (order.userId) await notifyUser(order.userId, { title: `Pedido ${order.code} confirmado`, body: 'Pagamento confirmado! Seus ingressos e itens estão disponíveis na sua conta.', link: `/pedido/${order.code}` });
    else if (order.customerEmail) {
        const { enqueueMail } = await import('./notify');
        await enqueueMail({ to: order.customerEmail, subject: `Pedido ${order.code} confirmado`, text: `Pagamento confirmado!\n\nAcesse: ${CoreEnv.APP_URL}/pedido/${order.code}` });
    }
}

/** Reserva novamente os itens de um pedido (pagamento tardio) */
async function reserveItems(tx: Tx, items: OrderItem[]): Promise<void> {
    for (const i of items) {
        if (i.kind === 'TICKET' && i.eventId) { await lockEvent(tx, i.eventId); await reserveTickets(tx, i.eventId, i.ticketTypeId, i.quantity); }
        if (i.kind === 'PRODUCT' && i.variantId && !i.waitlistEntryId) await reserveStock(tx, i.variantId, i.quantity);
    }
}

async function releaseItems(tx: Tx, items: OrderItem[]): Promise<void> {
    for (const i of items) {
        if (i.kind === 'TICKET') await releaseTickets(tx, i.ticketTypeId, i.quantity);
        // item vindo da lista de espera: a reserva continua com a entrada (até o prazo dela)
        if (i.kind === 'PRODUCT' && i.variantId && !i.waitlistEntryId) await releaseStock(tx, i.variantId, i.quantity);
    }
}

async function fulfillItem(tx: Tx, order: Order, item: OrderItem, origin: 'SALE' | 'COURTESY' | 'MANUAL', operatorId: number | null): Promise<void> {
    switch (item.kind as OrderItemKind) {
        case 'TICKET': {
            const names = Array.isArray(item.holderNames) ? (item.holderNames as string[]) : [];
            for (let n = 0; n < item.quantity; n++) {
                await tx.ticket.create({
                    data: {
                        code: newTicketCode(), eventId: item.eventId!, ticketTypeId: item.ticketTypeId, orderItemId: item.id, userId: order.userId,
                        holderName: (names[n] || order.customerName).slice(0, 160), holderCpf: n === 0 ? order.customerCpf : null,
                        origin, issuedById: origin === 'SALE' ? null : operatorId, courtesyReason: origin === 'COURTESY' ? order.notes : null,
                    },
                });
            }
            break;
        }
        case 'PRODUCT': {
            await commitStock(tx, item.variantId!, item.quantity, order.id);
            if (item.waitlistEntryId) {
                await tx.waitlistEntry.update({ where: { id: item.waitlistEntryId }, data: { status: 'CONVERTED', reservedQty: 0, orderId: order.id } });
            }
            await tx.orderItem.update({ where: { id: item.id }, data: { deliveryStatus: 'PENDING' } });
            break;
        }
        case 'PREORDER': {
            const batch = item.batchId ? await tx.productionBatch.findUnique({ where: { id: item.batchId } }) : null;
            const ds = batch?.status === 'READY' || batch?.status === 'DELIVERED' ? 'READY_FOR_PICKUP' : batch?.status === 'IN_PRODUCTION' ? 'IN_PRODUCTION' : 'PENDING';
            await tx.orderItem.update({ where: { id: item.id }, data: { deliveryStatus: ds } });
            if (item.waitlistEntryId) await tx.waitlistEntry.update({ where: { id: item.waitlistEntryId }, data: { status: 'CONVERTED', orderId: order.id } });
            break;
        }
        case 'MEMBERSHIP': {
            const charge = await tx.membershipCharge.findUniqueOrThrow({ where: { id: item.membershipChargeId! }, include: { Membership: true, Plan: true } });
            if (charge.status === 'PAID') break;
            const m = charge.Membership;
            const now = new Date();
            const period = renewalPeriod(now, m.status === 'ACTIVE' || m.status === 'OVERDUE' ? m.currentPeriodEnd : null, charge.Plan.period);
            let memberNumber = m.memberNumber;
            if (memberNumber == null) {
                const max = await tx.membership.aggregate({ _max: { memberNumber: true } });
                memberNumber = (max._max.memberNumber ?? 0) + 1;
            }
            await tx.membershipCharge.update({ where: { id: charge.id }, data: { status: 'PAID', paidAt: now, periodStart: period.start, periodEnd: period.end } });
            await tx.membership.update({
                where: { id: m.id },
                data: { status: 'ACTIVE', planId: charge.planId, memberNumber, startedAt: m.startedAt ?? now, currentPeriodStart: period.start, currentPeriodEnd: period.end, canceledAt: null, cancelReason: null },
            });
            break;
        }
    }
}

// ─── 5. Expiração / cancelamento ────────────────────────────────────────────

/** Worker: devolve as reservas dos pedidos vencidos. Retorna quantos expiraram. */
export async function expireOrders(now = new Date()): Promise<number> {
    const due = await prisma.order.findMany({ where: { status: 'PENDING_PAYMENT', expiresAt: { lt: now } }, select: { id: true }, take: 200 });
    let n = 0;
    for (const { id } of due) {
        if (await closePendingOrder(id, 'EXPIRED')) n++;
    }
    return n;
}

/** Cancela um pedido PENDENTE (admin ou o próprio cliente) devolvendo as reservas */
export async function cancelPendingOrder(orderId: number, byUserId?: number | null): Promise<void> {
    const ok = await closePendingOrder(orderId, 'CANCELED');
    if (!ok) throw new InconsistencyError('Apenas pedidos aguardando pagamento podem ser cancelados (pagos: use estorno)', 261115130401);
    if (byUserId) await audit({ userId: byUserId, action: 'order.cancel', entity: 'order', entityId: orderId });
}

async function closePendingOrder(orderId: number, status: 'EXPIRED' | 'CANCELED'): Promise<boolean> {
    const pending = await prisma.$transaction(async tx => {
        await lockOrder(tx, orderId);
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { Items: true } });
        if (order.status !== 'PENDING_PAYMENT') return null;
        await releaseItems(tx, order.Items);
        await tx.order.update({ where: { id: orderId }, data: { status, canceledAt: status === 'CANCELED' ? new Date() : null } });
        const pays = await tx.payment.findMany({ where: { orderId, status: 'PENDING' } });
        await tx.payment.updateMany({ where: { orderId, status: 'PENDING' }, data: { status: status === 'EXPIRED' ? 'EXPIRED' : 'CANCELED' } });
        return pays;
    });
    if (!pending) return false;
    // cancela no gateway (best-effort): evita o cliente pagar um PIX de pedido expirado
    if (pending.length) {
        const { registry } = await getPayments();
        for (const p of pending) {
            if (!p.externalId || !registry.has(p.gateway) || ['manual', 'courtesy'].includes(p.gateway)) continue;
            try { await registry.get(p.gateway).cancelCharge(p.externalId); } catch (e) { LogSystem.debug(261115130402, `cancelCharge ${p.gateway}/${p.externalId}: ${(e as Error).message}`); }
        }
    }
    return true;
}

// ─── 6. Estorno ─────────────────────────────────────────────────────────────

export async function refundPayment(paymentId: number, input: { amountCents?: number, reason: string, byUserId: number }): Promise<void> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { Order: true } });
    if (!payment) throw new NotFoundError('Pagamento não encontrado', 261115130501);
    if (payment.status !== 'PAID' && payment.status !== 'PARTIALLY_REFUNDED') throw new InconsistencyError('Apenas pagamentos pagos podem ser estornados', 261115130502);
    const remaining = payment.amountCents - payment.refundedCents;
    const amount = input.amountCents ?? remaining;
    if (amount <= 0 || amount > remaining) throw new InputError(`Valor de estorno inválido (máximo ${remaining} centavos)`, 261115130503);

    let externalRefundId: string | null = null;
    let status: 'PENDING' | 'DONE' | 'FAILED' = 'DONE';
    if (payment.gateway !== 'courtesy' && amount > 0) {
        const { registry } = await getPayments();
        if (!registry.has(payment.gateway)) throw new InconsistencyError(`Gateway ${payment.gateway} não está configurado`, 261115130504);
        const gw = registry.get(payment.gateway);
        if (amount < remaining && !gw.capabilities.partialRefund) throw new InputError('Este gateway não permite estorno parcial', 261115130505);
        try {
            // sempre informa o valor (o gateway `manual` exige; os demais aceitam o total)
            const r = await gw.refund({ externalId: payment.externalId!, amountCents: amount, reason: input.reason });
            externalRefundId = r.externalRefundId; status = r.status;
        } catch (e) {
            throw new InconsistencyError(`O gateway recusou o estorno: ${(e as Error).message}`, 261115130506, 502);
        }
    }
    if (status === 'FAILED') throw new InconsistencyError('O gateway recusou o estorno', 261115130507, 502);

    const refundedCents = payment.refundedCents + amount;
    const full = refundedCents >= payment.amountCents;
    await prisma.$transaction(async tx => {
        await tx.refund.create({ data: { paymentId, amountCents: amount, reason: input.reason, externalRefundId, status, createdById: input.byUserId } });
        await tx.payment.update({ where: { id: paymentId }, data: { refundedCents, status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED' } });
    });
    await applyRefundEffects(payment.orderId, amount, input.byUserId, input.reason);
    await audit({ userId: input.byUserId, action: 'payment.refund', entity: 'payment', entityId: paymentId, data: { amount, reason: input.reason, full } });
}

/** Efeitos no pedido: estorno total cancela ingressos válidos e devolve itens não entregues ao estoque */
async function applyRefundEffects(orderId: number, amount: number, byUserId: number | null, reason: string): Promise<void> {
    await prisma.$transaction(async tx => {
        await lockOrder(tx, orderId);
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { Items: { include: { Tickets: true } } } });
        const refunded = order.refundedCents + amount;
        const full = refunded >= order.totalCents;
        await tx.order.update({ where: { id: orderId }, data: { refundedCents: refunded, status: full ? 'REFUNDED' : 'PARTIALLY_REFUNDED' } });
        if (!full) return;
        for (const item of order.Items) {
            if (item.kind === 'TICKET') {
                const valid = item.Tickets.filter(t => t.status === 'VALID');
                await tx.ticket.updateMany({ where: { id: { in: valid.map(t => t.id) } }, data: { status: 'REFUNDED', canceledAt: new Date() } });
                await releaseTickets(tx, item.ticketTypeId, valid.length);
            }
            if ((item.kind === 'PRODUCT' || item.kind === 'PREORDER') && item.deliveryStatus !== 'DELIVERED') {
                if (item.kind === 'PRODUCT' && item.variantId) await returnStock(tx, item.variantId, item.quantity, orderId, byUserId);
                await tx.orderItem.update({ where: { id: item.id }, data: { deliveryStatus: 'CANCELED' } });
            }
            if (item.kind === 'MEMBERSHIP' && item.membershipChargeId) {
                await tx.membershipCharge.update({ where: { id: item.membershipChargeId }, data: { status: 'CANCELED' } });
                LogSystem.warn(261115130601, `Mensalidade estornada (cobrança #${item.membershipChargeId}): revise o período do sócio manualmente. Motivo: ${reason}`);
            }
        }
    });
}
