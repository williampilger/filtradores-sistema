/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Criptografia simétrica (AES-256-GCM) para credenciais dos gateways e segredos TOTP.
 * Formato: [versão 1B][iv 12B][tag 16B][ciphertext]
 * ⚠️ Trocar a ENCRYPTION_KEY torna ilegíveis TODAS as credenciais e segredos 2FA salvos.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 1;

function getKey(): Buffer {
    const raw = process.env.ENCRYPTION_KEY ?? '';
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) throw new Error('261115000010 - ENCRYPTION_KEY inválida: esperado 32 bytes em base64');
    return key;
}

/** Retorna Uint8Array<ArrayBuffer> (tipo exigido pelos campos Bytes do Prisma) */
export function encrypt(plain: Buffer | string): Uint8Array<ArrayBuffer> {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
    const data = Buffer.concat([cipher.update(typeof plain === 'string' ? Buffer.from(plain, 'utf8') : plain), cipher.final()]);
    return new Uint8Array(Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), data]));
}

export function decrypt(payload: Buffer | Uint8Array): Buffer {
    const buf = Buffer.from(payload);
    if (buf[0] !== VERSION) throw new Error('261115000011 - Versão de criptografia desconhecida');
    const iv = buf.subarray(1, 13);
    const tag = buf.subarray(13, 29);
    const decipher = createDecipheriv('aes-256-gcm', getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(buf.subarray(29)), decipher.final()]);
}

export const decryptString = (payload: Buffer | Uint8Array) => decrypt(payload).toString('utf8');
