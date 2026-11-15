/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Testes do QR rotativo da carteirinha
 */
import { describe, expect, it } from 'vitest';
import { QR_WINDOW_SECONDS, buildMemberQr, buildTicketQr, deriveCardKey, parseQr, verifyMemberQr } from '../src/qr';

const SECRET = 'segredo-de-teste';

describe('QR da carteirinha', () => {
    const key = deriveCardKey(SECRET, 42, 1);
    const now = Date.UTC(2026, 10, 15, 12, 0, 0);

    it('gera e valida no mesmo instante', () => {
        const p = parseQr(buildMemberQr(key, 42, now));
        expect(p.kind).toBe('member');
        if (p.kind !== 'member') return;
        expect(p.membershipId).toBe(42);
        expect(verifyMemberQr(key, p, now)).toBe('OK');
    });
    it('aceita pequena diferença de relógio e expira depois', () => {
        const p = parseQr(buildMemberQr(key, 42, now));
        if (p.kind !== 'member') throw new Error();
        expect(verifyMemberQr(key, p, now + 2 * QR_WINDOW_SECONDS * 1000)).toBe('OK');
        expect(verifyMemberQr(key, p, now + 5 * QR_WINDOW_SECONDS * 1000)).toBe('EXPIRED');
    });
    it('rejeita assinatura de outra versão (carteirinha invalidada) ou adulterada', () => {
        const p = parseQr(buildMemberQr(key, 42, now));
        if (p.kind !== 'member') throw new Error();
        expect(verifyMemberQr(deriveCardKey(SECRET, 42, 2), p, now)).toBe('BAD_SIGNATURE');
        expect(verifyMemberQr(key, { ...p, membershipId: 43 }, now)).toBe('BAD_SIGNATURE');
    });
    it('ingresso e lixo', () => {
        expect(parseQr(buildTicketQr('abcdefghijklmnopqrstuv'))).toEqual({ kind: 'ticket', code: 'abcdefghijklmnopqrstuv' });
        expect(parseQr('https://exemplo.com').kind).toBe('invalid');
        expect(parseQr('FT1.x').kind).toBe('invalid');
    });
});
