/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Webhooks dos gateways e reconciliação
 *
 * - A rota /api/v1/webhooks/payments/[gateway] chama handleWebhook(): valida a assinatura (o pacote lança
 *   WebhookSignatureError), grava o evento (idempotente por gateway+eventId) e aplica o status na hora.
 * - Se a aplicação falhar, o evento fica com `error` e o worker reprocessa (retryWebhookEvents).
 * - Reconciliação (worker): consulta no gateway os pagamentos PENDENTES - cobre webhooks perdidos.
 */
import { prisma, Prisma } from '@filt/db';
import type { WebhookRequest } from '@williampilger/payment-gateways';
import { WebhookSignatureError } from '@williampilger/payment-gateways';
import { AuthError, NotFoundError } from './errors';
import { getPayments } from './gateways';
import { LogSystem } from './log';
import { applyPaymentStatus } from './orders';

async function findPayment(gateway: string, externalId?: string, externalReference?: string) {
    const ref = externalReference?.match(/^pay_(\d+)$/);
    if (ref) {
        const p = await prisma.payment.findUnique({ where: { id: Number(ref[1]) } });
        if (p && p.gateway === gateway) return p;
    }
    if (externalId) return prisma.payment.findUnique({ where: { gateway_externalId: { gateway, externalId } } });
    return null;
}

export async function handleWebhook(gateway: string, req: WebhookRequest): Promise<{ ok: true, duplicate?: boolean }> {
    const { registry } = await getPayments();
    if (!registry.has(gateway)) throw new NotFoundError('Gateway não configurado', 261115180001);

    let event;
    try {
        event = await registry.resolveWebhook(gateway, req);
    } catch (e) {
        if (e instanceof WebhookSignatureError) {
            LogSystem.ERROR(261115180002, `Webhook ${gateway} com assinatura inválida (possível tentativa de fraude)`);
            throw new AuthError('Assinatura inválida', 261115180002);
        }
        throw e;
    }

    let row;
    try {
        row = await prisma.paymentWebhookEvent.create({
            data: { gateway, eventId: event.eventId.slice(0, 160), externalId: event.externalId?.slice(0, 128) ?? null, payload: JSON.parse(JSON.stringify(event.raw ?? {})) as Prisma.InputJsonValue },
        });
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { ok: true, duplicate: true };
        throw e;
    }

    await processEvent(row.id, gateway, event.externalId, event.externalReference, event.status);
    return { ok: true };
}

async function processEvent(rowId: bigint, gateway: string, externalId?: string, externalReference?: string, status?: string) {
    try {
        if (status) {
            const payment = await findPayment(gateway, externalId, externalReference);
            if (!payment) LogSystem.warn(261115180003, `Webhook ${gateway}: pagamento não encontrado (externalId=${externalId}, ref=${externalReference})`);
            else await applyPaymentStatus(payment.id, status as never);
        }
        await prisma.paymentWebhookEvent.update({ where: { id: rowId }, data: { processedAt: new Date(), error: null } });
    } catch (e) {
        LogSystem.error(261115180004, `Falha ao processar webhook ${gateway} #${rowId}: ${(e as Error).message}`);
        await prisma.paymentWebhookEvent.update({ where: { id: rowId }, data: { error: (e as Error).message.slice(0, 2000) } });
    }
}

/** Worker: consulta os pagamentos pendentes nos gateways (fallback do webhook) */
export async function reconcilePayments(now = new Date()): Promise<number> {
    const { registry } = await getPayments();
    const pending = await prisma.payment.findMany({
        where: {
            status: { in: ['PENDING', 'AUTHORIZED'] }, externalId: { not: null }, gateway: { notIn: ['manual', 'courtesy'] },
            createdAt: { lt: new Date(now.getTime() - 2 * 60_000), gt: new Date(now.getTime() - 4 * 86_400_000) },
        },
        take: 100, orderBy: { createdAt: 'asc' },
    });
    let changed = 0;
    for (const p of pending) {
        if (!registry.has(p.gateway)) continue;
        try {
            const r = await registry.get(p.gateway).getCharge(p.externalId!);
            if (r.status !== p.status) {
                await applyPaymentStatus(p.id, r.status, { paidAt: r.paidAt, raw: r.raw });
                changed++;
            }
        } catch (e) {
            LogSystem.debug(261115180005, `Reconciliação ${p.gateway}/${p.externalId}: ${(e as Error).message}`);
        }
    }
    if (changed) LogSystem.info(261115180006, `Reconciliação: ${changed} pagamento(s) atualizados`);
    return changed;
}

/** Worker: reprocessa webhooks que falharam (ex.: banco fora do ar no momento) */
export async function retryWebhookEvents(): Promise<void> {
    const failed = await prisma.paymentWebhookEvent.findMany({ where: { processedAt: null, createdAt: { gt: new Date(Date.now() - 3 * 86_400_000) } }, take: 50 });
    if (!failed.length) return;
    const { registry } = await getPayments();
    for (const ev of failed) {
        if (!ev.externalId || !registry.has(ev.gateway)) continue;
        try {
            const charge = await registry.get(ev.gateway).getCharge(ev.externalId);
            await processEvent(ev.id, ev.gateway, ev.externalId, charge.externalReference, charge.status);
        } catch (e) {
            LogSystem.debug(261115180007, `Retry webhook #${ev.id}: ${(e as Error).message}`);
        }
    }
}

/** Demonstração: aplica na hora o status dos pagamentos simulados de um pedido (chamado ao consultar o pedido) */
export async function demoTick(orderId: number): Promise<void> {
    const { registry } = await getPayments();
    if (!registry.has('demo')) return;
    const pend = await prisma.payment.findMany({ where: { orderId, gateway: 'demo', status: 'PENDING', externalId: { not: null } } });
    for (const p of pend) {
        const r = await registry.get('demo').getCharge(p.externalId!);
        if (r.status !== 'PENDING') await applyPaymentStatus(p.id, r.status, { paidAt: r.paidAt });
    }
}
