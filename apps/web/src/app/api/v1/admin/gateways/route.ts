/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 GET configuração dos gateways (segredos NUNCA voltam: só "preenchido"/"vazio") + URL de webhook
 */
import { prisma } from '@filt/db';
import { CoreEnv, readCredentials } from '@filt/core';
import { GATEWAY_CREDENTIAL_FIELDS, GATEWAY_METHODS, type GatewayId } from '@filt/shared';
import { route } from '@/lib/authenticate';

export const GET = route({ perm: 'gateways.manage' }, async () => {
    const rows = await prisma.gatewayConfig.findMany({ orderBy: { priority: 'asc' } });
    return rows.map(r => {
        const cred = readCredentials(r.credentialsEnc);
        return {
            gateway: r.gateway, enabled: r.enabled, sandbox: r.sandbox, priority: r.priority, updatedAt: r.updatedAt,
            methods: Array.isArray(r.methods) ? r.methods : GATEWAY_METHODS[r.gateway as GatewayId],
            supportedMethods: GATEWAY_METHODS[r.gateway as GatewayId] ?? [],
            fields: (GATEWAY_CREDENTIAL_FIELDS[r.gateway] ?? []).map(f => ({ ...f, filled: !!cred[f.key] })),
            webhookUrl: `${CoreEnv.PAYMENTS_WEBHOOK_BASE}/api/v1/webhooks/payments/${r.gateway}`,
        };
    });
});
