/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Ponte entre o banco (GatewayConfig) e o pacote @williampilger/payment-gateways
 *
 * - Credenciais ficam criptografadas (AES-256-GCM) em GatewayConfig.credentialsEnc.
 * - `manual` e `courtesy` estão SEMPRE registrados (não têm credenciais).
 * - O registry fica em cache por 60 s (e é invalidado ao salvar a configuração).
 */
import { prisma } from '@filt/db';
import { decryptString, encrypt } from '@filt/integrations/crypto';
import { EXTERNAL_GATEWAYS, GATEWAY_METHODS, type GatewayId, type PaymentMethod } from '@filt/shared';
import { createGateway, createPaymentRegistry, type PaymentGateway, type PaymentRegistry } from '@williampilger/payment-gateways';
import { createDemoGateway, isDemoMode } from './demoGateway';
import { InputError } from './errors';
import { LogSystem } from './log';

type LoadedConfig = { gateway: string, enabled: boolean, sandbox: boolean, methods: PaymentMethod[], priority: number, credentials: Record<string, string> };

let cached: { at: number, registry: PaymentRegistry, configs: LoadedConfig[] } | null = null;

export function invalidateGateways() { cached = null; }

export function readCredentials(enc: Uint8Array | null): Record<string, string> {
    if (!enc) return {};
    try { return JSON.parse(decryptString(enc)) as Record<string, string>; } catch (e) {
        LogSystem.ERROR(261115110001, `Credenciais de gateway ilegíveis (ENCRYPTION_KEY trocada?): ${(e as Error).message}`);
        return {};
    }
}

export const writeCredentials = (c: Record<string, string>) => encrypt(JSON.stringify(c));

async function loadConfigs(): Promise<LoadedConfig[]> {
    const rows = await prisma.gatewayConfig.findMany();
    return rows.map(r => ({
        gateway: r.gateway, enabled: r.enabled, sandbox: r.sandbox, priority: r.priority,
        methods: (Array.isArray(r.methods) ? r.methods : GATEWAY_METHODS[r.gateway as GatewayId] ?? []) as PaymentMethod[],
        credentials: readCredentials(r.credentialsEnc),
    }));
}

function build(c: LoadedConfig): PaymentGateway | null {
    const cr = c.credentials;
    try {
        switch (c.gateway) {
            case 'stripe': return cr.secretKey ? createGateway('stripe', { sandbox: c.sandbox, secretKey: cr.secretKey, webhookSecret: cr.webhookSecret }) : null;
            case 'mercadopago': return cr.accessToken ? createGateway('mercadopago', { sandbox: c.sandbox, accessToken: cr.accessToken, webhookSecret: cr.webhookSecret }) : null;
            case 'pagseguro': return cr.token ? createGateway('pagseguro', { sandbox: c.sandbox, token: cr.token, webhookToken: cr.webhookToken || undefined }) : null;
            case 'asaas': return cr.apiKey ? createGateway('asaas', { sandbox: c.sandbox, apiKey: cr.apiKey, webhookToken: cr.webhookToken }) : null;
            default: return null;
        }
    } catch (e) {
        LogSystem.ERROR(261115110002, `Gateway ${c.gateway} com configuração inválida: ${(e as Error).message}`);
        return null;
    }
}

/** Registry com TODOS os gateways configurados (habilitados ou não - webhooks de desabilitados ainda chegam) */
export async function getPayments(): Promise<{ registry: PaymentRegistry, configs: LoadedConfig[] }> {
    if (cached && Date.now() - cached.at < 60_000) return cached;
    const configs = await loadConfigs();
    const gateways: PaymentGateway[] = [createGateway('manual', {}), createGateway('courtesy', {})];
    if (isDemoMode()) gateways.push(createDemoGateway());
    for (const c of configs) {
        if (!EXTERNAL_GATEWAYS.includes(c.gateway as GatewayId)) continue;
        const g = build(c);
        if (g) gateways.push(g);
    }
    cached = { at: Date.now(), registry: createPaymentRegistry({ gateways }), configs };
    return cached;
}

/** Métodos que o torcedor pode escolher agora (gateways externos habilitados) */
export async function availablePublicMethods(): Promise<PaymentMethod[]> {
    const { registry, configs } = await getPayments();
    const set = new Set<PaymentMethod>();
    for (const c of configs) {
        if (!c.enabled || !registry.has(c.gateway)) continue;
        const caps = registry.get(c.gateway).capabilities.methods;
        for (const m of c.methods) if (caps.includes(m) && ['PIX', 'CARD', 'BOLETO', 'CHECKOUT'].includes(m)) set.add(m);
    }
    // demonstração: tudo disponível pelo gateway simulado
    if (isDemoMode()) for (const m of ['PIX', 'CARD', 'BOLETO'] as PaymentMethod[]) set.add(m);
    return [...set];
}

/** Escolhe o gateway externo habilitado de menor prioridade que atende o método */
export async function pickGateway(method: PaymentMethod): Promise<PaymentGateway> {
    const { registry, configs } = await getPayments();
    if (method === 'CASH' || method === 'MANUAL') return registry.get('manual');
    if (method === 'COURTESY') return registry.get('courtesy');
    const candidates = configs
        .filter(c => c.enabled && c.methods.includes(method) && registry.has(c.gateway) && registry.get(c.gateway).capabilities.methods.includes(method))
        .sort((a, b) => a.priority - b.priority);
    if (!candidates.length && isDemoMode() && registry.has('demo')) return registry.get('demo');
    if (!candidates.length) throw new InputError(`Forma de pagamento indisponível no momento (${method})`, 261115110003);
    return registry.get(candidates[0].gateway);
}
