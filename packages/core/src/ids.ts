/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Geração de códigos aleatórios
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';

/** código do ingresso: 128 bits base64url (22 caracteres) */
export const newTicketCode = () => randomBytes(16).toString('base64url');

/** código legível do pedido (sem caracteres ambíguos 0/O/1/I) */
export function newOrderCode(len = 8): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < len; i++) s += alphabet[randomInt(alphabet.length)];
    return s;
}

export const newToken = () => randomBytes(32).toString('base64url');
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
export const newIdempotencyKey = () => randomBytes(16).toString('hex');
