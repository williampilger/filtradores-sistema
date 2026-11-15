/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 2FA TOTP (RFC 6238 - Google Authenticator, Authy, 1Password...)
 */
import 'server-only';
import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import ENV from './environmentConstants';

export const newTotpSecret = () => new OTPAuth.Secret({ size: 20 }).base32;

const totpFor = (secret: string, label: string) => new OTPAuth.TOTP({ issuer: ENV.TOTP_ISSUER, label, algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });

/** aceita ±1 janela (30 s) */
export const verifyTotp = (secret: string, code: string) => totpFor(secret, 'x').validate({ token: code.replace(/\s/g, ''), window: 1 }) !== null;

export async function totpSetupPayload(secret: string, email: string) {
    const uri = totpFor(secret, email).toString();
    return { secret, otpauthUrl: uri, qrDataUrl: await QRCode.toDataURL(uri, { margin: 1, width: 240 }) };
}

/** 10 códigos de recuperação (exibidos UMA vez) */
export async function newRecoveryCodes(): Promise<{ plain: string[], hashes: string[] }> {
    const plain = Array.from({ length: 10 }, () => randomBytes(5).toString('hex').toUpperCase().replace(/(.{5})/, '$1-'));
    const hashes = await Promise.all(plain.map(c => hash(c, { algorithm: 2 })));
    return { plain, hashes };
}

export const verifyRecoveryCode = (hashValue: string, code: string) => verify(hashValue, code.trim().toUpperCase()).catch(() => false);
