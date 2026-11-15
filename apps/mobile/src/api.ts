/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Cliente da API (/api/v1). NUNCA lança exceção: sempre devolve { success, status, data, msg }.
 *
 *  - Autenticação: `Authorization: Bearer <token>` (token no SecureStore).
 *  - 401 -> limpa o token e leva ao login.
 *  - 403 com mfaPending/mfaSetupRequired -> leva à tela de 2FA.
 *  - status 0 = sem conexão / servidor fora do ar.
 */
import { router } from 'expo-router';
import { API_URL } from './config';
import { getToken, setToken } from './storage';

export type ApiErrorBody = {
    msg?: string;
    issues?: { path: string, message: string }[];
    mfaPending?: boolean;
    mfaSetupRequired?: boolean;
};

export type ApiResult<T> =
    | { success: true, status: number, data: T, msg: string }
    | { success: false, status: number, data: ApiErrorBody | null, msg: string };

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type AuthEvent = 'unauthorized' | 'mfa';
const listeners = new Set<(e: AuthEvent) => void>();
/** SessionProvider escuta para atualizar o estado (sessão expirada, 2FA pendente) */
export function onAuthEvent(fn: (e: AuthEvent) => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

/** Remove o código interno do servidor: "261115200003 - Sessão inválida" -> "Sessão inválida" */
export const cleanMsg = (m: unknown): string => (typeof m === 'string' ? m.replace(/^\d{12}(:\w+)? - /, '') : '');

let redirecting = false;
function redirectOnce(path: '/login' | '/two-factor') {
    if (redirecting) return;
    redirecting = true;
    setTimeout(() => { redirecting = false; }, 1500);
    try { router.push(path); } catch { /* navegação ainda não montada */ }
}

export type RequestOptions = {
    /** não redireciona em 401/403 (ex.: carregamento inicial da sessão, tela de login) */
    silent?: boolean;
    timeoutMs?: number;
};

export async function api<T = unknown>(method: Method, path: string, body?: unknown, opts: RequestOptions = {}): Promise<ApiResult<T>> {
    const url = `${API_URL}/api/v1/${path.replace(/^\/+/, '')}`;
    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body; // multipart: o fetch define o boundary
    else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);
    let res: Response;
    try {
        res = await fetch(url, { method, headers, body: payload, signal: ctrl.signal });
    } catch {
        clearTimeout(timer);
        return { success: false, status: 0, data: null, msg: 'Sem conexão com o servidor. Verifique sua internet.' };
    }
    clearTimeout(timer);

    let json: unknown = null;
    try {
        const text = await res.text();
        json = text ? JSON.parse(text) : null;
    } catch { json = null; }

    const msg = cleanMsg((json as { msg?: unknown } | null)?.msg);

    if (res.ok) return { success: true, status: res.status, data: json as T, msg };

    const err = (json && typeof json === 'object' ? json : null) as ApiErrorBody | null;
    const fallback = res.status >= 500 ? 'Erro no servidor. Tente novamente em instantes.' : `Erro ${res.status}`;
    const firstIssue = err?.issues?.[0]?.message;
    const out: ApiResult<T> = { success: false, status: res.status, data: err, msg: msg && firstIssue ? `${msg}: ${firstIssue}` : msg || fallback };

    if (res.status === 401 && token) {
        await setToken(null);
        listeners.forEach(fn => fn('unauthorized'));
        if (!opts.silent) redirectOnce('/login');
    } else if (res.status === 403 && (err?.mfaPending || err?.mfaSetupRequired)) {
        listeners.forEach(fn => fn('mfa'));
        if (!opts.silent) redirectOnce('/two-factor');
    }
    return out;
}

export const apiGet = <T>(path: string, opts?: RequestOptions) => api<T>('GET', path, undefined, opts);
export const apiPost = <T>(path: string, body?: unknown, opts?: RequestOptions) => api<T>('POST', path, body ?? {}, opts);
export const apiPatch = <T>(path: string, body?: unknown, opts?: RequestOptions) => api<T>('PATCH', path, body ?? {}, opts);
export const apiDelete = <T>(path: string, body?: unknown, opts?: RequestOptions) => api<T>('DELETE', path, body, opts);
