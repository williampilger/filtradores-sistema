/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Envio de e-mail (SMTP). Sem SMTP_HOST configurado, o conteúdo é apenas LOGADO
 *              (útil em dev e enquanto o Postfix do sony não está instalado - ver ToDo.md).
 */
import nodemailer, { type Transporter } from 'nodemailer';

export type MailMessage = { to: string, subject: string, text: string, html?: string };

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
    if (transporter !== undefined) return transporter;
    const host = process.env.SMTP_HOST;
    if (!host) { transporter = null; return null; }
    transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    return transporter;
}

/** Retorna 'sent' ou 'logged' (sem SMTP). Lança em falha de envio (o worker faz retry). */
export async function sendMail(msg: MailMessage, log: (text: string) => void = console.log): Promise<'sent' | 'logged'> {
    const t = getTransporter();
    if (!t) {
        log(`[e-mail NÃO enviado - SMTP não configurado] para=${msg.to} assunto="${msg.subject}"\n${msg.text}`);
        return 'logged';
    }
    await t.sendMail({ from: process.env.SMTP_FROM ?? 'nao-responda@filtradores.local', to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
    return 'sent';
}

/** Layout HTML mínimo para os e-mails transacionais */
export function mailHtml(title: string, paragraphs: string[], cta?: { label: string, url: string }): string {
    const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
    return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f3f5f9;padding:24px">
<div style="max-width:520px;margin:auto;background:#fff;border-radius:8px;padding:24px">
<h2 style="margin-top:0;color:#1b3fd1">${esc(title)}</h2>
${paragraphs.map(p => `<p style="color:#1b2430;line-height:1.5">${esc(p)}</p>`).join('\n')}
${cta ? `<p><a href="${esc(cta.url)}" style="display:inline-block;background:#1b3fd1;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${esc(cta.label)}</a></p>` : ''}
</div></body></html>`;
}
