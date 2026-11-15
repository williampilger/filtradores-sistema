/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET/PUT configurações do clube
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { audit } from '@filt/core';
import { StorageSystem } from '@filt/integrations/storage';
import { route } from '@/lib/authenticate';

export const GET = route({ perm: 'settings.manage' }, async () => {
    const s = await prisma.clubSettings.findUniqueOrThrow({ where: { id: 1 } });
    return { ...s, logoUrl: StorageSystem.url(s.logoKey) };
});

export const PUT = route({ perm: 'settings.manage' }, async ({ req, auth }) => {
    const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor no formato #RRGGBB');
    const b = z.object({
        name: z.string().trim().min(2).max(120), shortName: z.string().trim().min(2).max(40), city: z.string().max(120).nullable().optional(),
        about: z.string().max(10000).nullable().optional(), primaryColor: color, secondaryColor: color, contactEmail: z.string().max(160).nullable().optional(),
        contactPhone: z.string().max(30).nullable().optional(), instagram: z.string().max(80).nullable().optional(), pickupInfo: z.string().max(5000).nullable().optional(),
        termsText: z.string().max(50000).nullable().optional(),
    }).parse(await req.json());
    await prisma.clubSettings.update({ where: { id: 1 }, data: b });
    await audit({ userId: auth.user.id, action: 'settings.update', entity: 'settings', entityId: 1 });
    return { ok: true };
});
