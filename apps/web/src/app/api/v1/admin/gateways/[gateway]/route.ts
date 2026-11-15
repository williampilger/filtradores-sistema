/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - 🔑 PUT salva configuração do gateway (credenciais vazias mantêm o valor salvo)
 */
import { z } from 'zod';
import { prisma } from '@filt/db';
import { audit, InputError, invalidateGateways, readCredentials, writeCredentials } from '@filt/core';
import { GATEWAY_CREDENTIAL_FIELDS, GATEWAY_METHODS, PAYMENT_METHODS, type GatewayId } from '@filt/shared';
import { route } from '@/lib/authenticate';

export const PUT = route<{ gateway: string }>({ perm: 'gateways.manage' }, async ({ req, params, auth }) => {
    const gw = params.gateway;
    const fields = GATEWAY_CREDENTIAL_FIELDS[gw];
    if (!fields) throw new InputError('Gateway desconhecido', 261115320003);
    const b = z.object({
        enabled: z.boolean(), sandbox: z.boolean(), priority: z.number().int().min(0).max(1000),
        methods: z.array(z.enum(PAYMENT_METHODS)), credentials: z.record(z.string(), z.string()).optional(),
    }).parse(await req.json());
    const supported = GATEWAY_METHODS[gw as GatewayId];
    const methods = b.methods.filter(m => supported.includes(m));

    const row = await prisma.gatewayConfig.findUnique({ where: { gateway: gw } });
    const cred = readCredentials(row?.credentialsEnc ?? null);
    for (const f of fields) {
        const v = b.credentials?.[f.key];
        if (v !== undefined && v.trim() !== '') cred[f.key] = v.trim();
        if (v === '__CLEAR__') delete cred[f.key];
    }
    if (b.enabled) {
        const missing = fields.filter(f => f.required && !cred[f.key]);
        if (missing.length) throw new InputError(`Preencha antes de habilitar: ${missing.map(f => f.label).join(', ')}`, 261115320004);
    }
    await prisma.gatewayConfig.upsert({
        where: { gateway: gw },
        create: { gateway: gw, enabled: b.enabled, sandbox: b.sandbox, priority: b.priority, methods, credentialsEnc: writeCredentials(cred), updatedById: auth.user.id },
        update: { enabled: b.enabled, sandbox: b.sandbox, priority: b.priority, methods, credentialsEnc: writeCredentials(cred), updatedById: auth.user.id },
    });
    invalidateGateways();
    await audit({ userId: auth.user.id, action: 'gateway.update', entity: 'gateway', entityId: gw, data: { enabled: b.enabled, sandbox: b.sandbox, priority: b.priority, methods, credentialsChanged: Object.keys(b.credentials ?? {}).filter(k => b.credentials![k]) } });
    return { ok: true };
});
