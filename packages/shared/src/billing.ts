/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Regras puras de cobrança de sócios e de preço (testadas em test/billing.test.ts)
 */
import type { BillingPeriod, MembershipStatus } from './enums';

export const PERIOD_MONTHS: Record<BillingPeriod, number> = { MONTHLY: 1, QUARTERLY: 3, SEMIANNUAL: 6, YEARLY: 12 };

/** Soma N meses preservando o dia (31/01 + 1 mês = 28/02 ou 29/02) */
export function addMonths(date: Date, months: number): Date {
    const d = new Date(date.getTime());
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, lastDay));
    return d;
}

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);

export function nextPeriodEnd(from: Date, period: BillingPeriod): Date {
    return addMonths(from, PERIOD_MONTHS[period]);
}

/**
 * Novo período ao pagar uma cobrança:
 *  - se o vínculo ainda está vigente (periodEnd no futuro) -> renova a partir do fim atual (não perde dias)
 *  - senão -> começa hoje
 */
export function renewalPeriod(now: Date, currentPeriodEnd: Date | null, period: BillingPeriod): { start: Date, end: Date } {
    const start = currentPeriodEnd && currentPeriodEnd > now ? currentPeriodEnd : now;
    return { start, end: nextPeriodEnd(start, period) };
}

/** Situação do vínculo em função das datas (o worker aplica diariamente) */
export function membershipStatusAt(input: {
    now: Date, status: MembershipStatus, currentPeriodEnd: Date | null, graceDays: number, expireDays: number,
}): MembershipStatus {
    const { now, status, currentPeriodEnd, graceDays, expireDays } = input;
    if (status === 'CANCELED' || status === 'PENDING' || status === 'EXPIRED' || !currentPeriodEnd) return status;
    if (now <= addDays(currentPeriodEnd, graceDays)) return 'ACTIVE';
    if (now <= addDays(currentPeriodEnd, graceDays + expireDays)) return 'OVERDUE';
    return 'EXPIRED';
}

/** A cobrança de renovação deve ser gerada? (N dias antes do fim do período) */
export const shouldGenerateRenewal = (now: Date, currentPeriodEnd: Date, daysBefore: number) => now >= addDays(currentPeriodEnd, -daysBefore);

/** Aplica desconto percentual (inteiro 0-100) em centavos, arredondando a favor do clube */
export const applyDiscount = (cents: number, percent: number) => Math.max(0, Math.ceil(cents * (100 - Math.min(100, Math.max(0, percent))) / 100));
