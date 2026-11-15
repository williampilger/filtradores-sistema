/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 POST venda na portaria / PDV (pagamento manual: dinheiro ou PIX direto na chave do clube)
 */
import { z } from 'zod';
import { sellAtGate, toTicketDTO } from '@filt/core';
import { prisma } from '@filt/db';
import { assertEventAccess, route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';

export const POST = route<{ id: string }>({ perm: 'tickets.sell_manual' }, async ({ req, params, auth }) => {
    const eventId = idParam(params.id);
    assertEventAccess(auth, eventId, 'tickets.sell_manual');
    const b = z.object({
        lines: z.array(z.object({ ticketTypeId: z.number().int(), quantity: z.number().int().min(1).max(50) })).min(1),
        customerName: z.string().max(160).default(''), customerCpf: z.string().max(14).optional(),
        method: z.enum(['CASH', 'MANUAL', 'PIX']), note: z.string().max(255).optional(),
    }).parse(await req.json());
    const order = await sellAtGate({ eventId, ...b, byUserId: auth.user.id, byUserName: auth.user.name });
    const tickets = await prisma.ticket.findMany({ where: { OrderItem: { orderId: order.id } }, include: { Event: true, TicketType: true } });
    return { orderCode: order.code, totalCents: order.totalCents, tickets: tickets.map(toTicketDTO) };
});
