/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Variáveis de ambiente usadas pelas regras de negócio (web + worker)
 * Lidas sob demanda (getter) para que testes possam alterar process.env.
 */
const num = (v: string | undefined, d: number) => { const n = parseInt(v ?? '', 10); return Number.isFinite(n) ? n : d; };

export const CoreEnv = {
    get APP_URL() { return (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, ''); },
    get PAYMENTS_WEBHOOK_BASE() { return (process.env.PAYMENTS_WEBHOOK_BASE || this.APP_URL).replace(/\/+$/, ''); },
    get QR_SIGNING_SECRET() { return process.env.QR_SIGNING_SECRET ?? ''; },
    get ORDER_RESERVATION_MINUTES() { return num(process.env.ORDER_RESERVATION_MINUTES, 20); },
    get MEMBERSHIP_BILLING_DAYS_BEFORE() { return num(process.env.MEMBERSHIP_BILLING_DAYS_BEFORE, 7); },
    get MEMBERSHIP_GRACE_DAYS() { return num(process.env.MEMBERSHIP_GRACE_DAYS, 10); },
    get MEMBERSHIP_EXPIRE_DAYS() { return num(process.env.MEMBERSHIP_EXPIRE_DAYS, 60); },
    get WAITLIST_RESERVATION_HOURS() { return num(process.env.WAITLIST_RESERVATION_HOURS, 48); },
    get REDIS_URL() { return process.env.REDIS_URL ?? 'redis://localhost:6379'; },
    get LOG_LEVEL() { return process.env.LOG_LEVEL ?? 'info'; },
    get LOG_PRETTY() { return process.env.LOG_PRETTY === 'true'; },
    get GOOGLE_CHAT_WEBHOOK() { return process.env.GOOGLE_CHAT_WEBHOOK ?? ''; },
};
