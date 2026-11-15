/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 POST cadastro de torcedor (já sai logado)
 */
import { NextResponse } from 'next/server';
import { zodSchema_register } from '@filt/shared';
import { route, setSessionCookie } from '@/lib/authenticate';
import { register } from '@/server/users';

export const POST = route({ auth: 'none' }, async ({ req }) => {
    const b = zodSchema_register.parse(await req.json());
    const s = await register(req, b);
    const res = NextResponse.json({ token: b.client === 'app' ? s.token : '', expiresAt: s.expiresAt, mfaPending: false, mfaSetupRequired: false });
    if (b.client === 'web') setSessionCookie(res, s.token, s.expiresAt);
    return res;
});
