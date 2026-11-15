/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Gateway de DEMONSTRAÇÃO (somente com DEMO_MODE=true)
 *
 * Simula PIX / cartão / boleto / checkout para apresentar os fluxos sem credenciais reais:
 *  - PIX/boleto: aprovado automaticamente DEMO_APPROVE_SECONDS após a criação (consultado por getCharge)
 *  - cartão/checkout: página simulada /api/v1/demo/checkout/<paymentId> (aprovar/recusar)
 * ⚠️ NUNCA habilitar DEMO_MODE em produção com dados reais: qualquer um "pagaria" sem pagar.
 */
import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import type { ChargeResult, CreateChargeInput, PaymentGateway, RefundInput, WebhookRequest } from '@williampilger/payment-gateways';
import { CoreEnv } from './env';

export const isDemoMode = () => process.env.DEMO_MODE === 'true';
const APPROVE_MS = () => Number(process.env.DEMO_APPROVE_SECONDS ?? 12) * 1000;

/** externalId carrega o instante de criação: demo_<ms>_<método>_<rand> */
const parseId = (id: string) => { const [, ms, method] = id.split('_'); return { createdAt: Number(ms), method }; };

export function createDemoGateway(): PaymentGateway {
    return {
        id: 'demo',
        capabilities: { methods: ['PIX', 'CARD', 'BOLETO', 'CHECKOUT'], refund: true, partialRefund: true, cancel: true, webhooks: false },
        async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
            const externalId = `demo_${Date.now()}_${input.method}_${randomBytes(4).toString('hex')}`;
            const pixCode = `00020126DEMONSTRACAO-ACEF-NAO-PAGAR-${externalId}5204000053039865802BR5915ACE FILTRADORES6013BOM PRINCIPIO`;
            const paymentId = input.externalReference.replace('pay_', '');
            const base: ChargeResult = { gateway: 'demo', externalId, status: 'PENDING', amountCents: input.amountCents, externalReference: input.externalReference, raw: { demo: true } };
            if (input.method === 'PIX') {
                const png = await QRCode.toDataURL(pixCode, { margin: 1, width: 280 });
                return { ...base, pix: { copiaECola: pixCode, qrCodeBase64: png.replace(/^data:image\/png;base64,/, '') } };
            }
            if (input.method === 'BOLETO') return { ...base, boletoUrl: `${CoreEnv.APP_URL}/api/v1/demo/checkout/${paymentId}`, boletoBarcode: '00000.00000 00000.000000 00000.000000 0 00000000000000' };
            return { ...base, checkoutUrl: `${CoreEnv.APP_URL}/api/v1/demo/checkout/${paymentId}` };
        },
        async getCharge(externalId: string): Promise<ChargeResult> {
            const { createdAt, method } = parseId(externalId);
            const auto = method === 'PIX' || method === 'BOLETO';
            const paid = auto && Date.now() - createdAt > APPROVE_MS();
            return { gateway: 'demo', externalId, status: paid ? 'PAID' : 'PENDING', amountCents: 0, paidAt: paid ? new Date() : undefined, raw: { demo: true } };
        },
        async cancelCharge(externalId: string): Promise<ChargeResult> {
            return { gateway: 'demo', externalId, status: 'CANCELED', amountCents: 0, raw: { demo: true } };
        },
        async refund(input: RefundInput) {
            return { externalRefundId: `demo_refund_${randomBytes(4).toString('hex')}`, status: 'DONE' as const, amountCents: input.amountCents ?? 0, raw: { demo: true } };
        },
        async parseWebhook(_req: WebhookRequest): Promise<never> {
            throw new Error('Gateway de demonstração não recebe webhooks');
        },
    };
}
