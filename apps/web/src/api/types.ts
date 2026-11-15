/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Tipos das respostas das rotas administrativas/staff (as públicas estão em @filt/shared/types)
 * Datas chegam como string ISO.
 */
import type {
    BillingPeriod, CheckInResult, DeliveryStatus, EventCounters, EventStatus, FulfillmentMode, MemberEventAccess, MembershipChargeStatus, MembershipStatus,
    OrderChannel, OrderItemKind, OrderStatus, PaymentMethod, PaymentStatus, PlanDTO, PlayerPosition, PostVisibility, ProductionBatchStatus,
    ProductListItem, TicketDTO, TicketOrigin, TicketStatus, TicketTypeDTO, WaitlistPayment, WaitlistStatus,
} from '@filt/shared';

export type Paged<T> = { rows: T[], total: number, page: number, pageSize: number };

export type MyMembership = { id: number, status: MembershipStatus, memberNumber: number | null, startedAt: string | null, currentPeriodEnd: string | null, plan: PlanDTO };
export type SessionRow = { id: number, client: string, ip: string | null, userAgent: string | null, lastSeenAt: string, createdAt: string, current: boolean };

export type StaffEventPanel = {
    id: number, slug: string, title: string, startsAt: string, venue: string | null, status: EventStatus, capacity: number | null, memberCapacity: number | null,
    counters: EventCounters,
    ticketTypes: (TicketTypeDTO & { quantity: number, allocated: number })[],
    ticketsByOrigin: Partial<Record<TicketOrigin, number>>,
    checkinsByResult?: Partial<Record<CheckInResult, number>>,
};
export type AttendeeSearch = {
    tickets: { id: number, holderName: string, cpfMasked: string, ticketTypeName: string | null, status: TicketStatus, origin: TicketOrigin, usedAt: string | null }[];
    members: { membershipId: number, name: string, memberNumber: number | null, planName: string, status: MembershipStatus, cpfMasked: string, photoUrl: string | null }[];
};
export type CheckInLogRow = { id: string, result: CheckInResult, label: string, createdAt: string, operator: string, name: string | null, kind: 'ticket' | 'member' | null, deviceId: string | null };

export type Dashboard = {
    members?: Partial<Record<MembershipStatus, number>>;
    upcomingEvents?: { id: number, title: string, startsAt: string, status: EventStatus, capacity: number | null, _count: { Tickets: number } }[];
    ordersPending?: number; itemsToDeliver?: number; waitlistWaiting?: number;
    revenueMonth?: { gateway: string, cents: number }[]; paymentsToRefund?: number;
};

export type UserRow = {
    id: number, name: string, email: string, cpf: string | null, phone: string | null, isMaster: boolean, status: 'ACTIVE' | 'BLOCKED', totpEnabled: boolean,
    invitePending: boolean, lastLoginAt: string | null, createdAt: string, roles: { id: number, name: string }[],
    membership: { status: MembershipStatus, plan: string, memberNumber: number | null } | null,
};
export type UserDetail = {
    id: number, name: string, email: string, cpf: string | null, phone: string | null, birthDate: string | null, photoUrl: string | null, isMaster: boolean,
    status: 'ACTIVE' | 'BLOCKED', totpEnabled: boolean, emailVerified: boolean, invitePending: boolean, lastLoginAt: string | null, createdAt: string, activeSessions: number,
    roleIds: number[], overrides: { permission: string, effect: 'GRANT' | 'DENY' }[], eventStaff: { id: number, title: string, startsAt: string }[],
    membership: { id: number, status: MembershipStatus, planId: number, planName: string, memberNumber: number | null, currentPeriodEnd: string | null } | null,
};
export type RoleRow = { id: number, key: string | null, name: string, description: string | null, require2fa: boolean, permissions: string[], users: number };
export type RoleInput = { name: string, description?: string | null, require2fa: boolean, permissions: string[] };
export type AuditRow = { id: string, action: string, entity: string | null, entityId: string | null, data: unknown, ip: string | null, createdAt: string, user: string | null };
export type ClubSettings = {
    id: number, name: string, shortName: string, city: string | null, about: string | null, logoKey: string | null, logoUrl: string | null, primaryColor: string, secondaryColor: string,
    contactEmail: string | null, contactPhone: string | null, instagram: string | null, pickupInfo: string | null, termsText: string | null, updatedAt: string,
};

export type PlanInput = {
    name: string, slug: string, description?: string | null, tierLevel: number, priceCents: number, period: BillingPeriod, enrollmentFeeCents: number,
    storeDiscountPct: number, ticketDiscountPct: number, eventAccess: MemberEventAccess, benefits: string[], color?: string | null, active: boolean, sortOrder: number,
};
export type MemberRow = {
    id: number, userId: number, name: string, email: string, cpf: string | null, phone: string | null, memberNumber: number | null, status: MembershipStatus,
    plan: string, planId: number, startedAt: string | null, currentPeriodEnd: string | null, openChargesCents: number,
};
export type MemberDetail = {
    id: number, status: MembershipStatus, memberNumber: number | null, startedAt: string | null, currentPeriodStart: string | null, currentPeriodEnd: string | null,
    canceledAt: string | null, cancelReason: string | null, qrVersion: number, plan: PlanDTO,
    user: { id: number, name: string, email: string, cpf: string | null, phone: string | null, photoUrl: string | null },
    charges: {
        id: number, amountCents: number, dueDate: string, status: MembershipChargeStatus, isEnrollment: boolean, periodStart: string | null, periodEnd: string | null, paidAt: string | null,
        orders: { id: number, code: string, status: OrderStatus, payments: { id: number, gateway: string, method: PaymentMethod, status: PaymentStatus, amountCents: number }[] }[];
    }[];
    entries: { event: { id: number, title: string, startsAt: string }, at: string }[];
};

export type EventInput = {
    title: string, slug: string, description?: string | null, isMatch: boolean, opponent?: string | null, competition?: string | null, venue?: string | null, address?: string | null,
    startsAt: string, endsAt?: string | null, gatesOpenAt?: string | null, capacity?: number | null, memberAccess: boolean, memberCapacity?: number | null, status: EventStatus,
    eligiblePlanIds: number[], homeScore?: number | null, awayScore?: number | null,
};
export type TicketTypeInput = {
    name: string, description?: string | null, priceCents: number, quantity: number, maxPerOrder: number, salesStartAt?: string | null, salesEndAt?: string | null,
    membersOnly: boolean, memberDiscount: boolean, active: boolean, sortOrder: number,
};
export type AdminEventRow = { id: number, slug: string, title: string, opponent: string | null, startsAt: string, venue: string | null, status: EventStatus, capacity: number | null, tickets: number, memberEntries: number, lineupPublished: boolean };
export type AdminTicketType = TicketTypeInput & { id: number, eventId: number, calc_allocated: number, available: number };
export type AdminEventDetail = Omit<EventInput, 'eligiblePlanIds'> & {
    id: number, coverKey: string | null, coverUrl: string | null, calc_memberClaims: number, eligiblePlanIds: number[], counters: EventCounters, ticketTypes: AdminTicketType[],
    createdAt: string, updatedAt: string,
};
export type AdminTicketRow = { id: number, holderName: string, cpf: string | null, ticketType: string | null, origin: TicketOrigin, status: TicketStatus, usedAt: string | null, createdAt: string, orderCode: string | null, issuedBy: string | null, courtesyReason: string | null };

export type ProductInput = {
    name: string, slug: string, description?: string | null, category?: string | null, basePriceCents: number, fulfillment: FulfillmentMode, waitlistEnabled: boolean,
    waitlistPayment: WaitlistPayment, allowMemberDiscount: boolean, maxPerOrder: number, active: boolean, sortOrder: number,
};
export type VariantInput = { name: string, sku?: string | null, priceCents?: number | null, active: boolean, sortOrder: number };
export type AdminProductRow = ProductListItem & { active: boolean, stock: number, reserved: number, waitlist: number, waitlistPayment: WaitlistPayment };
export type AdminVariant = VariantInput & { id: number, productId: number, stock: number, reserved: number, available: number, waitlistQty: number };
export type AdminBatch = { id: number, productId: number, name: string, minQuantity: number | null, closesAt: string | null, status: ProductionBatchStatus, notes: string | null, createdAt: string };
export type AdminProductDetail = ProductInput & { id: number, images: { key: string, url: string }[], variants: AdminVariant[], batches: AdminBatch[], createdAt: string };
export type StockMovementRow = { id: number, delta: number, reason: string, note: string | null, orderId: number | null, user: string | null, createdAt: string };
export type BatchDetail = {
    id: number, name: string, status: ProductionBatchStatus, minQuantity: number | null, closesAt: string | null, notes: string | null,
    product: { id: number, name: string, waitlistPayment: WaitlistPayment },
    summary: { variantId: number, name: string, paid: number, waitlist: number }[];
    orders: { itemId: number, orderCode: string, orderStatus: OrderStatus, customer: string, phone: string | null, variant: string | undefined, quantity: number, deliveryStatus: DeliveryStatus }[];
    waitlist: { id: number, name: string, email: string, phone: string | null, variant: string, quantity: number, status: WaitlistStatus, createdAt: string, reservationExpiresAt: string | null }[];
};
export type WaitlistRow = {
    id: number, product: string, productId: number, variant: string, quantity: number, status: WaitlistStatus, batch: string | null, name: string, email: string,
    phone: string | null, createdAt: string, notifiedAt: string | null, reservationExpiresAt: string | null, note: string | null,
};

export type OrderRow = {
    id: number, code: string, status: OrderStatus, channel: OrderChannel, customerName: string, customerEmail: string | null, totalCents: number, refundedCents: number,
    createdAt: string, paidAt: string | null, items: string, lastPayment: { gateway: string, method: PaymentMethod, status: PaymentStatus } | null, pendingDelivery: number,
};
export type AdminOrderDetail = {
    id: number, code: string, status: OrderStatus, channel: OrderChannel, subtotalCents: number, discountCents: number, totalCents: number, refundedCents: number,
    customer: { name: string, email: string | null, cpf: string | null, phone: string | null }, user: { id: number, name: string, email: string } | null, createdBy: string | null,
    notes: string | null, expiresAt: string | null, paidAt: string | null, canceledAt: string | null, createdAt: string,
    items: { id: number, kind: OrderItemKind, name: string, quantity: number, unitPriceCents: number, discountCents: number, totalCents: number, deliveryStatus: DeliveryStatus, deliveredAt: string | null, tickets: TicketDTO[] }[];
    payments: {
        id: number, gateway: string, method: PaymentMethod, status: PaymentStatus, amountCents: number, refundedCents: number, externalId: string | null, paidAt: string | null,
        createdAt: string, note: string | null, registeredBy: string | null, refunds: { id: number, amountCents: number, reason: string | null, status: string, by: string | null, createdAt: string }[];
    }[];
};
export type PaymentRow = {
    id: number, gateway: string, method: PaymentMethod, status: PaymentStatus, amountCents: number, refundedCents: number, externalId: string | null, createdAt: string,
    paidAt: string | null, note: string | null, registeredBy: string | null, order: { id: number, code: string, customerName: string };
};
export type PaymentTotals = { status: PaymentStatus, count: number, amountCents: number, refundedCents: number };
export type GatewayRow = {
    gateway: string, enabled: boolean, sandbox: boolean, priority: number, updatedAt: string, methods: PaymentMethod[], supportedMethods: PaymentMethod[],
    fields: { key: string, label: string, secret: boolean, required: boolean, filled: boolean }[], webhookUrl: string;
};
export type PostInput = { title: string, body: string, visibility: PostVisibility, minTierLevel?: number | null, pinned: boolean, published: boolean, eventId?: number | null, imageKeys: string[] };
export type PlayerInput = { name: string, nickname?: string | null, number?: number | null, position: PlayerPosition, birthDate?: string | null, bio?: string | null, active: boolean };
