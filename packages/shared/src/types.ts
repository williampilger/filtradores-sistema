/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - DTOs da API (contrato entre o servidor, o painel web e o app mobile)
 * Datas trafegam como string ISO. Dinheiro em centavos (number).
 */
import type {
    BillingPeriod, CheckInResult, DeliveryStatus, EventStatus, FulfillmentMode, MemberEventAccess, MembershipChargeStatus,
    MembershipStatus, OrderChannel, OrderItemKind, OrderStatus, PaymentMethod, PaymentStatus, PlayerPosition, PostVisibility,
    TicketOrigin, TicketStatus, WaitlistPayment, WaitlistStatus, ProductionBatchStatus,
} from './enums';
import type { Permission } from './permissions';

export type Paged<T> = { rows: T[], total: number, page: number, pageSize: number };

export type MembershipSummary = {
    id: number;
    status: MembershipStatus;
    memberNumber: number | null;
    currentPeriodEnd: string | null;
    plan: { id: number, name: string, tierLevel: number, color: string | null, eventAccess: MemberEventAccess, period: BillingPeriod, priceCents: number };
    openCharge: { id: number, amountCents: number, dueDate: string, orderId: number | null } | null;
};

export type SessionInfo = {
    user: {
        id: number; name: string; email: string; cpf: string | null; phone: string | null; birthDate: string | null;
        photoUrl: string | null; isMaster: boolean; totpEnabled: boolean; emailVerified: boolean;
    };
    roles: string[];
    permissions: Permission[];
    /** falta validar o 2FA nesta sessão */
    mfaPending: boolean;
    /** o usuário é obrigado a cadastrar 2FA (master / papel com require2fa) e ainda não cadastrou */
    mfaSetupRequired: boolean;
    membership: MembershipSummary | null;
    unreadNotifications: number;
};

export type LoginResponse = { token: string, expiresAt: string, mfaPending: boolean, mfaSetupRequired: boolean };

export type MemberCard = {
    membershipId: number;
    memberNumber: number | null;
    name: string;
    photoUrl: string | null;
    planName: string;
    planColor: string | null;
    tierLevel: number;
    status: MembershipStatus;
    validUntil: string | null;
    /** chave para gerar o QR rotativo no aparelho (ver packages/shared/src/qr.ts) */
    cardKey: string;
};

export type PlanDTO = {
    id: number; name: string; slug: string; description: string | null; tierLevel: number; priceCents: number; period: BillingPeriod;
    enrollmentFeeCents: number; storeDiscountPct: number; ticketDiscountPct: number; eventAccess: MemberEventAccess;
    benefits: string[]; color: string | null; active: boolean; sortOrder: number;
};

export type TicketTypeDTO = {
    id: number; name: string; description: string | null; priceCents: number; memberPriceCents: number | null;
    available: number; maxPerOrder: number; membersOnly: boolean; onSale: boolean; salesStartAt: string | null; salesEndAt: string | null;
};

export type EventListItem = {
    id: number; slug: string; title: string; isMatch: boolean; opponent: string | null; competition: string | null;
    venue: string | null; startsAt: string; status: EventStatus; coverUrl: string | null; fromPriceCents: number | null;
    homeScore: number | null; awayScore: number | null;
};

export type LineupDTO = {
    formation: string | null; notes: string | null; publishedAt: string | null;
    entries: { playerId: number, name: string, nickname: string | null, number: number | null, position: PlayerPosition, photoUrl: string | null, starter: boolean, slot: string | null, isCaptain: boolean }[];
};

export type EventDetail = EventListItem & {
    description: string | null; address: string | null; endsAt: string | null; gatesOpenAt: string | null;
    ticketTypes: TicketTypeDTO[];
    /** situação do usuário logado em relação ao benefício de sócio neste evento */
    memberBenefit: { access: MemberEventAccess, eligible: boolean, claimed: boolean, reason: string | null } | null;
    lineup: LineupDTO | null;
};

export type TicketDTO = {
    id: number; code: string; qr: string; status: TicketStatus; origin: TicketOrigin; holderName: string;
    ticketTypeName: string | null; usedAt: string | null;
    event: { id: number, slug: string, title: string, startsAt: string, venue: string | null };
};

export type VariantDTO = { id: number, name: string, priceCents: number, memberPriceCents: number | null, available: number, active: boolean };

export type ProductListItem = {
    id: number; slug: string; name: string; category: string | null; imageUrl: string | null; fromPriceCents: number;
    fulfillment: FulfillmentMode; waitlistEnabled: boolean; soldOut: boolean;
};

export type ProductDetail = ProductListItem & {
    description: string | null; imageUrls: string[]; waitlistPayment: WaitlistPayment; maxPerOrder: number; variants: VariantDTO[];
    openBatch: { id: number, name: string, closesAt: string | null } | null;
    /** entradas do usuário logado na lista de espera deste produto */
    myWaitlist: WaitlistEntryDTO[];
};

export type WaitlistEntryDTO = {
    id: number; status: WaitlistStatus; quantity: number; createdAt: string; reservationExpiresAt: string | null; position: number | null;
    product: { id: number, slug: string, name: string }; variant: { id: number, name: string };
    batch: { id: number, name: string, status: ProductionBatchStatus } | null;
};

export type PaymentDTO = {
    id: number; gateway: string; method: PaymentMethod; status: PaymentStatus; amountCents: number; checkoutUrl: string | null;
    pixCopiaECola: string | null; pixQrBase64: string | null; boletoUrl: string | null; expiresAt: string | null; paidAt: string | null;
};

export type OrderItemDTO = {
    id: number; kind: OrderItemKind; name: string; quantity: number; unitPriceCents: number; discountCents: number; totalCents: number;
    deliveryStatus: DeliveryStatus;
};

export type OrderDTO = {
    id: number; code: string; status: OrderStatus; channel: OrderChannel; subtotalCents: number; discountCents: number; totalCents: number;
    expiresAt: string | null; paidAt: string | null; createdAt: string; items: OrderItemDTO[]; payments: PaymentDTO[]; tickets: TicketDTO[];
};

export type ChargeDTO = { id: number, amountCents: number, dueDate: string, status: MembershipChargeStatus, periodStart: string | null, periodEnd: string | null, paidAt: string | null, orderId: number | null };

export type PostDTO = {
    id: number; title: string; body: string; imageUrls: string[]; visibility: PostVisibility; minTierLevel: number | null; pinned: boolean;
    publishedAt: string | null; author: string; event: { id: number, slug: string, title: string } | null;
    /** conteúdo bloqueado para o usuário atual (mostra só o título/teaser) */
    locked: boolean;
};

export type PlayerDTO = { id: number, name: string, nickname: string | null, number: number | null, position: PlayerPosition, photoUrl: string | null, bio: string | null, active: boolean };

export type NotificationDTO = { id: number, title: string, body: string | null, link: string | null, readAt: string | null, createdAt: string };

export type CheckInResponse = {
    result: CheckInResult;
    message: string;
    ticket?: { id: number, holderName: string, ticketTypeName: string | null, origin: TicketOrigin, usedAt: string | null };
    member?: { membershipId: number, name: string, memberNumber: number | null, planName: string, status: MembershipStatus, photoUrl: string | null, cpfMasked: string };
    counters: EventCounters;
};

export type EventCounters = { ticketsSold: number, ticketsUsed: number, memberEntries: number, capacity: number | null };

export type StaffEventDTO = { id: number, slug: string, title: string, startsAt: string, venue: string | null, status: EventStatus, counters: EventCounters };

export type PublicHome = {
    club: { name: string, shortName: string, logoUrl: string | null, primaryColor: string, secondaryColor: string, about: string | null, instagram: string | null };
    events: EventListItem[];
    plans: PlanDTO[];
    products: ProductListItem[];
    posts: PostDTO[];
};
