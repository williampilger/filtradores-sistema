/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 DELETE exclusão da própria conta (App Store / LGPD). Exige a senha.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clearSessionCookie, route } from '@/lib/authenticate';
import { deleteOwnAccount } from '@/server/users';

export const DELETE = route({}, async ({ req, auth }) => {
    const b = z.object({ password: z.string().min(1) }).parse(await req.json());
    await deleteOwnAccount(auth, b.password);
    const res = NextResponse.json({ msg: '261115250003 - Conta excluída' });
    clearSessionCookie(res);
    return res;
});
