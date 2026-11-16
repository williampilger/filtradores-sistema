/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Utilitários das páginas públicas (datas de jogo, links de login, cópia, nome do clube)
 */
import { toast } from 'react-toastify';
import type { EventListItem, OrderStatus } from '@filt/shared';

export const CLUB_SHORT = 'ACEF';
/** Escudo PROVISÓRIO (apps/web/public/escudo.png): usado enquanto não houver logo enviado em Admin > Configurações */
export const DEFAULT_LOGO_URL = '/escudo.png';
export const CLUB_NAME = 'Associação Cultural e Esportiva Filtradores';
export const CLUB_HOME_VENUE = 'Ginásio do Morangão';
export const CLUB_CITY = 'Bom Princípio-RS';
export const CLUB_INSTAGRAM = 'acefiltradores';

const TZ = 'America/Sao_Paulo';

/** Partes da data para os cards de jogo ("SÁB", "15", "NOV", "19:30") */
export function dateParts(iso: string) {
    const d = new Date(iso);
    const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleString('pt-BR', { timeZone: TZ, ...o });
    return {
        weekday: part({ weekday: 'short' }).replace('.', '').toUpperCase(),
        weekdayLong: part({ weekday: 'long' }),
        day: part({ day: '2-digit' }),
        month: part({ month: 'short' }).replace('.', '').toUpperCase(),
        time: part({ hour: '2-digit', minute: '2-digit' }),
        full: part({ weekday: 'long', day: '2-digit', month: 'long' }),
    };
}

/** "ACEF x Adversário" para jogos; título do evento nos demais */
export const matchTitle = (e: Pick<EventListItem, 'isMatch' | 'opponent' | 'title'>) => (e.isMatch && e.opponent ? `${CLUB_SHORT} x ${e.opponent}` : e.title);

/** Iniciais para o "escudo" do adversário / avatar */
export function initials(name: string | null | undefined, max = 2) {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
    return parts.slice(0, max).map(p => p[0]).join('').toUpperCase();
}

/** Aceita somente caminhos internos (evita open redirect no ?next=) */
export function safeNext(next: string | null | undefined, fallback = '/minha-conta') {
    if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
    return next;
}

export const loginHref = (next: string) => `/login?next=${encodeURIComponent(next)}`;

/** Caminho atual com a query string (para voltar depois do login) */
export const currentPath = () => (typeof window === 'undefined' ? '/' : window.location.pathname + window.location.search);

export async function copyText(text: string, okMsg = 'Copiado!') {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(okMsg);
    } catch {
        // navegadores sem clipboard API (http, webviews antigos)
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); toast.success(okMsg); } catch { toast.error('Não foi possível copiar. Selecione e copie manualmente.'); }
        ta.remove();
    }
}

export function downloadText(filename: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const isOpenOrder = (s: OrderStatus) => s === 'PENDING_PAYMENT';
