/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔐 PATCH dados do próprio perfil
 */
import { prisma } from '@filt/db';
import { InconsistencyError } from '@filt/core';
import { zodSchema_profile } from '@filt/shared';
import { invalidateUserAuth, route } from '@/lib/authenticate';
import { sessionInfo } from '@/server/users';

export const PATCH = route({}, async ({ req, auth }) => {
    const b = zodSchema_profile.parse(await req.json());
    if (b.cpf) {
        const other = await prisma.user.findUnique({ where: { cpf: b.cpf } });
        if (other && other.id !== auth.user.id) throw new InconsistencyError('Este CPF já está em outra conta', 261115250001);
    }
    await prisma.user.update({ where: { id: auth.user.id }, data: { name: b.name, phone: b.phone, cpf: b.cpf, birthDate: b.birthDate } });
    await invalidateUserAuth(auth.user.id);
    return sessionInfo(auth);
});
