/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Redis (cache de sessão, rate limit e filas). Tolerante a indisponibilidade: o cache é opcional.
 */
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { QUEUES } from '@filt/shared';
import { CoreEnv } from './env';

const g = globalThis as unknown as { __filtRedis?: Redis, __filtQueues?: Record<string, Queue> };

export function getRedis(): Redis {
    if (!g.__filtRedis) {
        g.__filtRedis = new Redis(CoreEnv.REDIS_URL, { maxRetriesPerRequest: null, enableOfflineQueue: true });
        g.__filtRedis.on('error', () => { /* logado pelo ioredis; o cache é opcional */ });
    }
    return g.__filtRedis;
}

/** Cache JSON com fallback silencioso (Redis fora do ar = sempre MISS) */
export const cache = {
    async get<T>(key: string): Promise<T | null> {
        const r = getRedis();
        if (r.status !== 'ready') return null;
        try { const v = await r.get(key); return v ? JSON.parse(v) as T : null; } catch { return null; }
    },
    async set(key: string, value: unknown, ttlSeconds: number) {
        const r = getRedis();
        if (r.status !== 'ready') return;
        try { await r.set(key, JSON.stringify(value), 'EX', ttlSeconds); } catch { /* ignora */ }
    },
    async del(...keys: string[]) {
        const r = getRedis();
        if (r.status !== 'ready' || !keys.length) return;
        try { await r.del(...keys); } catch { /* ignora */ }
    },
    /** contador com janela (rate limit). Redis fora do ar = não limita. */
    async hit(key: string, windowSeconds: number): Promise<number> {
        const r = getRedis();
        if (r.status !== 'ready') return 0;
        try {
            const n = await r.incr(key);
            if (n === 1) await r.expire(key, windowSeconds);
            return n;
        } catch { return 0; }
    },
};

export function getQueue(name: keyof typeof QUEUES): Queue {
    g.__filtQueues ??= {};
    const q = QUEUES[name];
    if (!g.__filtQueues[q]) g.__filtQueues[q] = new Queue(q, { connection: getRedis() });
    return g.__filtQueues[q];
}
