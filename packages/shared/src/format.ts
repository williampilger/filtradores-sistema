/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Formatação e validações (dinheiro em centavos, CPF, datas, slugs)
 */

/** 12345 -> "R$ 123,45" */
export function formatMoney(cents: number | null | undefined): string {
    const v = (cents ?? 0) / 100;
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "123,45" | "123.45" | "R$ 1.234,50" -> centavos (null se inválido) */
export function parseMoneyToCents(input: string): number | null {
    const s = input.replace(/[R$\s]/g, '');
    if (!s) return null;
    const norm = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    const n = Number(norm);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export const onlyDigits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '');

export function isValidCpf(input: string | null | undefined): boolean {
    const cpf = onlyDigits(input);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const calc = (len: number) => {
        let sum = 0;
        for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
        const r = (sum * 10) % 11;
        return r === 10 ? 0 : r;
    };
    return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

export function formatCpf(input: string | null | undefined): string {
    const c = onlyDigits(input);
    return c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : c;
}

/** CPF parcialmente oculto (telas de validação na portaria) */
export const maskCpf = (input: string | null | undefined) => {
    const c = onlyDigits(input);
    return c.length === 11 ? `***.${c.slice(3, 6)}.${c.slice(6, 9)}-**` : '';
};

export function slugify(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export function formatDateTime(d: string | Date | null | undefined): string {
    if (!d) return '';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

export function formatDate(d: string | Date | null | undefined): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
