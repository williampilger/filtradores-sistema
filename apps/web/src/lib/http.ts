/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Respostas JSON (BigInt serializado como string; Date via toJSON)
 */
import { NextResponse } from 'next/server';

const replacer = (_k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);

export function json(data: unknown, status = 200, headers?: HeadersInit): NextResponse {
    return new NextResponse(JSON.stringify(data, replacer), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

export const msg = (code: number, message: string, status = 200) => json({ msg: `${code} - ${message}` }, status);

/** Paginação padrão (?page=1&pageSize=50) */
export function paging(req: { nextUrl: URL }, max = 200) {
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10) || 1);
    const pageSize = Math.min(max, Math.max(1, parseInt(req.nextUrl.searchParams.get('pageSize') ?? '50', 10) || 50));
    return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export const qp = (req: { nextUrl: URL }, k: string) => req.nextUrl.searchParams.get(k)?.trim() || undefined;
export const idParam = (v: string | string[] | undefined) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : -1; };
