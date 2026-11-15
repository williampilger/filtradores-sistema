/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Sistema de logs (ver docs/1-LogLevels.md)
 *
 * Assinatura: LogSystem.<nível>(código, mensagem, ctx?)
 *  - código: timestamp YYMMDDHHmmss de quando a linha foi escrita (o MESMO usado na resposta da API)
 *  - INFO / ERROR / fatal também notificam via Google Chat
 * O nome do app (filt-web | filt-worker) vem de LOG_APP_NAME (definido no início de cada app).
 */
import pino from 'pino';
import { CoreEnv } from './env';

export type LogCtx = { reqId?: string, userId?: number, url?: string, [k: string]: unknown };

const appName = () => process.env.LOG_APP_NAME ?? 'filt';

const g = globalThis as unknown as { __filtLogger?: pino.Logger };
function base(): pino.Logger {
    if (!g.__filtLogger) {
        g.__filtLogger = pino({
            level: CoreEnv.LOG_LEVEL,
            base: { app: appName() },
            transport: CoreEnv.LOG_PRETTY ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } : undefined,
        });
    }
    return g.__filtLogger;
}

async function notify(level: string, code: number, msg: string, ctx?: LogCtx) {
    const hook = CoreEnv.GOOGLE_CHAT_WEBHOOK;
    if (!hook) return;
    try {
        await fetch(hook, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: `*[${appName()}] ${level}* ${code} - ${msg}${ctx?.userId ? ` (user ${ctx.userId})` : ''}${ctx?.url ? `\n${ctx.url}` : ''}` }),
            signal: AbortSignal.timeout(5000),
        });
    } catch { /* best-effort */ }
}

export const LogSystem = {
    trace: (code: number, msg: string, ctx?: LogCtx) => base().trace({ code, ...ctx }, msg),
    debug: (code: number, msg: string, ctx?: LogCtx) => base().debug({ code, ...ctx }, msg),
    info: (code: number, msg: string, ctx?: LogCtx) => base().info({ code, ...ctx }, msg),
    INFO: (code: number, msg: string, ctx?: LogCtx) => { base().info({ code, ...ctx }, msg); void notify('INFO', code, msg, ctx); },
    warn: (code: number, msg: string, ctx?: LogCtx) => base().warn({ code, ...ctx }, msg),
    error: (code: number, msg: string, ctx?: LogCtx) => base().error({ code, ...ctx }, msg),
    ERROR: (code: number, msg: string, ctx?: LogCtx) => { base().error({ code, ...ctx }, msg); void notify('ERROR', code, msg, ctx); },
    fatal: (code: number, msg: string, ctx?: LogCtx) => { base().fatal({ code, ...ctx }, msg); void notify('FATAL', code, msg, ctx); },
};
