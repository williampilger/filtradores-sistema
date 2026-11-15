'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Dados públicos do clube (home) carregados UMA vez pelo layout do site e compartilhados
 *              entre cabeçalho, rodapé e página inicial
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PublicHome } from '@filt/shared';
import API from '@/api';

type Ctx = { home: PublicHome | null, loading: boolean, reload: () => Promise<void> };

const SiteDataContext = createContext<Ctx>({ home: null, loading: true, reload: async () => undefined });

export function SiteDataProvider({ children }: { children: React.ReactNode }) {
    const [home, setHome] = useState<PublicHome | null>(null);
    const [loading, setLoading] = useState(true);
    const reload = useCallback(async () => {
        const r = await API.public.home();
        if (r.success) setHome(r.data);
        setLoading(false);
    }, []);
    useEffect(() => { void reload(); }, [reload]);
    return <SiteDataContext.Provider value={{ home, loading, reload }}>{children}</SiteDataContext.Provider>;
}

export const useSiteData = () => useContext(SiteDataContext);
