'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Utilitários do painel administrativo (carga de dados, ações com "ocupado", guarda de permissão, copiar)
 */
import { useCallback, useEffect, useMemo, useRef, useState, type DependencyList, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import type { Permission } from '@filt/shared';
import { Empty, Pagination } from '@/components/ui';
import { useSession } from '@/hooks/useSession';

type Res<T> = { success: boolean, data: T };

/**
 * Carrega dados de uma rota da API e recarrega quando `deps` mudam.
 * Ignora respostas antigas (troca rápida de filtros). `enabled=false` não busca nada.
 */
export function useData<T>(loader: () => Promise<Res<T>>, deps: DependencyList, enabled = true) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const fnRef = useRef(loader);
    fnRef.current = loader;
    const seq = useRef(0);

    const reload = useCallback(async () => {
        const my = ++seq.current;
        setLoading(true);
        const r = await fnRef.current();
        if (my !== seq.current) return;
        if (r.success) setData(r.data);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (enabled) void reload();
        else setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reload, enabled, ...deps]);

    return { data, setData, loading, reload };
}

/** Marca qual ação está em andamento (para desabilitar botões) */
export function useBusy() {
    const [busy, setBusy] = useState<string | null>(null);
    const run = useCallback(async <R,>(key: string, fn: () => Promise<R>): Promise<R> => {
        setBusy(key);
        try { return await fn(); } finally { setBusy(null); }
    }, []);
    return { busy, run };
}

/**
 * Paginação no cliente para listas que a API devolve inteiras (ou com limite alto: eventos, produtos, feed, lista de espera...).
 * Volta para a página 1 quando a página atual deixa de existir (filtro/recarga).
 */
export function useClientPage<T>(rows: T[] | null | undefined, pageSize = 50) {
    const [page, setPage] = useState(1);
    const total = rows?.length ?? 0;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const current = Math.min(page, pages);
    const slice = useMemo(() => (rows ?? []).slice((current - 1) * pageSize, current * pageSize), [rows, current, pageSize]);
    const pager = <Pagination page={current} pageSize={pageSize} total={total} onPage={setPage} />;
    /** posição absoluta do 1º item da página (para numerar filas) */
    const offset = (current - 1) * pageSize;
    return { rows: slice, page: current, setPage, total, pager, offset };
}

export function NoAccess() {
    return <Empty>Você não tem permissão para acessar esta tela.</Empty>;
}

/** Renderiza o conteúdo somente se o usuário tiver UMA das permissões */
export function RequirePerm({ perms, children }: { perms: Permission[], children: ReactNode }) {
    const { can } = useSession();
    return can(...perms) ? <>{children}</> : <NoAccess />;
}

export async function copyText(text: string) {
    try {
        await navigator.clipboard.writeText(text);
        toast.success('Copiado');
    } catch {
        toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
}

/** Campo somente leitura com botão "Copiar" (links de convite, webhooks) */
export function CopyField({ value, label }: { value: string, label?: ReactNode }) {
    return (
        <div>
            {label && <span className="lbl">{label}</span>}
            <div className="flex gap-2">
                <input className="inp font-mono text-xs" readOnly value={value} onFocus={e => e.target.select()} />
                <button type="button" className="btn btn-sm shrink-0 self-center" onClick={() => void copyText(value)}>Copiar</button>
            </div>
        </div>
    );
}

/** Tabela padrão dentro de painel com rolagem horizontal no celular */
export function TableBox({ children, className = '' }: { children: ReactNode, className?: string }) {
    return <div className={`panel overflow-x-auto ${className}`}><table className="tbl">{children}</table></div>;
}

export function FilterBar({ children }: { children: ReactNode }) {
    return <div className="mb-3 flex flex-wrap items-end gap-2">{children}</div>;
}

/** Miniatura (foto, capa) com placeholder */
export function Thumb({ url, size = 40, alt = '', round = false }: { url: string | null | undefined, size?: number, alt?: string, round?: boolean }) {
    const cls = `${round ? 'rounded-full' : 'rounded-md'} shrink-0 border border-line bg-surface-alt object-cover`;
    if (!url) return <div className={cls} style={{ width: size, height: size }} />;
    return <img src={url} alt={alt} className={cls} style={{ width: size, height: size }} />;
}

/** Opções de <Select> a partir de um mapa de rótulos (LABELS.xxx) */
export const optionsOf = <K extends string>(labels: Record<K, string>) => (Object.keys(labels) as K[]).map(k => ({ value: k, label: labels[k] }));

/** "" -> null | "12" -> 12 */
export const toInt = (s: string): number | null => {
    if (s.trim() === '') return null;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
};

/** Texto vazio -> null (campos opcionais da API) */
export const orNull = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

/** Data ISO -> "AAAA-MM-DD" (input type=date) e volta */
export const isoToDateInput = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');
export const dateInputToIso = (v: string) => (v ? new Date(`${v}T12:00:00`).toISOString() : null);
