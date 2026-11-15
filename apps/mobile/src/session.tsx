/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Sessão do usuário (token no SecureStore + GET auth/me)
 *
 * Estados:
 *  - loading : lendo o token / consultando o servidor
 *  - anon    : sem login (o app funciona para conteúdo público)
 *  - auth    : logado (session preenchida)
 *  - offline : há token, mas o servidor não respondeu (a carteirinha em cache continua funcionando)
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { LoginResponse, Permission, SessionInfo } from '@filt/shared';
import { apiGet, apiPost, onAuthEvent, type ApiResult } from './api';
import { getToken, setCachedCard, setToken } from './storage';

export type SessionStatus = 'loading' | 'anon' | 'auth' | 'offline';

type Ctx = {
    status: SessionStatus;
    session: SessionInfo | null;
    hasToken: boolean;
    /** recarrega GET auth/me */
    refresh: () => Promise<SessionInfo | null>;
    /** grava o token recebido no login/cadastro e carrega a sessão */
    signIn: (res: LoginResponse) => Promise<SessionInfo | null>;
    signOut: () => Promise<void>;
    setSession: (s: SessionInfo) => void;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<SessionStatus>('loading');
    const [session, setSessionState] = useState<SessionInfo | null>(null);
    const [hasToken, setHasToken] = useState(false);

    const refresh = useCallback(async (): Promise<SessionInfo | null> => {
        const token = await getToken();
        setHasToken(!!token);
        if (!token) { setSessionState(null); setStatus('anon'); return null; }
        const r: ApiResult<SessionInfo> = await apiGet<SessionInfo>('auth/me', { silent: true, timeoutMs: 8000 });
        if (r.success) { setSessionState(r.data); setStatus('auth'); return r.data; }
        if (r.status === 401) { setSessionState(null); setHasToken(false); setStatus('anon'); return null; }
        setStatus('offline');
        return null;
    }, []);

    const signIn = useCallback(async (res: LoginResponse) => {
        await setToken(res.token);
        return refresh();
    }, [refresh]);

    const signOut = useCallback(async () => {
        await apiPost('auth/logout', {}, { silent: true });
        await setToken(null);
        await setCachedCard(null);
        setSessionState(null);
        setHasToken(false);
        setStatus('anon');
    }, []);

    const setSession = useCallback((s: SessionInfo) => { setSessionState(s); setStatus('auth'); }, []);

    useEffect(() => { void refresh(); }, [refresh]);

    // sessão expirada em qualquer requisição -> anônimo
    useEffect(() => onAuthEvent(e => {
        if (e === 'unauthorized') { setSessionState(null); setHasToken(false); setStatus('anon'); void setCachedCard(null); }
    }), []);

    // voltou para o app: atualiza (notificações, situação do sócio)
    useEffect(() => {
        const sub = AppState.addEventListener('change', st => { if (st === 'active') void refresh(); });
        return () => sub.remove();
    }, [refresh]);

    const value = useMemo(() => ({ status, session, hasToken, refresh, signIn, signOut, setSession }), [status, session, hasToken, refresh, signIn, signOut, setSession]);
    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
    const ctx = useContext(SessionContext);
    if (!ctx) throw new Error('useSession fora do SessionProvider');
    return ctx;
}

/** Tem UMA das permissões (master pode tudo) */
export function can(session: SessionInfo | null, ...perms: Permission[]): boolean {
    if (!session) return false;
    if (session.user.isMaster) return true;
    return perms.some(p => session.permissions.includes(p));
}

/** Sessão pronta para uso (sem 2FA pendente) */
export const isReady = (s: SessionInfo | null): s is SessionInfo => !!s && !s.mfaPending && !s.mfaSetupRequired;
