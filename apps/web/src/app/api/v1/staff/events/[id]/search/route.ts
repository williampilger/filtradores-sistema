/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET busca manual na portaria (?q=nome|cpf|nº de sócio)
 */
import { searchAttendees } from '@filt/core';
import { assertEventAccess, route } from '@/lib/authenticate';
import { idParam, qp } from '@/lib/http';

export const GET = route<{ id: string }>({ perm: 'checkin.validate' }, async ({ req, params, auth }) => {
    const eventId = idParam(params.id);
    assertEventAccess(auth, eventId, 'checkin.validate');
    return searchAttendees(eventId, qp(req, 'q') ?? '');
});
