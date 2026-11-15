/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Enums de domínio (espelham os enums do Prisma; usados também pelo app mobile,
 *              que não pode importar o @filt/db)
 *
 * ⚠️ Ao alterar um enum no schema.prisma, alterar AQUI também (o typecheck do web acusa divergências
 *    nos pontos onde os tipos se cruzam).
 */

export const USER_STATUS = ['ACTIVE', 'BLOCKED'] as const;
export type UserStatus = (typeof USER_STATUS)[number];

export const BILLING_PERIODS = ['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'YEARLY'] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const MEMBER_EVENT_ACCESS = ['NONE', 'CLAIM', 'AUTOMATIC'] as const;
export type MemberEventAccess = (typeof MEMBER_EVENT_ACCESS)[number];

export const MEMBERSHIP_STATUS = ['PENDING', 'ACTIVE', 'OVERDUE', 'CANCELED', 'EXPIRED'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUS)[number];

export const CHARGE_STATUS = ['OPEN', 'PAID', 'CANCELED', 'OVERDUE'] as const;
export type MembershipChargeStatus = (typeof CHARGE_STATUS)[number];

export const EVENT_STATUS = ['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELED'] as const;
export type EventStatus = (typeof EVENT_STATUS)[number];

export const TICKET_STATUS = ['VALID', 'USED', 'CANCELED', 'REFUNDED'] as const;
export type TicketStatus = (typeof TICKET_STATUS)[number];

export const TICKET_ORIGIN = ['SALE', 'COURTESY', 'MEMBER_CLAIM', 'MANUAL'] as const;
export type TicketOrigin = (typeof TICKET_ORIGIN)[number];

export const CHECKIN_RESULT = ['OK', 'ALREADY_USED', 'INVALID', 'WRONG_EVENT', 'CANCELED', 'MEMBER_INACTIVE', 'NOT_ELIGIBLE', 'EXPIRED_CODE', 'CAPACITY_FULL'] as const;
export type CheckInResult = (typeof CHECKIN_RESULT)[number];

export const FULFILLMENT_MODES = ['STOCK', 'ON_DEMAND'] as const;
export type FulfillmentMode = (typeof FULFILLMENT_MODES)[number];

export const WAITLIST_PAYMENT = ['UPFRONT', 'ON_RELEASE'] as const;
export type WaitlistPayment = (typeof WAITLIST_PAYMENT)[number];

export const PRODUCTION_BATCH_STATUS = ['OPEN', 'CLOSED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELED'] as const;
export type ProductionBatchStatus = (typeof PRODUCTION_BATCH_STATUS)[number];

export const WAITLIST_STATUS = ['WAITING', 'NOTIFIED', 'CONVERTED', 'EXPIRED', 'CANCELED'] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUS)[number];

export const ORDER_CHANNEL = ['WEB', 'APP', 'POS'] as const;
export type OrderChannel = (typeof ORDER_CHANNEL)[number];

export const ORDER_STATUS = ['PENDING_PAYMENT', 'PAID', 'CANCELED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED'] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const ORDER_ITEM_KIND = ['TICKET', 'PRODUCT', 'MEMBERSHIP', 'PREORDER'] as const;
export type OrderItemKind = (typeof ORDER_ITEM_KIND)[number];

export const DELIVERY_STATUS = ['NOT_APPLICABLE', 'PENDING', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELED'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUS)[number];

export const PAYMENT_METHODS = ['PIX', 'CARD', 'BOLETO', 'CHECKOUT', 'CASH', 'MANUAL', 'COURTESY'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Métodos que o torcedor escolhe no checkout (os demais são de uso interno) */
export const PUBLIC_PAYMENT_METHODS: PaymentMethod[] = ['PIX', 'CARD', 'BOLETO', 'CHECKOUT'];

export const PAYMENT_STATUS = ['PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CHARGEBACK'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const GATEWAY_IDS = ['stripe', 'mercadopago', 'pagseguro', 'asaas', 'manual', 'courtesy'] as const;
export type GatewayId = (typeof GATEWAY_IDS)[number];
/** Gateways externos (exigem credenciais). manual/courtesy são internos, sempre disponíveis. */
export const EXTERNAL_GATEWAYS: GatewayId[] = ['stripe', 'mercadopago', 'pagseguro', 'asaas'];

export const POST_VISIBILITY = ['PUBLIC', 'MEMBERS', 'MIN_TIER'] as const;
export type PostVisibility = (typeof POST_VISIBILITY)[number];

/** Futsal: GK goleiro | DF fixo | MF ala | FW pivô (códigos genéricos mantidos para servir a outras modalidades) */
export const PLAYER_POSITIONS = ['GK', 'DF', 'MF', 'FW', 'STAFF'] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

/** Rótulos PT-BR (painel web e app) */
export const LABELS = {
    membershipStatus: { PENDING: 'Aguardando pagamento', ACTIVE: 'Ativo', OVERDUE: 'Inadimplente', CANCELED: 'Cancelado', EXPIRED: 'Expirado' },
    chargeStatus: { OPEN: 'Em aberto', PAID: 'Paga', CANCELED: 'Cancelada', OVERDUE: 'Vencida' },
    billingPeriod: { MONTHLY: 'Mensal', QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral', YEARLY: 'Anual' },
    eventStatus: { DRAFT: 'Rascunho', PUBLISHED: 'Publicado', CLOSED: 'Encerrado', CANCELED: 'Cancelado' },
    ticketStatus: { VALID: 'Válido', USED: 'Utilizado', CANCELED: 'Cancelado', REFUNDED: 'Reembolsado' },
    ticketOrigin: { SALE: 'Venda', COURTESY: 'Cortesia', MEMBER_CLAIM: 'Sócio', MANUAL: 'Portaria' },
    memberEventAccess: { NONE: 'Sem acesso', CLAIM: 'Resgate no app', AUTOMATIC: 'Entrada com a carteirinha' },
    checkInResult: {
        OK: 'Entrada liberada', ALREADY_USED: 'Já utilizado', INVALID: 'Código inválido', WRONG_EVENT: 'Ingresso de outro evento',
        CANCELED: 'Ingresso cancelado', MEMBER_INACTIVE: 'Sócio inativo/inadimplente', NOT_ELIGIBLE: 'Plano sem acesso a este evento',
        EXPIRED_CODE: 'QR expirado (peça para atualizar a tela)', CAPACITY_FULL: 'Capacidade esgotada',
    },
    orderStatus: { PENDING_PAYMENT: 'Aguardando pagamento', PAID: 'Pago', CANCELED: 'Cancelado', EXPIRED: 'Expirado', REFUNDED: 'Reembolsado', PARTIALLY_REFUNDED: 'Reembolso parcial' },
    orderChannel: { WEB: 'Site', APP: 'App', POS: 'Portaria/PDV' },
    deliveryStatus: { NOT_APPLICABLE: '-', PENDING: 'A separar', IN_PRODUCTION: 'Em produção', READY_FOR_PICKUP: 'Pronto p/ retirada', DELIVERED: 'Entregue', CANCELED: 'Cancelado' },
    paymentMethod: { PIX: 'PIX', CARD: 'Cartão', BOLETO: 'Boleto', CHECKOUT: 'Checkout do gateway', CASH: 'Dinheiro', MANUAL: 'Manual', COURTESY: 'Cortesia' },
    paymentStatus: { PENDING: 'Pendente', AUTHORIZED: 'Autorizado', PAID: 'Pago', FAILED: 'Recusado', CANCELED: 'Cancelado', EXPIRED: 'Expirado', REFUNDED: 'Estornado', PARTIALLY_REFUNDED: 'Estorno parcial', CHARGEBACK: 'Chargeback' },
    gateway: { stripe: 'Stripe', mercadopago: 'Mercado Pago', pagseguro: 'PagSeguro (PagBank)', asaas: 'Asaas', manual: 'Manual', courtesy: 'Cortesia', demo: 'Demonstração (simulado)' } as Record<string, string>,
    fulfillment: { STOCK: 'Pronta entrega (estoque)', ON_DEMAND: 'Sob encomenda' },
    waitlistPayment: { UPFRONT: 'Paga ao entrar na lista', ON_RELEASE: 'Paga quando ficar pronto' },
    waitlistStatus: { WAITING: 'Na fila', NOTIFIED: 'Chamado (aguardando compra)', CONVERTED: 'Comprou', EXPIRED: 'Expirou', CANCELED: 'Cancelado' },
    batchStatus: { OPEN: 'Aberto (recebendo pedidos)', CLOSED: 'Fechado', IN_PRODUCTION: 'Em produção', READY: 'Pronto', DELIVERED: 'Entregue', CANCELED: 'Cancelado' },
    postVisibility: { PUBLIC: 'Público', MEMBERS: 'Somente sócios', MIN_TIER: 'Sócios a partir de um nível' },
    playerPosition: { GK: 'Goleiro', DF: 'Fixo', MF: 'Ala', FW: 'Pivô', STAFF: 'Comissão técnica' },
} as const;

/** Campos de credencial de cada gateway externo (tela Admin > Gateways). secret = nunca devolvido ao front. */
export const GATEWAY_CREDENTIAL_FIELDS: Record<string, { key: string, label: string, secret: boolean, required: boolean }[]> = {
    stripe: [
        { key: 'secretKey', label: 'Secret key (sk_test_... / sk_live_...)', secret: true, required: true },
        { key: 'webhookSecret', label: 'Webhook signing secret (whsec_...)', secret: true, required: true },
    ],
    mercadopago: [
        { key: 'accessToken', label: 'Access Token (TEST-... / APP_USR-...)', secret: true, required: true },
        { key: 'webhookSecret', label: 'Assinatura secreta do webhook', secret: true, required: true },
    ],
    pagseguro: [
        { key: 'token', label: 'Token da conta PagBank', secret: true, required: true },
        { key: 'webhookToken', label: 'Token do webhook (vazio = o mesmo token)', secret: true, required: false },
    ],
    asaas: [
        { key: 'apiKey', label: 'Chave de API ($aact_...)', secret: true, required: true },
        { key: 'webhookToken', label: 'Token de autenticação do webhook', secret: true, required: true },
    ],
};

/** Métodos suportados por cada gateway (padrão sugerido na tela) */
export const GATEWAY_METHODS: Record<GatewayId, PaymentMethod[]> = {
    stripe: ['CARD', 'PIX', 'CHECKOUT'],
    mercadopago: ['PIX', 'CARD', 'CHECKOUT'],
    pagseguro: ['PIX', 'CARD', 'BOLETO', 'CHECKOUT'],
    asaas: ['PIX', 'BOLETO', 'CARD', 'CHECKOUT'],
    manual: ['CASH', 'MANUAL', 'PIX'],
    courtesy: ['COURTESY'],
};
