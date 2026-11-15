/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 POST logout (revoga a sessão atual)
 */
import { NextResponse } from 'next/server';
import { clearSessionCookie, readToken, revokeSessionByToken, route } from '@/lib/authenticate';

export const POST = route({ auth: 'none' }, async ({ req }) => {
    const token = readToken(req);
    if (token) await revokeSessionByToken(token);
    const res = NextResponse.json({ ok: true });
    clearSessionCookie(res);
    return res;
});
