/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Conversão de registros do banco para os DTOs da API (@filt/shared/types)
 */
import { prisma, type Prisma, type MembershipPlan, type Payment, type Player, type TicketType, type Membership } from '@filt/db';
import { StorageSystem } from '@filt/integrations/storage';
import {
    applyDiscount, buildTicketQr, type EventListItem, type LineupDTO, type OrderDTO, type PaymentDTO, type PlanDTO, type PlayerDTO,
    type PostDTO, type ProductListItem, type TicketDTO, type TicketTypeDTO, type VariantDTO, type WaitlistEntryDTO,
} from '@filt/shared';

const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;
const strArr = (j: unknown): string[] => (Array.isArray(j) ? j.filter((x): x is string => typeof x === 'string') : []);

export const toPlanDTO = (p: MembershipPlan): PlanDTO => ({
    id: p.id, name: p.name, slug: p.slug, description: p.description, tierLevel: p.tierLevel, priceCents: p.priceCents, period: p.period,
    enrollmentFeeCents: p.enrollmentFeeCents, storeDiscountPct: p.storeDiscountPct, ticketDiscountPct: p.ticketDiscountPct,
    eventAccess: p.eventAccess, benefits: strArr(p.benefits), color: p.color, active: p.active, sortOrder: p.sortOrder,
});

export const toPaymentDTO = (p: Payment): PaymentDTO => ({
    id: p.id, gateway: p.gateway, method: p.method, status: p.status, amountCents: p.amountCents, checkoutUrl: p.checkoutUrl,
    pixCopiaECola: p.pixCopiaECola, pixQrBase64: p.pixQrBase64, boletoUrl: p.boletoUrl, expiresAt: iso(p.expiresAt), paidAt: iso(p.paidAt),
});

type TicketFull = Prisma.TicketGetPayload<{ include: { Event: true, TicketType: true } }>;
export const toTicketDTO = (t: TicketFull): TicketDTO => ({
    id: t.id, code: t.code, qr: buildTicketQr(t.code), status: t.status, origin: t.origin, holderName: t.holderName,
    ticketTypeName: t.TicketType?.name ?? (t.origin === 'MEMBER_CLAIM' ? 'Sócio' : t.origin === 'COURTESY' ? 'Cortesia' : null), usedAt: iso(t.usedAt),
    event: { id: t.Event.id, slug: t.Event.slug, title: t.Event.title, startsAt: t.Event.startsAt.toISOString(), venue: t.Event.venue },
});

export const ORDER_INCLUDE = {
    Items: { include: { Tickets: { include: { Event: true, TicketType: true } } } },
    Payments: { orderBy: { id: 'desc' } },
} satisfies Prisma.OrderInclude;
type OrderFull = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export const toOrderDTO = (o: OrderFull): OrderDTO => ({
    id: o.id, code: o.code, status: o.status, channel: o.channel, subtotalCents: o.subtotalCents, discountCents: o.discountCents,
    totalCents: o.totalCents, expiresAt: iso(o.expiresAt), paidAt: iso(o.paidAt), createdAt: o.createdAt.toISOString(),
    items: o.Items.map(i => ({ id: i.id, kind: i.kind, name: i.ref_name, quantity: i.quantity, unitPriceCents: i.unitPriceCents, discountCents: i.discountCents, totalCents: i.totalCents, deliveryStatus: i.deliveryStatus })),
    payments: o.Payments.map(toPaymentDTO),
    tickets: o.Items.flatMap(i => i.Tickets.map(toTicketDTO)),
});

type EventWithTypes = Prisma.EventGetPayload<{ include: { TicketTypes: true } }>;
export const toEventListItem = (e: EventWithTypes): EventListItem => {
    const prices = e.TicketTypes.filter(t => t.active).map(t => t.priceCents);
    return {
        id: e.id, slug: e.slug, title: e.title, isMatch: e.isMatch, opponent: e.opponent, competition: e.competition, venue: e.venue,
        startsAt: e.startsAt.toISOString(), status: e.status, coverUrl: StorageSystem.url(e.coverKey),
        fromPriceCents: prices.length ? Math.min(...prices) : null, homeScore: e.homeScore, awayScore: e.awayScore,
    };
};

export function toTicketTypeDTO(t: TicketType, plan: MembershipPlan | null, now = new Date()): TicketTypeDTO {
    const available = Math.max(0, t.quantity - t.calc_allocated);
    const onSale = t.active && available > 0 && (!t.salesStartAt || t.salesStartAt <= now) && (!t.salesEndAt || t.salesEndAt >= now);
    return {
        id: t.id, name: t.name, description: t.description, priceCents: t.priceCents,
        memberPriceCents: plan && t.memberDiscount && plan.ticketDiscountPct > 0 ? applyDiscount(t.priceCents, plan.ticketDiscountPct) : null,
        available, maxPerOrder: t.maxPerOrder, membersOnly: t.membersOnly, onSale, salesStartAt: iso(t.salesStartAt), salesEndAt: iso(t.salesEndAt),
    };
}

type ProductFull = Prisma.ProductGetPayload<{ include: { Variants: true } }>;
export function toProductListItem(p: ProductFull): ProductListItem {
    const vs = p.Variants.filter(v => v.active);
    const images = strArr(p.imageKeys);
    const soldOut = p.fulfillment === 'STOCK' && !vs.some(v => v.stock - v.reserved > 0);
    return {
        id: p.id, slug: p.slug, name: p.name, category: p.category, imageUrl: StorageSystem.url(images[0]),
        fromPriceCents: vs.length ? Math.min(...vs.map(v => v.priceCents ?? p.basePriceCents)) : p.basePriceCents,
        fulfillment: p.fulfillment, waitlistEnabled: p.waitlistEnabled, soldOut,
    };
}

export function toVariantDTOs(p: ProductFull, plan: MembershipPlan | null): VariantDTO[] {
    return p.Variants.filter(v => v.active).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map(v => {
        const price = v.priceCents ?? p.basePriceCents;
        return {
            id: v.id, name: v.name, priceCents: price, active: v.active,
            memberPriceCents: plan && p.allowMemberDiscount && plan.storeDiscountPct > 0 ? applyDiscount(price, plan.storeDiscountPct) : null,
            available: p.fulfillment === 'STOCK' ? Math.max(0, v.stock - v.reserved) : 999,
        };
    });
}

export const productImageUrls = (p: { imageKeys: unknown }) => strArr(p.imageKeys).map(k => StorageSystem.url(k)!);

type WaitFull = Prisma.WaitlistEntryGetPayload<{ include: { Product: true, Variant: true, Batch: true } }>;
export async function toWaitlistDTOs(rows: WaitFull[]): Promise<WaitlistEntryDTO[]> {
    return Promise.all(rows.map(async e => ({
        id: e.id, status: e.status, quantity: e.quantity, createdAt: e.createdAt.toISOString(), reservationExpiresAt: iso(e.reservationExpiresAt),
        position: e.status === 'WAITING' ? (await prisma.waitlistEntry.count({ where: { variantId: e.variantId, status: 'WAITING', createdAt: { lt: e.createdAt } } })) + 1 : null,
        product: { id: e.Product.id, slug: e.Product.slug, name: e.Product.name }, variant: { id: e.Variant.id, name: e.Variant.name },
        batch: e.Batch ? { id: e.Batch.id, name: e.Batch.name, status: e.Batch.status } : null,
    })));
}

export const toPlayerDTO = (p: Player): PlayerDTO => ({ id: p.id, name: p.name, nickname: p.nickname, number: p.number, position: p.position, photoUrl: StorageSystem.url(p.photoKey), bio: p.bio, active: p.active });

type LineupFull = Prisma.LineupGetPayload<{ include: { Entries: { include: { Player: true } } } }>;
export const toLineupDTO = (l: LineupFull): LineupDTO => ({
    formation: l.formation, notes: l.notes, publishedAt: iso(l.publishedAt),
    entries: l.Entries.sort((a, b) => Number(b.starter) - Number(a.starter) || a.sortOrder - b.sortOrder).map(e => ({
        playerId: e.playerId, name: e.Player.name, nickname: e.Player.nickname, number: e.Player.number, position: e.Player.position,
        photoUrl: StorageSystem.url(e.Player.photoKey), starter: e.starter, slot: e.slot, isCaptain: e.isCaptain,
    })),
});

type PostFull = Prisma.PostGetPayload<{ include: { Author: { select: { name: true } }, Event: { select: { id: true, slug: true, title: true } } } }>;
/** Regras do feed "prime": PUBLIC todos | MEMBERS sócio ativo | MIN_TIER sócio ativo com nível >= minTierLevel */
export function canSeePost(p: { visibility: string, minTierLevel: number | null }, viewer: { membership: (Membership & { Plan: MembershipPlan }) | null, isStaff: boolean }): boolean {
    if (p.visibility === 'PUBLIC' || viewer.isStaff) return true;
    const m = viewer.membership;
    if (!m || m.status !== 'ACTIVE') return false;
    if (p.visibility === 'MEMBERS') return true;
    return m.Plan.tierLevel >= (p.minTierLevel ?? 1);
}
export function toPostDTO(p: PostFull, visible: boolean): PostDTO {
    return {
        id: p.id, title: p.title, body: visible ? p.body : p.body.slice(0, 140) + (p.body.length > 140 ? '…' : ''),
        imageUrls: visible ? strArr(p.imageKeys).map(k => StorageSystem.url(k)!) : [], visibility: p.visibility, minTierLevel: p.minTierLevel,
        pinned: p.pinned, publishedAt: iso(p.publishedAt), author: p.Author.name, event: p.Event, locked: !visible,
    };
}
