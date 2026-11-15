/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 POST confirma o e-mail
 */
import { z } from 'zod';
import { route } from '@/lib/authenticate';
import { confirmEmail } from '@/server/users';

export const POST = route({ auth: 'none' }, async ({ req }) => {
    const b = z.object({ token: z.string().min(10) }).parse(await req.json());
    await confirmEmail(b.token);
    return { msg: '261115240005 - E-mail confirmado!' };
});
