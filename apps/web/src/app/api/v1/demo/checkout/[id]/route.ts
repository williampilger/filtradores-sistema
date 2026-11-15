/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 Página de pagamento SIMULADA (somente DEMO_MODE=true): GET mostra, POST aprova/recusa
 * ⚠️ Fora do modo demonstração responde 404.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@filt/db';
import { applyPaymentStatus, isDemoMode, NotFoundError } from '@filt/core';
import { formatMoney, LABELS } from '@filt/shared';
import { route } from '@/lib/authenticate';
import { idParam } from '@/lib/http';
import ENV from '@/lib/environmentConstants';

async function load(id: string) {
    if (!isDemoMode()) throw new NotFoundError('Não encontrado', 261115330001);
    const p = await prisma.payment.findUnique({ where: { id: idParam(id) }, include: { Order: true } });
    if (!p || p.gateway !== 'demo') throw new NotFoundError('Pagamento não encontrado', 261115330002);
    return p;
}

export const GET = route<{ id: string }>({ auth: 'none' }, async ({ params }) => {
    const p = await load(params.id);
    const done = p.status !== 'PENDING';
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pagamento simulado</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#0a1c66;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center}
.c{background:#fff;color:#17202e;border-radius:14px;padding:28px;max-width:380px;width:90%;text-align:center}
.b{background:#f5b700;color:#0a1c66;font-weight:700;font-size:12px;letter-spacing:.08em;padding:6px;border-radius:6px;margin-bottom:16px}
h1{font-size:20px;margin:0 0 6px}.v{font-size:32px;font-weight:800;color:#1b3fd1;margin:12px 0}
button{width:100%;height:46px;border:0;border-radius:8px;font-size:16px;font-weight:700;margin-top:10px;cursor:pointer}
.ok{background:#1e9e5a;color:#fff}.no{background:#eee;color:#d13b3b}</style></head><body><div class="c">
<div class="b">AMBIENTE DE DEMONSTRAÇÃO · NENHUM VALOR É COBRADO</div>
<h1>${LABELS.paymentMethod[p.method]} - pedido ${p.Order.code}</h1><div class="v">${formatMoney(p.amountCents)}</div>
${done ? `<p>Este pagamento já está: <b>${LABELS.paymentStatus[p.status]}</b></p><a href="${ENV.APP_URL}/pedido/${p.Order.code}">Voltar ao pedido</a>` : `
<form method="post"><input type="hidden" name="action" value="approve"><button class="ok">Aprovar pagamento (simulado)</button></form>
<form method="post"><input type="hidden" name="action" value="decline"><button class="no">Recusar</button></form>`}
</div></body></html>`;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
});

export const POST = route<{ id: string }>({ auth: 'none' }, async ({ req, params }) => {
    const p = await load(params.id);
    const action = (await req.formData()).get('action');
    if (p.status === 'PENDING') await applyPaymentStatus(p.id, action === 'approve' ? 'PAID' : 'FAILED');
    return NextResponse.redirect(`${ENV.APP_URL}/pedido/${p.Order.code}`, 303);
});
