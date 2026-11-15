/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Armazenamento seguro (Keychain/Keystore): token da sessão, id do aparelho e cache da carteirinha
 */
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import type { MemberCard } from '@filt/shared';

const KEYS = {
    token: 'filt.session.token',
    deviceId: 'filt.device.id',
    card: 'filt.member.card',
} as const;

// cache em memória: evita ir ao Keychain a cada requisição
let tokenCache: string | null | undefined;

export async function getToken(): Promise<string | null> {
    if (tokenCache !== undefined) return tokenCache;
    try { tokenCache = await SecureStore.getItemAsync(KEYS.token); } catch { tokenCache = null; }
    return tokenCache;
}

export async function setToken(token: string | null): Promise<void> {
    tokenCache = token;
    try {
        if (token) await SecureStore.setItemAsync(KEYS.token, token);
        else await SecureStore.deleteItemAsync(KEYS.token);
    } catch { /* aparelho sem keychain disponível: segue só com a memória */ }
}

/** Identificador aleatório e persistente do aparelho (enviado no check-in da portaria) */
export async function getDeviceId(): Promise<string> {
    try {
        const saved = await SecureStore.getItemAsync(KEYS.deviceId);
        if (saved) return saved;
        const id = Crypto.randomUUID();
        await SecureStore.setItemAsync(KEYS.deviceId, id);
        return id;
    } catch {
        return Crypto.randomUUID();
    }
}

/** Carteirinha em cache: o QR rotativo funciona OFFLINE no ginásio (o app gera o código com a cardKey) */
export async function getCachedCard(): Promise<MemberCard | null> {
    try {
        const raw = await SecureStore.getItemAsync(KEYS.card);
        return raw ? (JSON.parse(raw) as MemberCard) : null;
    } catch { return null; }
}

export async function setCachedCard(card: MemberCard | null): Promise<void> {
    try {
        if (card) await SecureStore.setItemAsync(KEYS.card, JSON.stringify(card));
        else await SecureStore.deleteItemAsync(KEYS.card);
    } catch { /* ignora */ }
}
