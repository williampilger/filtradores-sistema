/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Reserva/liberação de ingressos e estoque (SEMPRE dentro de transação)
 *
 * CONCORRÊNCIA:
 *  - Ingressos: lock da linha do evento (`SELECT ... FOR UPDATE`) serializa as reservas do evento
 *    -> a capacidade total (lotes + sócios) nunca estoura, mesmo com vários compradores ao mesmo tempo.
 *  - Estoque: UPDATE condicional (`stock - reserved >= qty`) - atômico por variante.
 *
 * CONTADORES:
 *  - TicketType.calc_allocated = reservados (pedidos pendentes) + vendidos
 *  - ProductVariant.reserved   = reservados (pedidos pendentes + chamadas da lista de espera)
 *  - ProductVariant.stock      = em mãos (baixa no pagamento)
 */
import { type Prisma } from '@filt/db';
import { InconsistencyError } from './errors';

type Tx = Prisma.TransactionClient;

export async function lockEvent(tx: Tx, eventId: number): Promise<void> {
    await tx.$queryRaw`SELECT id FROM events WHERE id = ${eventId} FOR UPDATE`;
}

export async function lockOrder(tx: Tx, orderId: number): Promise<void> {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
}

/** Ocupação atual do evento: ingressos alocados (todos os lotes + cortesias sem lote) + resgates/entradas de sócios */
export async function eventOccupancy(tx: Tx, eventId: number): Promise<{ allocated: number, memberClaims: number, memberEntries: number }> {
    const [types, noType, ev, entries] = await Promise.all([
        tx.ticketType.aggregate({ where: { eventId }, _sum: { calc_allocated: true } }),
        tx.ticket.count({ where: { eventId, ticketTypeId: null, origin: { not: 'MEMBER_CLAIM' }, status: { in: ['VALID', 'USED'] } } }),
        tx.event.findUniqueOrThrow({ where: { id: eventId }, select: { calc_memberClaims: true } }),
        tx.memberEventEntry.count({ where: { eventId } }),
    ]);
    // ingressos sem lote (cortesias avulsas) já emitidos também ocupam lugar
    return { allocated: (types._sum.calc_allocated ?? 0) + noType, memberClaims: ev.calc_memberClaims, memberEntries: entries };
}

/** Lugares livres no evento (null = sem limite). Exige lockEvent antes para ser confiável. */
export async function eventFreeSeats(tx: Tx, eventId: number): Promise<number | null> {
    const ev = await tx.event.findUniqueOrThrow({ where: { id: eventId }, select: { capacity: true } });
    if (ev.capacity == null) return null;
    const o = await eventOccupancy(tx, eventId);
    return ev.capacity - o.allocated - o.memberClaims - o.memberEntries;
}

/** Reserva ingressos de um lote (lockEvent ANTES) */
export async function reserveTickets(tx: Tx, eventId: number, ticketTypeId: number | null, qty: number): Promise<void> {
    const free = await eventFreeSeats(tx, eventId);
    if (free !== null && free < qty) throw new InconsistencyError(free <= 0 ? 'Ingressos esgotados para este evento' : `Restam apenas ${free} lugar(es) neste evento`, 261115120001);
    if (ticketTypeId == null) return;
    const n = await tx.$executeRaw`UPDATE ticket_types SET calc_allocated = calc_allocated + ${qty} WHERE id = ${ticketTypeId} AND calc_allocated + ${qty} <= quantity`;
    if (n === 0) throw new InconsistencyError('Lote esgotado (ou quantidade indisponível)', 261115120002);
}

export async function releaseTickets(tx: Tx, ticketTypeId: number | null, qty: number): Promise<void> {
    if (ticketTypeId == null || qty <= 0) return;
    await tx.$executeRaw`UPDATE ticket_types SET calc_allocated = GREATEST(calc_allocated - ${qty}, 0) WHERE id = ${ticketTypeId}`;
}

export async function reserveStock(tx: Tx, variantId: number, qty: number): Promise<void> {
    const n = await tx.$executeRaw`UPDATE product_variants SET reserved = reserved + ${qty} WHERE id = ${variantId} AND stock - reserved >= ${qty}`;
    if (n === 0) throw new InconsistencyError('Produto esgotado nesta variação (ou quantidade indisponível)', 261115120003);
}

export async function releaseStock(tx: Tx, variantId: number, qty: number): Promise<void> {
    if (qty <= 0) return;
    await tx.$executeRaw`UPDATE product_variants SET reserved = GREATEST(reserved - ${qty}, 0) WHERE id = ${variantId}`;
}

/** Baixa definitiva no pagamento: sai do reservado e do estoque */
export async function commitStock(tx: Tx, variantId: number, qty: number, orderId: number): Promise<void> {
    await tx.$executeRaw`UPDATE product_variants SET reserved = GREATEST(reserved - ${qty}, 0), stock = stock - ${qty} WHERE id = ${variantId}`;
    await tx.stockMovement.create({ data: { variantId, delta: -qty, reason: 'SALE', orderId } });
}

/** Devolução ao estoque (estorno de item não entregue) */
export async function returnStock(tx: Tx, variantId: number, qty: number, orderId: number, userId?: number | null): Promise<void> {
    await tx.$executeRaw`UPDATE product_variants SET stock = stock + ${qty} WHERE id = ${variantId}`;
    await tx.stockMovement.create({ data: { variantId, delta: qty, reason: 'RETURN', orderId, userId: userId ?? null } });
}
