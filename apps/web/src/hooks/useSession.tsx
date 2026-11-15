'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Sessão no client: usuário, permissões efetivas, situação de sócio
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Permission, SessionInfo } from '@filt/shared';
import API from '@/api';

type Ctx = {
    session: SessionInfo | null;
    loading: boolean;
    refresh: () => Promise<SessionInfo | null>;
    logout: () => Promise<void>;
    /** possui UMA das permissões (master: todas) */
    can: (...perms: Permission[]) => boolean;
    isStaff: boolean;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<SessionInfo | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const r = await API.auth.me();
        const s = r.success ? r.data : null;
        setSession(s);
        setLoading(false);
        return s;
    }, []);

    useEffect(() => { void refresh(); }, [refresh]);

    const logout = useCallback(async () => {
        await API.auth.logout();
        setSession(null);
        window.location.href = '/';
    }, []);

    const value = useMemo<Ctx>(() => ({
        session, loading, refresh, logout,
        can: (...perms) => !!session && (session.user.isMaster || perms.some(p => session.permissions.includes(p))),
        isStaff: !!session && (session.user.isMaster || session.permissions.length > 0),
    }), [session, loading, refresh, logout]);

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
    const c = useContext(SessionContext);
    if (!c) throw new Error('useSession fora do SessionProvider');
    return c;
}
