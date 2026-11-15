/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 POST login (web: cookie SSID | app: token no corpo, enviado depois como Bearer)
 */
import { NextResponse } from 'next/server';
import { zodSchema_login } from '@filt/shared';
import { route, setSessionCookie } from '@/lib/authenticate';
import { login } from '@/server/users';

export const POST = route({ auth: 'none' }, async ({ req }) => {
    const b = zodSchema_login.parse(await req.json());
    const s = await login(req, b.email, b.password, b.client);
    const res = NextResponse.json({ token: b.client === 'app' ? s.token : '', expiresAt: s.expiresAt, mfaPending: s.mfaPending, mfaSetupRequired: s.mfaSetupRequired });
    if (b.client === 'web') setSessionCookie(res, s.token, s.expiresAt);
    return res;
});
