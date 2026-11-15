/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Schemas Zod compartilhados (validação no servidor + formulários do web e do app)
 */
import { z } from 'zod';
import { BILLING_PERIODS, FULFILLMENT_MODES, MEMBER_EVENT_ACCESS, PAYMENT_METHODS, PLAYER_POSITIONS, POST_VISIBILITY, WAITLIST_PAYMENT, EVENT_STATUS, GATEWAY_IDS } from './enums';
import { isValidCpf, onlyDigits } from './format';

export const zodSchema_email = z.string().trim().toLowerCase().email('E-mail inválido').max(160);
export const zodSchema_password = z.string().min(8, 'A senha deve ter ao menos 8 caracteres').max(200);
export const zodSchema_cpf = z.string().transform(onlyDigits).refine(isValidCpf, 'CPF inválido');
export const zodSchema_phone = z.string().transform(onlyDigits).refine(v => v.length >= 10 && v.length <= 13, 'Telefone inválido');
export const zodSchema_name = z.string().trim().min(2, 'Nome muito curto').max(160);
export const zodSchema_cents = z.number().int().min(0);
export const zodSchema_id = z.coerce.number().int().positive();
export const zodSchema_date = z.coerce.date();
export const zodSchema_slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífen').max(100);
export const zodSchema_totp = z.string().trim().regex(/^\d{6}$/, 'Código de 6 dígitos');

// ─── Auth ───────────────────────────────────────────────────────────────────
export const zodSchema_login = z.object({ email: zodSchema_email, password: z.string().min(1).max(200), client: z.enum(['web', 'app']).default('web') });
export const zodSchema_register = z.object({
    name: zodSchema_name, email: zodSchema_email, password: zodSchema_password,
    cpf: zodSchema_cpf.optional(), phone: zodSchema_phone.optional(), client: z.enum(['web', 'app']).default('web'),
});
export const zodSchema_mfaVerify = z.object({ code: z.string().trim().min(6).max(20) }); // TOTP (6) ou código de recuperação
export const zodSchema_profile = z.object({
    name: zodSchema_name.optional(), phone: zodSchema_phone.nullable().optional(), cpf: zodSchema_cpf.nullable().optional(),
    birthDate: zodSchema_date.nullable().optional(),
});
export const zodSchema_changePassword = z.object({ currentPassword: z.string().min(1), newPassword: zodSchema_password });

// ─── Checkout ───────────────────────────────────────────────────────────────
export const zodSchema_customer = z.object({ name: zodSchema_name, email: zodSchema_email, cpf: zodSchema_cpf, phone: zodSchema_phone.optional() });

export const zodSchema_cartItem = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('TICKET'), ticketTypeId: zodSchema_id, quantity: z.number().int().min(1).max(20), holderNames: z.array(z.string().trim().max(160)).optional() }),
    z.object({ kind: z.literal('PRODUCT'), variantId: zodSchema_id, quantity: z.number().int().min(1).max(50), waitlistEntryId: zodSchema_id.optional() }),
]);
export const zodSchema_checkout = z.object({
    items: z.array(zodSchema_cartItem).min(1).max(30),
    method: z.enum(PAYMENT_METHODS),
    customer: zodSchema_customer.optional(), // logado: usa os dados do cadastro se omitido
    channel: z.enum(['WEB', 'APP']).default('WEB'),
});

// ─── Admin ──────────────────────────────────────────────────────────────────
export const zodSchema_plan = z.object({
    name: z.string().trim().min(2).max(80), slug: zodSchema_slug, description: z.string().max(5000).nullable().optional(),
    tierLevel: z.number().int().min(1).max(99), priceCents: zodSchema_cents, period: z.enum(BILLING_PERIODS),
    enrollmentFeeCents: zodSchema_cents.default(0), storeDiscountPct: z.number().int().min(0).max(100).default(0),
    ticketDiscountPct: z.number().int().min(0).max(100).default(0), eventAccess: z.enum(MEMBER_EVENT_ACCESS),
    benefits: z.array(z.string().trim().max(200)).max(30).default([]), color: z.string().max(9).nullable().optional(),
    active: z.boolean().default(true), sortOrder: z.number().int().default(0),
});

export const zodSchema_event = z.object({
    title: z.string().trim().min(2).max(160), slug: zodSchema_slug, description: z.string().max(20000).nullable().optional(),
    isMatch: z.boolean().default(true), opponent: z.string().max(120).nullable().optional(), competition: z.string().max(120).nullable().optional(),
    venue: z.string().max(160).nullable().optional(), address: z.string().max(255).nullable().optional(),
    startsAt: zodSchema_date, endsAt: zodSchema_date.nullable().optional(), gatesOpenAt: zodSchema_date.nullable().optional(),
    capacity: z.number().int().positive().nullable().optional(), memberAccess: z.boolean().default(true),
    memberCapacity: z.number().int().min(0).nullable().optional(), status: z.enum(EVENT_STATUS).default('DRAFT'),
    eligiblePlanIds: z.array(z.number().int()).default([]),
    homeScore: z.number().int().min(0).nullable().optional(), awayScore: z.number().int().min(0).nullable().optional(),
});

export const zodSchema_ticketType = z.object({
    name: z.string().trim().min(1).max(80), description: z.string().max(255).nullable().optional(), priceCents: zodSchema_cents,
    quantity: z.number().int().min(0), maxPerOrder: z.number().int().min(1).max(50).default(10),
    salesStartAt: zodSchema_date.nullable().optional(), salesEndAt: zodSchema_date.nullable().optional(),
    membersOnly: z.boolean().default(false), memberDiscount: z.boolean().default(true), active: z.boolean().default(true), sortOrder: z.number().int().default(0),
});

export const zodSchema_product = z.object({
    name: z.string().trim().min(2).max(160), slug: zodSchema_slug, description: z.string().max(20000).nullable().optional(),
    category: z.string().max(60).nullable().optional(), basePriceCents: zodSchema_cents, fulfillment: z.enum(FULFILLMENT_MODES),
    waitlistEnabled: z.boolean().default(false), waitlistPayment: z.enum(WAITLIST_PAYMENT).default('UPFRONT'),
    allowMemberDiscount: z.boolean().default(true), maxPerOrder: z.number().int().min(1).max(100).default(10),
    active: z.boolean().default(true), sortOrder: z.number().int().default(0),
});

export const zodSchema_variant = z.object({
    name: z.string().trim().min(1).max(80), sku: z.string().trim().max(60).nullable().optional(),
    priceCents: zodSchema_cents.nullable().optional(), active: z.boolean().default(true), sortOrder: z.number().int().default(0),
});

export const zodSchema_post = z.object({
    title: z.string().trim().min(2).max(200), body: z.string().max(50000), visibility: z.enum(POST_VISIBILITY),
    minTierLevel: z.number().int().min(1).nullable().optional(), pinned: z.boolean().default(false),
    published: z.boolean().default(true), eventId: z.number().int().nullable().optional(), imageKeys: z.array(z.string()).max(10).default([]),
});

export const zodSchema_player = z.object({
    name: zodSchema_name, nickname: z.string().max(60).nullable().optional(), number: z.number().int().min(0).max(99).nullable().optional(),
    position: z.enum(PLAYER_POSITIONS), birthDate: zodSchema_date.nullable().optional(), bio: z.string().max(5000).nullable().optional(),
    active: z.boolean().default(true),
});

export const zodSchema_lineup = z.object({
    formation: z.string().max(16).nullable().optional(), notes: z.string().max(5000).nullable().optional(), publish: z.boolean().default(false),
    entries: z.array(z.object({ playerId: z.number().int(), starter: z.boolean(), slot: z.string().max(16).nullable().optional(), isCaptain: z.boolean().default(false) })).max(40),
});

export const zodSchema_gatewayConfig = z.object({
    gateway: z.enum(GATEWAY_IDS), enabled: z.boolean(), sandbox: z.boolean(), priority: z.number().int().min(0).max(1000),
    methods: z.array(z.enum(PAYMENT_METHODS)),
    /** só enviado quando alterado; campos vazios mantêm o valor salvo */
    credentials: z.record(z.string(), z.string()).optional(),
});

export type CheckoutInput = z.infer<typeof zodSchema_checkout>;
export type CartItemInput = z.infer<typeof zodSchema_cartItem>;
