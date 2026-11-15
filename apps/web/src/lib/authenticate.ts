/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Autenticação (sessão opaca + 2FA) e autorização (permissões granulares)
 *
 * SESSÃO:
 *  - Token aleatório (32 bytes) no cookie httpOnly `SSID` (web) ou `Authorization: Bearer <token>` (app mobile).
 *  - No banco guardamos apenas o sha256 do token (UserSession.tokenHash).
 *  - Expiração DESLIZANTE: cada uso renova `expiresAt` (gravação no banco no máx. a cada 5 min).
 *  - AuthInfo fica em cache no Redis por 30 s.
 *
 * 2FA:
 *  - Usuário com TOTP ativo: o login cria a sessão com `mfaPending = true` até validar o código.
 *  - Master (sempre) e papéis com `require2fa`: enquanto não cadastrar o TOTP, só acessa as rotas de cadastro do 2FA.
 *
 * AUTORIZAÇÃO (`route()`):
 *  - perm: exige UMA das permissões (catálogo em @filt/shared/permissions). Sem permissão -> 404 (esconde a rota).
 *  - master: apenas o master.
 *  - Permissões de evento podem estar restritas a eventos (EventStaff) -> `assertEventAccess`.
 */
import 'server-only';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma, Prisma } from '@filt/db';
import { AuthError, cache, ForbiddenError, GenericError, LogSystem, NotFoundError, sha256 } from '@filt/core';
import { EVENT_SCOPED_PERMISSIONS, resolvePermissions, type Permission } from '@filt/shared';
import ENV from './environmentConstants';
import { json } from './http';

export const SESSION_COOKIE = 'SSID';

export type AuthInfo = {
    sessionId: number;
    client: string;
    user: { id: number, name: string, email: string, isMaster: boolean, totpEnabled: boolean };
    roles: string[];
    permissions: Permission[];
    mfaPending: boolean;
    mfaSetupRequired: boolean;
    /** null = sem restrição; senão, ids dos eventos onde as permissões de evento valem */
    eventScope: number[] | null;
};

const authCacheKey = (tokenHash: string) => `auth:${tokenHash}`;

// ─── Sessões ────────────────────────────────────────────────────────────────

export function clientIp(req: NextRequest): string | null {
    return (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
}

export async function createSession(userId: number, req: NextRequest, opts: { mfaPending: boolean, client: string }): Promise<{ token: string, expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + ENV.SESSION_MAX_AGE_DAYS * 86_400_000);
    await prisma.userSession.create({
        data: {
            userId, tokenHash: sha256(token), expiresAt, mfaPending: opts.mfaPending, client: opts.client.slice(0, 16),
            ip: clientIp(req), userAgent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
        },
    });
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    return { token, expiresAt };
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: ENV.COOKIE_SECURE, sameSite: 'lax', path: '/', expires: expiresAt });
}

export function clearSessionCookie(res: NextResponse) {
    res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: ENV.COOKIE_SECURE, sameSite: 'lax', path: '/', maxAge: 0 });
}

export function readToken(req?: NextRequest | null, cookieValue?: string): string | null {
    const bearer = req?.headers.get('authorization');
    if (bearer?.startsWith('Bearer ')) return bearer.slice(7).trim();
    return cookieValue ?? req?.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export async function revokeSessionByToken(token: string) {
    const tokenHash = sha256(token);
    await prisma.userSession.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
    await cache.del(authCacheKey(tokenHash));
}

/** Invalida o cache de AuthInfo (após mudar papéis/permissões/2FA) e, opcionalmente, encerra as sessões */
export async function invalidateUserAuth(userId: number, opts: { revoke?: boolean, exceptSessionId?: number } = {}) {
    const sessions = await prisma.userSession.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, tokenHash: true } });
    if (opts.revoke) {
        await prisma.userSession.updateMany({ where: { userId, revokedAt: null, id: opts.exceptSessionId ? { not: opts.exceptSessionId } : undefined }, data: { revokedAt: new Date() } });
    }
    await cache.del(...sessions.map(s => authCacheKey(s.tokenHash)));
}

export async function markSessionMfaOk(sessionId: number) {
    const s = await prisma.userSession.update({ where: { id: sessionId }, data: { mfaPending: false } });
    await cache.del(authCacheKey(s.tokenHash));
}

async function loadAuthInfo(tokenHash: string): Promise<AuthInfo | null> {
    const cached = await cache.get<AuthInfo & { exp: number }>(authCacheKey(tokenHash));
    if (cached && cached.exp > Date.now()) return cached;

    const session = await prisma.userSession.findUnique({
        where: { tokenHash },
        include: { User: { include: { Roles: { include: { Role: { include: { Permissions: true } } } }, Overrides: true, EventStaff: { select: { eventId: true } } } } },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
    const u = session.User;
    if (u.deletedAt || u.status !== 'ACTIVE') return null;

    if (Date.now() - session.lastSeenAt.getTime() > 5 * 60_000) {
        await prisma.userSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + ENV.SESSION_MAX_AGE_DAYS * 86_400_000) } });
    }

    const totpEnabled = !!u.totpEnabledAt;
    const requires2fa = u.isMaster || u.Roles.some(r => r.Role.require2fa);
    const info: AuthInfo = {
        sessionId: session.id,
        client: session.client,
        user: { id: u.id, name: u.name, email: u.email, isMaster: u.isMaster, totpEnabled },
        roles: u.Roles.map(r => r.Role.name),
        permissions: resolvePermissions({ isMaster: u.isMaster, rolePermissions: u.Roles.flatMap(r => r.Role.Permissions.map(p => p.permission)), overrides: u.Overrides }),
        mfaPending: session.mfaPending,
        mfaSetupRequired: requires2fa && !totpEnabled,
        eventScope: !u.isMaster && u.EventStaff.length ? u.EventStaff.map(e => e.eventId) : null,
    };
    await cache.set(authCacheKey(tokenHash), { ...info, exp: Math.min(Date.now() + 30_000, session.expiresAt.getTime()) }, 30);
    return info;
}

/** Sessão do request atual (route handlers) ou dos cookies (server components) */
export async function getAuth(req?: NextRequest | null): Promise<AuthInfo | null> {
    let cookieValue: string | undefined;
    if (!req) cookieValue = (await cookies()).get(SESSION_COOKIE)?.value;
    const token = readToken(req, cookieValue);
    if (!token) return null;
    return loadAuthInfo(sha256(token));
}

// ─── Autorização ────────────────────────────────────────────────────────────

export const can = (auth: AuthInfo | null, ...perms: Permission[]) => !!auth && (auth.user.isMaster || perms.some(p => auth.permissions.includes(p)));
export const isStaff = (auth: AuthInfo | null) => !!auth && (auth.user.isMaster || auth.permissions.length > 0);

/** Permissão de evento respeitando a restrição por EventStaff */
export function canOnEvent(auth: AuthInfo, eventId: number, ...perms: Permission[]): boolean {
    if (!can(auth, ...perms)) return false;
    if (!auth.eventScope) return true;
    // só restringe as permissões "de evento"; quem tem events.write (gestão) vê tudo
    if (can(auth, 'events.write')) return true;
    return perms.every(p => !EVENT_SCOPED_PERMISSIONS.includes(p)) || auth.eventScope.includes(eventId);
}

export function assertEventAccess(auth: AuthInfo, eventId: number, ...perms: Permission[]) {
    if (!canOnEvent(auth, eventId, ...perms)) throw new NotFoundError('Evento não encontrado', 261115200001);
}

export type RouteOptions = {
    /** 'user' (padrão) exige sessão; 'optional' carrega se houver; 'none' ignora */
    auth?: 'none' | 'optional' | 'user';
    /** exige UMA das permissões */
    perm?: Permission | Permission[];
    master?: boolean;
    /** rota acessível com 2FA pendente / cadastro de 2FA obrigatório (login, 2FA, /me) */
    allowMfaPending?: boolean;
};

export type RouteCtx<P, A> = { req: NextRequest, params: P, auth: A, reqId: string, ip: string | null };

type AuthFor<O extends RouteOptions> = O['auth'] extends 'none' ? null : O['auth'] extends 'optional' ? AuthInfo | null : AuthInfo;

/**
 * Wrapper de TODAS as route handlers da API.
 * - Manutenção, autenticação, 2FA, permissões
 * - Erros: ZodError -> 422 | GenericError -> status próprio | Prisma P2002 -> 409 | P2025 -> 404 | outros -> 500
 * - Retornar um objeto qualquer = 200 JSON
 */
export function route<P extends Record<string, string | string[]> = Record<string, string>, O extends RouteOptions = RouteOptions>(opts: O, handler: (ctx: RouteCtx<P, AuthFor<O>>) => Promise<Response | unknown>) {

    return async (req: NextRequest, segment: { params: Promise<P> }): Promise<Response> => {
        const t0 = Date.now();
        const reqId = randomBytes(6).toString('hex');
        let userId: number | undefined;

        try {
            if (ENV.SERVER_UNDER_MAINTENANCE) return json({ msg: '261115200002 - Sistema em manutenção. Tente novamente em instantes.' }, 503);

            const params = (await segment?.params) ?? ({} as P);
            let auth: AuthInfo | null = null;

            if (opts.auth !== 'none') {
                auth = await getAuth(req);
                if (auth) userId = auth.user.id;
                if (!auth && opts.auth !== 'optional') throw new AuthError('Sessão inválida ou expirada', 261115200003);
                if (auth && !opts.allowMfaPending && (auth.mfaPending || auth.mfaSetupRequired)) {
                    if (opts.auth === 'optional') auth = null; // trata como anônimo até concluir o 2FA
                    else return json({ msg: auth.mfaPending ? '261115200004 - Confirme o código de verificação (2FA)' : '261115200005 - Cadastre a verificação em duas etapas (2FA) para continuar', mfaPending: auth.mfaPending, mfaSetupRequired: auth.mfaSetupRequired }, 403);
                }
                if (opts.master && !auth?.user.isMaster) throw new NotFoundError('Não encontrado', 261115200006);
                if (opts.perm) {
                    const perms = Array.isArray(opts.perm) ? opts.perm : [opts.perm];
                    if (!can(auth, ...perms)) {
                        LogSystem.warn(261115200007, `Acesso negado (${perms.join('|')}): ${req.nextUrl.pathname}`, { reqId, userId });
                        throw new NotFoundError('Não encontrado', 261115200007);
                    }
                }
            }

            const result = await handler({ req, params, auth: auth as AuthFor<O>, reqId, ip: clientIp(req) });
            const res = result instanceof Response ? result : json(result ?? { ok: true });
            LogSystem.debug(261115200008, `${req.method} ${req.nextUrl.pathname} ${res.status} ${Date.now() - t0}ms`, { reqId, userId });
            return res;

        } catch (e) {
            const ctx = { reqId, userId, url: `${req.method} ${req.nextUrl.pathname}` };

            if (e instanceof ZodError) {
                LogSystem.warn(261115200009, `Validação: ${e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`, ctx);
                return json({ msg: '261115200009 - Dados inválidos', issues: e.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }, 422);
            }
            if (e instanceof GenericError) {
                if (e.status >= 500) LogSystem.error(e.code, e.message, ctx);
                else LogSystem.warn(e.code, e.message, ctx);
                return json({ msg: `${e.code} - ${e.message}` }, e.status);
            }
            if (e instanceof Prisma.PrismaClientKnownRequestError) {
                if (e.code === 'P2002') return json({ msg: '261115200010 - Registro duplicado (já existe um cadastro com estes dados)' }, 409);
                if (e.code === 'P2025') return json({ msg: '261115200011 - Registro não encontrado' }, 404);
                if (e.code === 'P2003') return json({ msg: '261115200012 - Registro em uso por outros cadastros' }, 409);
            }

            LogSystem.ERROR(261115200013, `Erro não tratado: ${e instanceof Error ? `${e.message}\n${e.stack}` : String(e)}`, ctx);
            if (ENV.SUPPRESS_RESPONSE_ERROR_MESSAGES) return json({ msg: `261115200013:${reqId} - Erro interno. Contate o suporte informando este código.` }, 500);
            return json({ msg: `261115200013:${reqId} - ${e instanceof Error ? e.message : 'Erro interno'}`, stack: e instanceof Error ? e.stack : undefined }, 500);
        }
    };
}

export { ForbiddenError };
