/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Hook de leitura (GET) com loading, pull-to-refresh e recarga ao voltar para a tela
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { apiGet, type ApiResult } from '@/api';

type Opts = {
    /** recarrega sempre que a tela ganha foco (padrão: true) */
    refetchOnFocus?: boolean;
    /** recarrega a cada N ms enquanto a tela está montada */
    pollMs?: number;
};

export function useApi<T>(path: string | null, opts: Opts = {}) {
    const { refetchOnFocus = true, pollMs } = opts;
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState(0);
    const [loading, setLoading] = useState(!!path);
    const [refreshing, setRefreshing] = useState(false);
    const mounted = useRef(true);
    const firstFocus = useRef(true);

    useEffect(() => () => { mounted.current = false; }, []);

    const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent' = 'silent'): Promise<ApiResult<T> | null> => {
        if (!path) { setLoading(false); return null; }
        if (mode === 'initial') setLoading(true);
        if (mode === 'refresh') setRefreshing(true);
        const r = await apiGet<T>(path);
        if (!mounted.current) return r;
        setStatus(r.status);
        if (r.success) { setData(r.data); setError(null); } else setError(r.msg);
        setLoading(false);
        setRefreshing(false);
        return r;
    }, [path]);

    useEffect(() => { firstFocus.current = true; void load('initial'); }, [load]);

    useFocusEffect(useCallback(() => {
        if (firstFocus.current) { firstFocus.current = false; return; }
        if (refetchOnFocus) void load('silent');
    }, [load, refetchOnFocus]));

    useEffect(() => {
        if (!pollMs || !path) return;
        const t = setInterval(() => { void load('silent'); }, pollMs);
        return () => clearInterval(t);
    }, [pollMs, path, load]);

    const refresh = useCallback(() => load('refresh'), [load]);
    const reload = useCallback(() => load('silent'), [load]);

    return { data, setData, error, status, loading, refreshing, refresh, reload };
}
