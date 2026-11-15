/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Configuração em tempo de execução (URL da API vinda do app.config.ts -> extra.apiUrl)
 */
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiUrl?: string, demoMode?: boolean } | undefined;
const fromExtra = extra?.apiUrl;

/** Ambiente de demonstração (dados fictícios): mostra a faixa no topo das telas */
export const DEMO_MODE: boolean = extra?.demoMode === true || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

/** URL base do servidor (sem barra no final). Ex.: http://192.168.0.10:3000 */
export const API_URL: string = (fromExtra || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** Converte URL relativa da API (/api/v1/files/...) em absoluta */
export function absoluteUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (/^(https?:|data:|file:)/i.test(url)) return url;
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Página do site (ex.: /socio) */
export const siteUrl = (pathname: string) => `${API_URL}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
