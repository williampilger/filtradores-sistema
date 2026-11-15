/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET/PUT escalação do jogo (treinador). publish=true torna visível no app/site.
 */
import { prisma } from '@filt/db';
import { audit, toLineupDTO } from '@filt/core';
import { zodSchema_lineup } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: ['lineups.write', 'events.read'] }, async ({ params }) => {
    const l = await prisma.lineup.findUnique({ where: { eventId: idParam(params.id) }, include: { Entries: { include: { Player: true } } } });
    return l ? toLineupDTO(l) : null;
});

export const PUT = route<{ id: string }>({ perm: 'lineups.write' }, async ({ req, params, auth }) => {
    const eventId = idParam(params.id);
    const b = zodSchema_lineup.parse(await req.json());
    await prisma.$transaction(async tx => {
        const current = await tx.lineup.findUnique({ where: { eventId } });
        const publishedAt = b.publish ? (current?.publishedAt ?? new Date()) : null;
        const l = await tx.lineup.upsert({
            where: { eventId },
            create: { eventId, formation: b.formation ?? null, notes: b.notes ?? null, publishedAt, createdById: auth.user.id },
            update: { formation: b.formation ?? null, notes: b.notes ?? null, publishedAt },
        });
        await tx.lineupEntry.deleteMany({ where: { lineupId: l.id } });
        if (b.entries.length) await tx.lineupEntry.createMany({ data: b.entries.map((e, i) => ({ lineupId: l.id, playerId: e.playerId, starter: e.starter, slot: e.slot ?? null, isCaptain: e.isCaptain, sortOrder: i })) });
    });
    await audit({ userId: auth.user.id, action: 'lineup.save', entity: 'event', entityId: eventId, data: { publish: b.publish, players: b.entries.length } });
    return { ok: true };
});
