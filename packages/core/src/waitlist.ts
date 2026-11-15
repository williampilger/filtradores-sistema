/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Lista de espera e lotes de produção (ver docs/loja-lista-espera.md)
 *
 * MODOS (Product.fulfillment x Product.waitlistPayment), só quando Product.waitlistEnabled:
 *  - STOCK (pronta entrega): esgotou -> o torcedor entra na fila. Ao repor estoque, os primeiros da fila
 *    (FIFO estrito) são CHAMADOS: o estoque fica reservado por WAITLIST_RESERVATION_HOURS para eles comprarem.
 *  - ON_DEMAND + UPFRONT: compra direta = encomenda paga (item PREORDER no lote aberto). Não usa WaitlistEntry.
 *  - ON_DEMAND + ON_RELEASE: entra na fila do lote aberto SEM pagar; quando a diretoria marca o lote como PRONTO,
 *    todos são chamados para pagar dentro do prazo.
 */
import { prisma, type ProductionBatchStatus } from '@filt/db';
import { LABELS } from '@filt/shared';
import { audit } from './audit';
import { CoreEnv } from './env';
import { InconsistencyError, InputError, NotFoundError } from './errors';
import { releaseStock } from './inventory';
import { LogSystem } from './log';
import { notifyUser } from './notify';

const reservationDeadline = () => new Date(Date.now() + CoreEnv.WAITLIST_RESERVATION_HOURS * 3_600_000);

export async function joinWaitlist(userId: number, variantId: number, quantity: number, note?: string | null) {
    if (quantity < 1 || quantity > 20) throw new InputError('Quantidade inválida', 261115170001);
    const v = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { Product: true } });
    if (!v || !v.active || !v.Product.active || v.Product.deletedAt) throw new NotFoundError('Produto não encontrado', 261115170002);
    const p = v.Product;
    if (!p.waitlistEnabled) throw new InconsistencyError('Este produto não tem lista de espera', 261115170003);

    const dup = await prisma.waitlistEntry.findFirst({ where: { userId, variantId, status: { in: ['WAITING', 'NOTIFIED'] } } });
    if (dup) throw new InconsistencyError('Você já está na lista de espera desta variação', 261115170004);

    let batchId: number | null = null;
    if (p.fulfillment === 'STOCK') {
        if (v.stock - v.reserved >= quantity) throw new InconsistencyError('Este item está disponível: compre diretamente', 261115170005);
    } else {
        if (p.waitlistPayment === 'UPFRONT') throw new InconsistencyError('Este item é encomendado com pagamento antecipado: faça a compra para garantir', 261115170006);
        const batch = await prisma.productionBatch.findFirst({ where: { productId: p.id, status: 'OPEN', OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }] }, orderBy: { id: 'desc' } });
        if (!batch) throw new InconsistencyError('Não há lote de encomendas aberto no momento', 261115170007);
        batchId = batch.id;
    }
    const entry = await prisma.waitlistEntry.create({ data: { productId: p.id, variantId, userId, quantity, batchId, note: note?.slice(0, 255) ?? null } });
    LogSystem.info(261115170008, `Lista de espera: usuário ${userId} entrou em ${p.name} / ${v.name} (x${quantity})`);
    return entry;
}

export async function cancelWaitlistEntry(entryId: number, byUserId: number, isAdmin = false) {
    const e = await prisma.waitlistEntry.findUnique({ where: { id: entryId } });
    if (!e || (!isAdmin && e.userId !== byUserId)) throw new NotFoundError('Entrada não encontrada', 261115170009);
    if (e.status !== 'WAITING' && e.status !== 'NOTIFIED') throw new InconsistencyError('Esta entrada já foi encerrada', 261115170010);
    await prisma.$transaction(async tx => {
        await tx.waitlistEntry.update({ where: { id: entryId }, data: { status: 'CANCELED', reservedQty: 0 } });
        if (e.reservedQty > 0) await releaseStock(tx, e.variantId, e.reservedQty);
    });
    if (e.reservedQty > 0) await advanceVariant(e.variantId);
    if (isAdmin) await audit({ userId: byUserId, action: 'waitlist.cancel', entity: 'waitlist', entityId: entryId });
}

/** Entrada/ajuste de estoque. delta > 0 chama a fila automaticamente. */
export async function adjustStock(variantId: number, delta: number, reason: 'RESTOCK' | 'ADJUST', byUserId: number, note?: string | null) {
    if (!Number.isInteger(delta) || delta === 0) throw new InputError('Quantidade inválida', 261115170011);
    await prisma.$transaction(async tx => {
        const v = await tx.productVariant.findUnique({ where: { id: variantId } });
        if (!v) throw new NotFoundError('Variação não encontrada', 261115170012);
        if (v.stock + delta < v.reserved) throw new InconsistencyError(`Estoque não pode ficar abaixo do reservado (${v.reserved})`, 261115170013);
        await tx.productVariant.update({ where: { id: variantId }, data: { stock: { increment: delta } } });
        await tx.stockMovement.create({ data: { variantId, delta, reason, note: note ?? null, userId: byUserId } });
    });
    await audit({ userId: byUserId, action: 'stock.adjust', entity: 'variant', entityId: variantId, data: { delta, reason, note } });
    if (delta > 0) await advanceVariant(variantId);
}

/** Chama os próximos da fila (STOCK) enquanto houver estoque livre. FIFO estrito: para no primeiro que não couber. */
export async function advanceVariant(variantId: number): Promise<number> {
    const called: { userId: number, product: string, slug: string, variant: string, qty: number }[] = [];
    await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${variantId} FOR UPDATE`;
        const v = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId }, include: { Product: true } });
        if (v.Product.fulfillment !== 'STOCK' || !v.Product.waitlistEnabled) return;
        let free = v.stock - v.reserved;
        const queue = await tx.waitlistEntry.findMany({ where: { variantId, status: 'WAITING' }, orderBy: { createdAt: 'asc' }, take: 50 });
        for (const e of queue) {
            if (e.quantity > free) break;
            free -= e.quantity;
            await tx.productVariant.update({ where: { id: variantId }, data: { reserved: { increment: e.quantity } } });
            await tx.waitlistEntry.update({ where: { id: e.id }, data: { status: 'NOTIFIED', notifiedAt: new Date(), reservationExpiresAt: reservationDeadline(), reservedQty: e.quantity } });
            called.push({ userId: e.userId, product: v.Product.name, slug: v.Product.slug, variant: v.name, qty: e.quantity });
        }
    });
    for (const c of called) {
        await notifyUser(c.userId, {
            title: `Chegou a sua vez: ${c.product}`,
            body: `Reservamos ${c.qty} unidade(s) de ${c.product} (${c.variant}) para você por ${CoreEnv.WAITLIST_RESERVATION_HOURS} horas. Finalize a compra antes do prazo!`,
            link: `/loja/${c.slug}`,
        });
    }
    return called.length;
}

/** Worker: expira chamadas vencidas (devolve a reserva) e chama os próximos */
export async function waitlistSweep(now = new Date()): Promise<number> {
    const due = await prisma.waitlistEntry.findMany({ where: { status: 'NOTIFIED', reservationExpiresAt: { lt: now } }, take: 200 });
    const touched = new Set<number>();
    let n = 0;
    for (const e of due) {
        // tem pedido pendente usando esta chamada? espera o pedido resolver
        const pending = await prisma.orderItem.findFirst({ where: { waitlistEntryId: e.id, Order: { status: 'PENDING_PAYMENT', expiresAt: { gt: now } } } });
        if (pending) continue;
        await prisma.$transaction(async tx => {
            const r = await tx.waitlistEntry.updateMany({ where: { id: e.id, status: 'NOTIFIED' }, data: { status: 'EXPIRED', reservedQty: 0 } });
            if (r.count && e.reservedQty > 0) await releaseStock(tx, e.variantId, e.reservedQty);
        });
        touched.add(e.variantId);
        n++;
    }
    for (const variantId of touched) await advanceVariant(variantId);
    if (n) LogSystem.info(261115170014, `Lista de espera: ${n} chamada(s) expirada(s)`);
    return n;
}

// ─── Lotes de produção (sob encomenda) ──────────────────────────────────────

export async function createBatch(input: { productId: number, name: string, minQuantity?: number | null, closesAt?: Date | null, notes?: string | null, byUserId: number }) {
    const p = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!p || p.fulfillment !== 'ON_DEMAND') throw new InconsistencyError('Lotes de produção são apenas para itens sob encomenda', 261115170015);
    const open = await prisma.productionBatch.findFirst({ where: { productId: p.id, status: 'OPEN' } });
    if (open) throw new InconsistencyError(`Já existe um lote aberto (${open.name}). Feche-o antes de abrir outro.`, 261115170016);
    const b = await prisma.productionBatch.create({ data: { productId: p.id, name: input.name, minQuantity: input.minQuantity ?? null, closesAt: input.closesAt ?? null, notes: input.notes ?? null } });
    await audit({ userId: input.byUserId, action: 'batch.create', entity: 'batch', entityId: b.id });
    return b;
}

const BATCH_FLOW: Record<ProductionBatchStatus, ProductionBatchStatus[]> = {
    OPEN: ['CLOSED', 'CANCELED'],
    CLOSED: ['OPEN', 'IN_PRODUCTION', 'CANCELED'],
    IN_PRODUCTION: ['READY', 'CANCELED'],
    READY: ['DELIVERED'],
    DELIVERED: [],
    CANCELED: [],
};

/** Avança o lote e propaga para os itens pagos / fila (com notificações) */
export async function setBatchStatus(batchId: number, status: ProductionBatchStatus, byUserId: number) {
    const b = await prisma.productionBatch.findUnique({ where: { id: batchId }, include: { Product: true } });
    if (!b) throw new NotFoundError('Lote não encontrado', 261115170017);
    if (!BATCH_FLOW[b.status].includes(status)) throw new InconsistencyError(`Transição inválida: ${LABELS.batchStatus[b.status]} -> ${LABELS.batchStatus[status]}`, 261115170018);

    await prisma.productionBatch.update({ where: { id: batchId }, data: { status } });
    const paidItems = await prisma.orderItem.findMany({ where: { batchId, kind: 'PREORDER', Order: { status: 'PAID' }, deliveryStatus: { notIn: ['DELIVERED', 'CANCELED'] } }, include: { Order: true } });
    const users = new Set<number>(paidItems.map(i => i.Order.userId).filter((x): x is number => !!x));
    const link = `/loja/${b.Product.slug}`;

    if (status === 'IN_PRODUCTION') {
        await prisma.orderItem.updateMany({ where: { id: { in: paidItems.map(i => i.id) } }, data: { deliveryStatus: 'IN_PRODUCTION' } });
        for (const u of users) await notifyUser(u, { title: `${b.Product.name}: em produção`, body: 'Sua encomenda entrou em produção. Avisaremos quando estiver pronta para retirada.', link: '/minha-conta?aba=pedidos' });
    }
    if (status === 'READY') {
        await prisma.orderItem.updateMany({ where: { id: { in: paidItems.map(i => i.id) } }, data: { deliveryStatus: 'READY_FOR_PICKUP' } });
        for (const u of users) await notifyUser(u, { title: `${b.Product.name}: pronto para retirada`, body: 'Sua encomenda está pronta! Veja as instruções de retirada na sua conta.', link: '/minha-conta?aba=pedidos' });
        // fila sem pagamento antecipado: chama todos para pagar
        const waiting = await prisma.waitlistEntry.findMany({ where: { batchId, status: 'WAITING' } });
        const deadline = reservationDeadline();
        for (const e of waiting) {
            await prisma.waitlistEntry.update({ where: { id: e.id }, data: { status: 'NOTIFIED', notifiedAt: new Date(), reservationExpiresAt: deadline } });
            await notifyUser(e.userId, { title: `${b.Product.name}: sua encomenda ficou pronta`, body: `Finalize o pagamento em até ${CoreEnv.WAITLIST_RESERVATION_HOURS} horas para garantir o seu item.`, link });
        }
    }
    if (status === 'CANCELED') {
        await prisma.orderItem.updateMany({ where: { id: { in: paidItems.map(i => i.id) } }, data: { deliveryStatus: 'CANCELED' } });
        await prisma.waitlistEntry.updateMany({ where: { batchId, status: { in: ['WAITING', 'NOTIFIED'] } }, data: { status: 'CANCELED' } });
        for (const u of users) await notifyUser(u, { title: `${b.Product.name}: lote cancelado`, body: 'Infelizmente o lote foi cancelado. O valor pago será estornado pela diretoria.', link: '/minha-conta?aba=pedidos' });
        if (paidItems.length) LogSystem.ERROR(261115170019, `Lote #${batchId} cancelado com ${paidItems.length} encomenda(s) paga(s): ESTORNAR os pagamentos`);
    }
    await audit({ userId: byUserId, action: 'batch.status', entity: 'batch', entityId: batchId, data: { from: b.status, to: status } });
}

/** Resumo para produção: quantidades por variação (encomendas pagas + fila do lote) */
export async function batchSummary(batchId: number) {
    const [paid, waiting] = await Promise.all([
        prisma.orderItem.groupBy({ by: ['variantId'], where: { batchId, kind: 'PREORDER', Order: { status: 'PAID' }, deliveryStatus: { not: 'CANCELED' } }, _sum: { quantity: true } }),
        prisma.waitlistEntry.groupBy({ by: ['variantId'], where: { batchId, status: { in: ['WAITING', 'NOTIFIED', 'CONVERTED'] } }, _sum: { quantity: true } }),
    ]);
    const variants = await prisma.productVariant.findMany({ where: { id: { in: [...paid, ...waiting].map(x => x.variantId!).filter(Boolean) } } });
    return variants.map(v => ({
        variantId: v.id, name: v.name,
        paid: paid.find(p => p.variantId === v.id)?._sum.quantity ?? 0,
        waitlist: waiting.find(w => w.variantId === v.id)?._sum.quantity ?? 0,
    }));
}

/** Entrega / separação de itens da loja */
export async function setDeliveryStatus(orderItemId: number, status: 'PENDING' | 'READY_FOR_PICKUP' | 'DELIVERED', byUserId: number) {
    const item = await prisma.orderItem.findUnique({ where: { id: orderItemId }, include: { Order: true } });
    if (!item || (item.kind !== 'PRODUCT' && item.kind !== 'PREORDER')) throw new NotFoundError('Item não encontrado', 261115170020);
    if (item.Order.status !== 'PAID') throw new InconsistencyError('O pedido não está pago', 261115170021);
    await prisma.orderItem.update({ where: { id: orderItemId }, data: { deliveryStatus: status, deliveredAt: status === 'DELIVERED' ? new Date() : null, deliveredById: status === 'DELIVERED' ? byUserId : null } });
    if (status === 'READY_FOR_PICKUP' && item.Order.userId) await notifyUser(item.Order.userId, { title: `${item.ref_name}: pronto para retirada`, body: `Seu item do pedido ${item.Order.code} está pronto para retirada.`, link: `/pedido/${item.Order.code}` });
    await audit({ userId: byUserId, action: 'order.delivery', entity: 'order_item', entityId: orderItemId, data: { status } });
}
