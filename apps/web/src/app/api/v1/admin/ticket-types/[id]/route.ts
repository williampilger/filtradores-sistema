/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 PATCH altera lote (quantidade não pode ficar abaixo do já alocado) | DELETE (só sem vendas)
 */
import { prisma } from '@filt/db';
import { audit, InconsistencyError } from '@filt/core';
import { zodSchema_ticketType } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const PATCH = route<{ id: string }>({ perm: 'events.write' }, async ({ req, params, auth }) => {
    const id = idParam(params.id);
    const b = zodSchema_ticketType.partial().parse(await req.json());
    const t = await prisma.ticketType.findUniqueOrThrow({ where: { id } });
    if (b.quantity !== undefined && b.quantity < t.calc_allocated) throw new InconsistencyError(`Quantidade menor que o já vendido/reservado (${t.calc_allocated})`, 261115300003);
    await prisma.ticketType.update({ where: { id }, data: b });
    await audit({ userId: auth.user.id, action: 'ticket_type.update', entity: 'ticket_type', entityId: id, data: b });
    return { ok: true };
});

export const DELETE = route<{ id: string }>({ perm: 'events.write' }, async ({ params, auth }) => {
    const id = idParam(params.id);
    const t = await prisma.ticketType.findUniqueOrThrow({ where: { id }, include: { _count: { select: { OrderItems: true } } } });
    if (t._count.OrderItems) throw new InconsistencyError('Lote com pedidos: desative-o em vez de excluir', 261115300004);
    await prisma.ticketType.delete({ where: { id } });
    await audit({ userId: auth.user.id, action: 'ticket_type.delete', entity: 'ticket_type', entityId: id });
    return { ok: true };
});
