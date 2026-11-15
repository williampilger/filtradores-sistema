/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Testes das regras de cobrança / formatação
 */
import { describe, expect, it } from 'vitest';
import { addMonths, applyDiscount, membershipStatusAt, renewalPeriod, shouldGenerateRenewal } from '../src/billing';
import { isValidCpf, parseMoneyToCents, slugify } from '../src/format';

const d = (s: string) => new Date(`${s}T12:00:00Z`);

describe('períodos', () => {
    it('addMonths preserva o fim do mês', () => {
        expect(addMonths(d('2026-01-31'), 1).toISOString().slice(0, 10)).toBe('2026-02-28');
        expect(addMonths(d('2028-01-31'), 1).toISOString().slice(0, 10)).toBe('2028-02-29');
        expect(addMonths(d('2026-11-15'), 12).toISOString().slice(0, 10)).toBe('2027-11-15');
    });
    it('renovação antecipada não perde dias; atrasada começa hoje', () => {
        expect(renewalPeriod(d('2026-11-10'), d('2026-11-15'), 'MONTHLY').end.toISOString().slice(0, 10)).toBe('2026-12-15');
        expect(renewalPeriod(d('2026-11-20'), d('2026-11-15'), 'MONTHLY').start.toISOString().slice(0, 10)).toBe('2026-11-20');
    });
    it('status por datas (carência e expiração)', () => {
        const base = { status: 'ACTIVE' as const, currentPeriodEnd: d('2026-11-01'), graceDays: 10, expireDays: 60 };
        expect(membershipStatusAt({ ...base, now: d('2026-11-05') })).toBe('ACTIVE');
        expect(membershipStatusAt({ ...base, now: d('2026-11-20') })).toBe('OVERDUE');
        expect(membershipStatusAt({ ...base, now: d('2027-02-01') })).toBe('EXPIRED');
        expect(membershipStatusAt({ ...base, status: 'CANCELED', now: d('2026-11-05') })).toBe('CANCELED');
    });
    it('gera renovação N dias antes', () => {
        expect(shouldGenerateRenewal(d('2026-11-07'), d('2026-11-15'), 7)).toBe(false);
        expect(shouldGenerateRenewal(d('2026-11-08'), d('2026-11-15'), 7)).toBe(true);
    });
});

describe('dinheiro e formatos', () => {
    it('desconto arredonda a favor do clube', () => {
        expect(applyDiscount(1999, 10)).toBe(1800);
        expect(applyDiscount(1000, 0)).toBe(1000);
        expect(applyDiscount(1000, 150)).toBe(0);
    });
    it('parseMoney', () => {
        expect(parseMoneyToCents('R$ 1.234,50')).toBe(123450);
        expect(parseMoneyToCents('12.5')).toBe(1250);
        expect(parseMoneyToCents('abc')).toBe(null);
    });
    it('CPF', () => {
        expect(isValidCpf('529.982.247-25')).toBe(true);
        expect(isValidCpf('111.111.111-11')).toBe(false);
        expect(isValidCpf('529.982.247-24')).toBe(false);
    });
    it('slugify', () => expect(slugify('Filtradores x Grêmio São José!')).toBe('filtradores-x-gremio-sao-jose'));
});
