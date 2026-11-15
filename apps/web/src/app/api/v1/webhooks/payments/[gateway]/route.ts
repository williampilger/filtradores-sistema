/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔓 POST webhook dos gateways de pagamento (assinatura validada pelo pacote payment-gateways)
 *
 * ⚠️ O corpo é lido como TEXTO bruto (reserializar o JSON quebra a assinatura).
 */
import { handleWebhook } from '@filt/core';
import { route } from '@/lib/authenticate';

export const POST = route<{ gateway: string }>({ auth: 'none' }, async ({ req, params }) => {
    const rawBody = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => { headers[k] = v; });
    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    return handleWebhook(params.gateway, { rawBody, headers, query });
});
