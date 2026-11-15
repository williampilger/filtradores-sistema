/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Notificações ao usuário: in-app (tabela Notification) + e-mail (fila do worker)
 * Push (expo-notifications) fica no ToDo.
 */
import { prisma } from '@filt/db';
import { mailHtml } from '@filt/integrations/mailer';
import { CoreEnv } from './env';
import { LogSystem } from './log';
import { getQueue } from './redis';

export type MailJob = { to: string, subject: string, text: string, html?: string };

/** Enfileira e-mail (o worker envia; sem SMTP apenas loga) */
export async function enqueueMail(job: MailJob): Promise<void> {
    try {
        await getQueue('mail').add('send', job, { attempts: 5, backoff: { type: 'exponential', delay: 30_000 }, removeOnComplete: 1000, removeOnFail: 1000 });
    } catch (e) {
        LogSystem.error(261115100101, `Falha ao enfileirar e-mail para ${job.to}: ${(e as Error).message}`);
    }
}

/** Notificação in-app + e-mail opcional */
export async function notifyUser(userId: number, n: { title: string, body?: string, link?: string, email?: boolean }): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, deletedAt: true } });
    if (!user || user.deletedAt) return;
    await prisma.notification.create({ data: { userId, title: n.title, body: n.body ?? null, link: n.link ?? null } });
    if (n.email !== false) {
        const url = n.link ? `${CoreEnv.APP_URL}${n.link}` : undefined;
        await enqueueMail({
            to: user.email, subject: n.title,
            text: `Olá, ${user.name}!\n\n${n.body ?? ''}${url ? `\n\n${url}` : ''}`,
            html: mailHtml(n.title, [`Olá, ${user.name}!`, ...(n.body ? n.body.split('\n') : [])], url ? { label: 'Abrir', url } : undefined),
        });
    }
}
