/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Cliente da API (front)
 *
 * ⚠️ DIRETRIZ: TODO fetch do front é feito AQUI. Componentes chamam API.<domínio>.<ação>(...).
 * `basicFetch` NUNCA lança exceção: retorna { conex, reqStat, success, data, msg }.
 * Tipos de retorno das rotas administrativas que não estão em @filt/shared ficam em ./types.ts.
 */
import { toast } from 'react-toastify';
import type {
    ChargeDTO, CheckInResponse, EventDetail, EventListItem, LoginResponse, MemberCard, NotificationDTO, OrderDTO, PaymentDTO, PaymentMethod,
    PlanDTO, PlayerDTO, PostDTO, ProductDetail, ProductListItem, PublicHome, SessionInfo, StaffEventDTO, TicketDTO, WaitlistEntryDTO, LineupDTO,
    BillingPeriod, MembershipStatus, ProductionBatchStatus,
} from '@filt/shared';
import type * as T from './types';

export type resultType<T> = { conex: boolean, reqStat: number, success: boolean, data: T, msg: string };

type FetchOptions = {
    /** exibe toast de erro (padrão: true) */
    alertError?: boolean;
    /** exibe toast de sucesso com a msg da API (padrão: false) */
    alertSuccess?: boolean;
    retryAttempts?: number;
    retryDelay_ms?: number;
    signal?: AbortSignal;
};

type Body = object | FormData | Blob | File | undefined;

export const qs = (params?: Record<string, unknown>) => {
    if (!params) return '';
    const s = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, Array.isArray(v) ? v.join(',') : String(v));
    const str = s.toString();
    return str ? `?${str}` : '';
};

/** Remove o código "261115... - " das mensagens para exibição */
export const cleanMsg = (m: string) => m.replace(/^\d{12}(:\w+)? - /, '');

async function basicFetch<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', endpoint: string, body?: Body, options: FetchOptions = {}): Promise<resultType<T>> {

    const { alertError = true, alertSuccess = false, retryAttempts = method === 'GET' ? 1 : 0, retryDelay_ms = 600 } = options;
    const isRaw = body instanceof FormData || body instanceof Blob;

    for (let attempt = 0; ; attempt++) {
        try {
            const res = await fetch(`/api/v1/${endpoint}`, {
                method,
                credentials: 'same-origin',
                headers: body && !isRaw ? { 'Content-Type': 'application/json' } : undefined,
                body: body === undefined ? undefined : isRaw ? (body as BodyInit) : JSON.stringify(body),
                signal: options.signal,
            });
            const ct = res.headers.get('content-type') ?? '';
            const data = ct.includes('application/json') ? await res.json() : await res.text();
            const msg = typeof data === 'object' && data && 'msg' in data ? String((data as { msg: string }).msg) : '';

            if (typeof window !== 'undefined' && !endpoint.startsWith('auth/')) {
                // sessão expirada -> login | 2FA pendente/obrigatório -> tela do 2FA
                if (res.status === 401) window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
                if (res.status === 403 && typeof data === 'object' && data && ('mfaPending' in data || 'mfaSetupRequired' in data)) window.location.href = `/2fa?next=${encodeURIComponent(window.location.pathname)}`;
            }
            if (!res.ok && alertError) {
                const issues = typeof data === 'object' && data && 'issues' in data ? (data as { issues: { path: string, message: string }[] }).issues : null;
                toast.error(issues?.length ? `${cleanMsg(msg)}: ${issues.map(i => `${i.path} ${i.message}`).join('; ')}` : cleanMsg(msg) || `Erro ${res.status}`);
            }
            if (res.ok && alertSuccess && msg) toast.success(cleanMsg(msg));
            return { conex: true, reqStat: res.status, success: res.ok, data: data as T, msg };
        } catch (e) {
            if ((e as Error).name === 'AbortError') return { conex: true, reqStat: 0, success: false, data: undefined as T, msg: 'cancelado' };
            if (attempt < retryAttempts) { await new Promise(r => setTimeout(r, retryDelay_ms)); continue; }
            if (alertError) toast.error('Sem conexão com o servidor');
            return { conex: false, reqStat: 0, success: false, data: undefined as T, msg: 'Sem conexão' };
        }
    }
}

const get = <R>(ep: string, o?: FetchOptions) => basicFetch<R>('GET', ep, undefined, o);
const post = <R>(ep: string, b?: Body, o?: FetchOptions) => basicFetch<R>('POST', ep, b ?? {}, o);
const put = <R>(ep: string, b?: Body, o?: FetchOptions) => basicFetch<R>('PUT', ep, b ?? {}, o);
const patch = <R>(ep: string, b?: Body, o?: FetchOptions) => basicFetch<R>('PATCH', ep, b ?? {}, o);
const del = <R>(ep: string, b?: Body, o?: FetchOptions) => basicFetch<R>('DELETE', ep, b, o);
const file = (f: File) => { const fd = new FormData(); fd.append('file', f); return fd; };

type Ok = { ok: true };
type Msg = { msg: string };

const API = {
    auth: {
        me: (o?: FetchOptions) => get<SessionInfo>('auth/me', { alertError: false, ...o }),
        login: (email: string, password: string) => post<LoginResponse>('auth/login', { email, password, client: 'web' }),
        logout: () => post<Ok>('auth/logout'),
        register: (b: { name: string, email: string, password: string, cpf?: string, phone?: string }) => post<LoginResponse>('auth/register', { ...b, client: 'web' }),
        mfaVerify: (code: string) => post<Ok>('auth/mfa/verify', { code }),
        mfaSetup: () => post<{ secret: string, otpauthUrl: string, qrDataUrl: string }>('auth/mfa/setup'),
        mfaEnable: (code: string) => post<{ recoveryCodes: string[] }>('auth/mfa/enable', { code }),
        mfaDisable: (code: string) => post<Ok>('auth/mfa/disable', { code }, { alertSuccess: true }),
        forgot: (email: string) => post<Msg>('auth/password/forgot', { email }, { alertSuccess: true }),
        reset: (token: string, password: string) => post<Msg>('auth/password/reset', { token, password }, { alertSuccess: true }),
        acceptInvite: (token: string, password: string) => post<Msg>('auth/invite/accept', { token, password }, { alertSuccess: true }),
        confirmEmail: (token: string) => post<Msg>('auth/email/confirm', { token }),
    },

    me: {
        updateProfile: (b: { name?: string, phone?: string | null, cpf?: string | null, birthDate?: string | null }) => patch<SessionInfo>('me/profile', b),
        uploadPhoto: (f: File) => post<{ photoUrl: string }>('me/photo', file(f)),
        changePassword: (currentPassword: string, newPassword: string) => post<Msg>('me/password', { currentPassword, newPassword }, { alertSuccess: true }),
        deleteAccount: (password: string) => del<Msg>('me/account', { password }),
        orders: () => get<OrderDTO[]>('me/orders'),
        tickets: (scope: 'upcoming' | 'all' = 'upcoming') => get<TicketDTO[]>(`me/tickets${qs({ scope })}`),
        card: () => get<MemberCard>('me/card', { alertError: false }),
        membership: () => get<{ membership: T.MyMembership | null, charges: ChargeDTO[] }>('me/membership'),
        join: (planId: number) => post<OrderDTO>('me/membership/join', { planId, channel: 'WEB' }),
        payCharge: (chargeId: number) => post<OrderDTO>(`me/membership/charges/${chargeId}/pay`, { channel: 'WEB' }),
        waitlist: () => get<WaitlistEntryDTO[]>('me/waitlist'),
        leaveWaitlist: (id: number) => del<Ok>(`me/waitlist/${id}`),
        notifications: () => get<NotificationDTO[]>('me/notifications'),
        readAllNotifications: () => post<Ok>('me/notifications'),
        readNotification: (id: number) => post<Ok>(`me/notifications/${id}`),
        sessions: () => get<T.SessionRow[]>('me/sessions'),
        endSession: (id: number) => del<Ok>(`me/sessions/${id}`),
        resendConfirmation: () => post<Msg>('me/email-confirmation', undefined, { alertSuccess: true }),
    },

    public: {
        home: () => get<PublicHome>('public/home'),
        events: (past = false) => get<EventListItem[]>(`events${qs({ past: past ? 1 : undefined })}`),
        event: (slug: string) => get<EventDetail>(`events/${slug}`),
        claimTicket: (slug: string) => post<TicketDTO>(`events/${slug}/claim`),
        products: () => get<ProductListItem[]>('products'),
        product: (slug: string) => get<ProductDetail>(`products/${slug}`),
        joinWaitlist: (variantId: number, quantity: number, note?: string) => post<{ id: number, msg: string }>('waitlist', { variantId, quantity, note }, { alertSuccess: true }),
        plans: () => get<PlanDTO[]>('plans'),
        feed: (page = 1) => get<PostDTO[]>(`feed${qs({ page })}`),
        squad: () => get<PlayerDTO[]>('squad'),
        paymentMethods: () => get<PaymentMethod[]>('payment-methods'),
    },

    checkout: {
        create: (b: { items: ({ kind: 'TICKET', ticketTypeId: number, quantity: number, holderNames?: string[] } | { kind: 'PRODUCT', variantId: number, quantity: number, waitlistEntryId?: number })[], method: PaymentMethod, customer?: { name: string, email: string, cpf: string, phone?: string } }) =>
            post<{ order: OrderDTO, paymentError: string | null }>('checkout', { ...b, channel: 'WEB' }),
        order: (code: string, o?: FetchOptions) => get<OrderDTO>(`orders/${code}`, o),
        pay: (code: string, method: PaymentMethod) => post<PaymentDTO>(`orders/${code}/pay`, { method }),
        cancel: (code: string) => post<Ok>(`orders/${code}/cancel`),
    },

    staff: {
        events: () => get<StaffEventDTO[]>('staff/events'),
        event: (id: number) => get<T.StaffEventPanel>(`staff/events/${id}`),
        checkin: (id: number, b: { qr?: string, ticketId?: number, membershipId?: number, deviceId?: string }) => post<CheckInResponse>(`staff/events/${id}/checkin`, b, { alertError: false }),
        search: (id: number, q: string) => get<T.AttendeeSearch>(`staff/events/${id}/search${qs({ q })}`),
        sell: (id: number, b: { lines: { ticketTypeId: number, quantity: number }[], customerName?: string, customerCpf?: string, method: 'CASH' | 'MANUAL' | 'PIX', note?: string }) => post<{ orderCode: string, totalCents: number, tickets: TicketDTO[] }>(`staff/events/${id}/sell`, b),
        checkins: (id: number) => get<T.CheckInLogRow[]>(`staff/events/${id}/checkins`),
    },

    admin: {
        dashboard: () => get<T.Dashboard>('admin/dashboard'),
        users: {
            list: (p: { q?: string, roleId?: number, staff?: 1, page?: number }) => get<T.Paged<T.UserRow>>(`admin/users${qs(p)}`),
            get: (id: number) => get<T.UserDetail>(`admin/users/${id}`),
            create: (b: { name: string, email: string, cpf?: string | null, phone?: string | null, roleIds: number[] }) => post<{ id: number, inviteUrl: string }>('admin/users', b),
            update: (id: number, b: { name?: string, cpf?: string | null, phone?: string | null, status?: 'ACTIVE' | 'BLOCKED', roleIds?: number[], overrides?: { permission: string, effect: 'GRANT' | 'DENY' }[] }) => patch<Ok>(`admin/users/${id}`, b),
            reset2fa: (id: number) => post<Msg>(`admin/users/${id}/reset-2fa`, undefined, { alertSuccess: true }),
            revokeSessions: (id: number) => post<Ok>(`admin/users/${id}/revoke-sessions`),
            resendInvite: (id: number) => post<{ url: string }>(`admin/users/${id}/invite`),
            setMembership: (id: number, b: { planId: number, status: 'ACTIVE' | 'PENDING', currentPeriodEnd: string | null }) => put<{ id: number }>(`admin/users/${id}/membership`, b),
        },
        roles: {
            list: () => get<T.RoleRow[]>('admin/roles'),
            create: (b: T.RoleInput) => post<{ id: number }>('admin/roles', b),
            update: (id: number, b: T.RoleInput) => patch<Ok>(`admin/roles/${id}`, b),
            remove: (id: number) => del<Ok>(`admin/roles/${id}`),
        },
        audit: (p: { action?: string, userId?: number, entity?: string, entityId?: string, page?: number }) => get<T.Paged<T.AuditRow>>(`admin/audit${qs(p)}`),
        settings: {
            get: () => get<T.ClubSettings>('admin/settings'),
            save: (b: Omit<T.ClubSettings, 'id' | 'logoKey' | 'logoUrl' | 'updatedAt'>) => put<Ok>('admin/settings', b, { alertSuccess: false }),
            uploadLogo: (f: File) => post<{ logoUrl: string }>('admin/settings/logo', file(f)),
        },
        upload: (folder: 'posts' | 'products' | 'events' | 'players', f: File) => post<{ key: string, url: string }>(`admin/uploads${qs({ folder })}`, file(f)),
        plans: {
            list: () => get<(PlanDTO & { activeMembers: number })[]>('admin/plans'),
            create: (b: T.PlanInput) => post<PlanDTO>('admin/plans', b),
            update: (id: number, b: Partial<T.PlanInput>) => patch<PlanDTO>(`admin/plans/${id}`, b),
            remove: (id: number) => del<Ok>(`admin/plans/${id}`),
        },
        members: {
            list: (p: { status?: MembershipStatus, planId?: number, q?: string, page?: number }) => get<T.Paged<T.MemberRow>>(`admin/members${qs(p)}`),
            get: (id: number) => get<T.MemberDetail>(`admin/members/${id}`),
            cancel: (id: number, reason: string) => post<Ok>(`admin/members/${id}/cancel`, { reason }),
            rotateCard: (id: number) => post<Msg>(`admin/members/${id}/rotate-card`, undefined, { alertSuccess: true }),
            createCharge: (id: number, b: { amountCents?: number, dueDate?: string }) => post<{ id: number }>(`admin/members/${id}/charges`, b),
            payChargeManual: (chargeId: number, method: 'CASH' | 'MANUAL', note?: string) => post<{ orderCode: string }>(`admin/charges/${chargeId}/pay-manual`, { method, note }),
            cancelCharge: (chargeId: number) => post<Ok>(`admin/charges/${chargeId}/cancel`),
        },
        events: {
            list: (past = false) => get<T.AdminEventRow[]>(`admin/events${qs({ past: past ? 1 : undefined })}`),
            get: (id: number) => get<T.AdminEventDetail>(`admin/events/${id}`),
            create: (b: T.EventInput) => post<{ id: number }>('admin/events', b),
            update: (id: number, b: Partial<T.EventInput>) => patch<Ok>(`admin/events/${id}`, b),
            remove: (id: number) => del<Ok>(`admin/events/${id}`),
            uploadCover: (id: number, f: File) => post<{ coverUrl: string }>(`admin/events/${id}/cover`, file(f)),
            createTicketType: (id: number, b: T.TicketTypeInput) => post<{ id: number }>(`admin/events/${id}/ticket-types`, b),
            updateTicketType: (typeId: number, b: Partial<T.TicketTypeInput>) => patch<Ok>(`admin/ticket-types/${typeId}`, b),
            removeTicketType: (typeId: number) => del<Ok>(`admin/ticket-types/${typeId}`),
            courtesy: (id: number, b: { ticketTypeId?: number | null, reason: string, holders: { name: string, email?: string, cpf?: string }[], userEmail?: string }) => post<{ orderCode: string }>(`admin/events/${id}/courtesy`, b),
            tickets: (id: number, p: { q?: string, origin?: string, status?: string, page?: number }) => get<T.Paged<T.AdminTicketRow>>(`admin/events/${id}/tickets${qs(p)}`),
            cancelTicket: (ticketId: number, reason: string) => post<Ok>(`admin/tickets/${ticketId}/cancel`, { reason }),
            staff: (id: number) => get<{ id: number, name: string, email: string }[]>(`admin/events/${id}/staff`),
            setStaff: (id: number, userIds: number[]) => put<Ok>(`admin/events/${id}/staff`, { userIds }),
            lineup: (id: number) => get<LineupDTO | null>(`admin/events/${id}/lineup`),
            saveLineup: (id: number, b: { formation?: string | null, notes?: string | null, publish: boolean, entries: { playerId: number, starter: boolean, slot?: string | null, isCaptain: boolean }[] }) => put<Ok>(`admin/events/${id}/lineup`, b),
        },
        products: {
            list: () => get<T.AdminProductRow[]>('admin/products'),
            get: (id: number) => get<T.AdminProductDetail>(`admin/products/${id}`),
            create: (b: T.ProductInput & { variants?: T.VariantInput[] }) => post<{ id: number }>('admin/products', b),
            update: (id: number, b: Partial<T.ProductInput>) => patch<Ok>(`admin/products/${id}`, b),
            remove: (id: number) => del<Ok>(`admin/products/${id}`),
            addImage: (id: number, f: File) => post<{ key: string, url: string }>(`admin/products/${id}/images`, file(f)),
            removeImage: (id: number, key: string) => del<Ok>(`admin/products/${id}/images${qs({ key })}`),
            reorderImages: (id: number, keys: string[]) => put<Ok>(`admin/products/${id}/images`, { keys }),
            createVariant: (id: number, b: T.VariantInput) => post<{ id: number }>(`admin/products/${id}/variants`, b),
            updateVariant: (variantId: number, b: Partial<T.VariantInput>) => patch<Ok>(`admin/variants/${variantId}`, b),
            stockMovements: (variantId: number) => get<T.StockMovementRow[]>(`admin/variants/${variantId}/stock`),
            adjustStock: (variantId: number, b: { delta: number, reason: 'RESTOCK' | 'ADJUST', note?: string }) => post<Ok>(`admin/variants/${variantId}/stock`, b),
            createBatch: (id: number, b: { name: string, minQuantity?: number | null, closesAt?: string | null, notes?: string | null }) => post<{ id: number }>(`admin/products/${id}/batches`, b),
            batch: (batchId: number) => get<T.BatchDetail>(`admin/batches/${batchId}`),
            setBatchStatus: (batchId: number, status: ProductionBatchStatus) => post<Ok>(`admin/batches/${batchId}/status`, { status }),
        },
        waitlist: {
            list: (p: { productId?: number, status?: string }) => get<T.WaitlistRow[]>(`admin/waitlist${qs(p)}`),
            remove: (id: number) => del<Ok>(`admin/waitlist/${id}`),
        },
        orders: {
            list: (p: { status?: string, channel?: string, q?: string, delivery?: 'pending', page?: number }) => get<T.Paged<T.OrderRow>>(`admin/orders${qs(p)}`),
            get: (id: number) => get<T.AdminOrderDetail>(`admin/orders/${id}`),
            cancel: (id: number) => post<Ok>(`admin/orders/${id}/cancel`),
            manualPayment: (id: number, method: 'CASH' | 'MANUAL', note?: string) => post<PaymentDTO>(`admin/orders/${id}/manual-payment`, { method, note }),
            setDelivery: (itemId: number, status: 'PENDING' | 'READY_FOR_PICKUP' | 'DELIVERED') => post<Ok>(`admin/order-items/${itemId}/delivery`, { status }),
        },
        payments: {
            list: (p: { status?: string, gateway?: string, from?: string, to?: string, attention?: 1, page?: number }) => get<T.Paged<T.PaymentRow> & { totals: T.PaymentTotals[] }>(`admin/payments${qs(p)}`),
            refund: (id: number, b: { amountCents?: number, reason: string }) => post<Msg>(`admin/payments/${id}/refund`, b, { alertSuccess: true }),
        },
        gateways: {
            list: () => get<T.GatewayRow[]>('admin/gateways'),
            save: (gateway: string, b: { enabled: boolean, sandbox: boolean, priority: number, methods: PaymentMethod[], credentials?: Record<string, string> }) => put<Ok>(`admin/gateways/${gateway}`, b),
        },
        posts: {
            list: () => get<(PostDTO & { imageKeys: string[], published: boolean })[]>('admin/posts'),
            create: (b: T.PostInput) => post<{ id: number }>('admin/posts', b),
            update: (id: number, b: Partial<T.PostInput>) => patch<Ok>(`admin/posts/${id}`, b),
            remove: (id: number) => del<Ok>(`admin/posts/${id}`),
        },
        players: {
            list: () => get<PlayerDTO[]>('admin/players'),
            create: (b: T.PlayerInput) => post<PlayerDTO>('admin/players', b),
            update: (id: number, b: Partial<T.PlayerInput>) => patch<PlayerDTO>(`admin/players/${id}`, b),
            remove: (id: number) => del<Ok>(`admin/players/${id}`),
            uploadPhoto: (id: number, f: File) => post<{ photoUrl: string }>(`admin/players/${id}/photo`, file(f)),
        },
    },
};

export type { BillingPeriod };
export default API;
