/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Códigos QR (ingressos e carteirinha de sócio)
 *
 * INGRESSO:   `FT1.<code>`   -> code aleatório (128 bits, base64url) gravado no Ticket. Validação = lookup no banco.
 * CARTEIRINHA: `FM1.<membershipId>.<window>.<sig>` -> QR ROTATIVO (muda a cada 30 s), evita print/foto.
 *   - window = floor(epoch_s / 30)
 *   - sig    = base64url(HMAC-SHA256(cardKey, `${membershipId}.${window}`)) truncado em 16 bytes
 *   - cardKey é DERIVADA no servidor: HMAC(QR_SIGNING_SECRET, `card:${membershipId}:${qrVersion}`)
 *     e entregue ao app do próprio sócio -> o app gera o QR mesmo OFFLINE (estádio sem sinal).
 *     Para invalidar uma carteirinha (celular perdido), incrementa-se `Membership.qrVersion`.
 *
 * Implementação em JS puro (@noble/hashes) porque roda também no React Native.
 */
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';

export const QR_WINDOW_SECONDS = 30;
/** janelas aceitas para trás/frente (relógio do celular levemente fora) */
export const QR_WINDOW_TOLERANCE = 2;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let out = '';
    let i = 0;
    for (; i + 2 < bytes.length; i += 3) {
        const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
        out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63] + alphabet[n & 63];
    }
    const rest = bytes.length - i;
    if (rest === 1) {
        const n = bytes[i] << 16;
        out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63];
    } else if (rest === 2) {
        const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
        out += alphabet[(n >> 18) & 63] + alphabet[(n >> 12) & 63] + alphabet[(n >> 6) & 63];
    }
    return out;
}

function fromB64url(s: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const bytes: number[] = [];
    let buf = 0, bits = 0;
    for (const ch of s) {
        const v = alphabet.indexOf(ch);
        if (v < 0) throw new Error('base64url inválido');
        buf = (buf << 6) | v; bits += 6;
        if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 0xff); }
    }
    return new Uint8Array(bytes);
}

export const qrWindow = (epochMs = Date.now()) => Math.floor(epochMs / 1000 / QR_WINDOW_SECONDS);

/** (servidor) chave da carteirinha derivada do segredo global */
export function deriveCardKey(secret: string, membershipId: number, qrVersion: number): string {
    return b64url(hmac(sha256, enc.encode(secret), enc.encode(`card:${membershipId}:${qrVersion}`)));
}

function sign(cardKey: string, membershipId: number, window: number): string {
    return b64url(hmac(sha256, fromB64url(cardKey), enc.encode(`${membershipId}.${window}`)).slice(0, 16));
}

/** (app) gera o conteúdo do QR da carteirinha para o instante atual */
export function buildMemberQr(cardKey: string, membershipId: number, epochMs = Date.now()): string {
    const w = qrWindow(epochMs);
    return `FM1.${membershipId}.${w}.${sign(cardKey, membershipId, w)}`;
}

export const buildTicketQr = (code: string) => `FT1.${code}`;

export type ParsedQr =
    | { kind: 'ticket', code: string }
    | { kind: 'member', membershipId: number, window: number, sig: string }
    | { kind: 'invalid' };

export function parseQr(raw: string): ParsedQr {
    const s = raw.trim();
    if (s.startsWith('FT1.')) {
        const code = s.slice(4);
        return /^[\w-]{16,64}$/.test(code) ? { kind: 'ticket', code } : { kind: 'invalid' };
    }
    if (s.startsWith('FM1.')) {
        const [, id, w, sig] = s.split('.');
        const membershipId = Number(id), window = Number(w);
        if (!Number.isInteger(membershipId) || !Number.isInteger(window) || !sig) return { kind: 'invalid' };
        return { kind: 'member', membershipId, window, sig };
    }
    return { kind: 'invalid' };
}

/** (servidor) valida assinatura e janela do QR da carteirinha */
export function verifyMemberQr(cardKey: string, q: { membershipId: number, window: number, sig: string }, epochMs = Date.now()): 'OK' | 'BAD_SIGNATURE' | 'EXPIRED' {
    const expected = sign(cardKey, q.membershipId, q.window);
    if (expected.length !== q.sig.length) return 'BAD_SIGNATURE';
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ q.sig.charCodeAt(i);
    if (diff !== 0) return 'BAD_SIGNATURE';
    if (Math.abs(qrWindow(epochMs) - q.window) > QR_WINDOW_TOLERANCE) return 'EXPIRED';
    return 'OK';
}
