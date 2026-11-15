/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Schemas Zod usados só pelas rotas administrativas (route.ts não pode exportar outros nomes)
 */
import { z } from 'zod';
import { PERMISSIONS } from '@filt/shared';

export const zodSchema_role = z.object({
    name: z.string().trim().min(2).max(80), description: z.string().max(255).nullable().optional(), require2fa: z.boolean().default(false),
    permissions: z.array(z.enum(PERMISSIONS as [string, ...string[]])),
});
