/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST valida uma entrada: { qr } (leitor) | { ticketId } | { membershipId } (busca manual)
 */
import { z } from 'zod';
import { checkInMember, checkInTicket, InputError, validateQr } from '@filt/core';
import { assertEventAccess, route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'checkin.validate' }, async ({ req, params, auth }) => {
    const eventId = idParam(params.id);
    assertEventAccess(auth, eventId, 'checkin.validate');
    const b = z.object({ qr: z.string().max(300).optional(), ticketId: z.number().int().optional(), membershipId: z.number().int().optional(), deviceId: z.string().max(64).optional() }).parse(await req.json());
    const ctx = { eventId, operatorId: auth.user.id, deviceId: b.deviceId };
    if (b.qr) return validateQr(ctx, b.qr);
    if (b.ticketId) return checkInTicket(ctx, { id: b.ticketId }, `manual:ticket:${b.ticketId}`);
    if (b.membershipId) return checkInMember(ctx, b.membershipId, `manual:member:${b.membershipId}`);
    throw new InputError('Informe o QR, o ingresso ou o sócio', 261115270002);
});
