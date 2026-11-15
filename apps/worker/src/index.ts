/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Worker: filas BullMQ + agendamentos (cron)
 *
 * Filas (nomes em @filt/shared QUEUES):
 *  - mail : envio de e-mails (sem SMTP configurado: apenas loga o conteúdo)
 * Agendamentos:
 *  - ORDERS_EXPIRE_CRON      : expira pedidos não pagos e devolve reservas de ingressos/estoque
 *  - PAYMENTS_RECONCILE_CRON : consulta nos gateways os pagamentos pendentes + reprocessa webhooks com erro
 *  - MEMBERSHIP_BILLING_CRON : gera renovações de sócios, aplica carência/inadimplência/expiração
 *  - WAITLIST_CRON           : expira chamadas da lista de espera e chama os próximos
 *  - diário 03:30            : limpeza (sessões expiradas, tokens usados, notificações antigas lidas)
 *
 * ⚠️ Um ÚNICO processo worker (crons não são distribuídos). Os jobs são idempotentes mesmo assim.
 */
process.env.LOG_APP_NAME ??= 'filt-worker';

import { Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import cron from 'node-cron';
import { prisma } from '@filt/db';
import { QUEUES } from '@filt/shared';
import { sendMail } from '@filt/integrations/mailer';
import { billingSweep, expireOrders, LogSystem, reconcilePayments, retryWebhookEvents, waitlistSweep, type MailJob } from '@filt/core';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { maxRetriesPerRequest: null });

const workers = [
    new Worker<MailJob>(QUEUES.mail, async (job: Job<MailJob>) => {
        const r = await sendMail(job.data, text => LogSystem.info(261115190001, text));
        LogSystem.debug(261115190002, `E-mail ${r} para ${job.data.to}: ${job.data.subject}`);
    }, { connection, concurrency: 2 }),
];
for (const w of workers) {
    w.on('failed', (job, err) => LogSystem.error(261115190003, `Job ${w.name}#${job?.id} falhou: ${err.message}`));
}

/** Evita sobreposição: se a execução anterior ainda roda, pula esta */
function schedule(name: string, expr: string, fn: () => Promise<unknown>) {
    let running = false;
    cron.schedule(expr, async () => {
        if (running) return;
        running = true;
        try { await fn(); } catch (e) { LogSystem.ERROR(261115190004, `cron ${name}: ${(e as Error).message}`); } finally { running = false; }
    });
    LogSystem.info(261115190005, `Agendado: ${name} (${expr})`);
}

async function maintenance() {
    const now = new Date();
    const [s, t, n] = await Promise.all([
        prisma.userSession.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } }] } }),
        prisma.tempHash.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] } }),
        prisma.notification.deleteMany({ where: { readAt: { lt: new Date(now.getTime() - 90 * 86_400_000) } } }),
    ]);
    LogSystem.info(261115190006, `Manutenção: ${s.count} sessões, ${t.count} tokens, ${n.count} notificações removidas`);
}

schedule('orders:expire', process.env.ORDERS_EXPIRE_CRON ?? '* * * * *', () => expireOrders());
schedule('payments:reconcile', process.env.PAYMENTS_RECONCILE_CRON ?? '*/5 * * * *', async () => { await reconcilePayments(); await retryWebhookEvents(); });
schedule('memberships:billing', process.env.MEMBERSHIP_BILLING_CRON ?? '0 7 * * *', () => billingSweep());
schedule('waitlist:advance', process.env.WAITLIST_CRON ?? '*/10 * * * *', () => waitlistSweep());
schedule('maintenance', '30 3 * * *', maintenance);

LogSystem.info(261115190007, 'Worker iniciado');

async function shutdown(signal: string) {
    LogSystem.info(261115190008, `Encerrando worker (${signal})...`);
    await Promise.allSettled(workers.map(w => w.close()));
    await prisma.$disconnect();
    connection.disconnect();
    process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
