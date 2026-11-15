/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Seed BASE (idempotente - roda em todo deploy): configurações do clube, papéis padrão, master, gateways
 *
 * ⚠️ Papéis existentes NÃO têm as permissões sobrescritas (a diretoria pode ter editado pelo painel).
 */
import { hash } from '@node-rs/argon2';
import { DEFAULT_ROLES, GATEWAY_METHODS, EXTERNAL_GATEWAYS } from '@filt/shared';
import { prisma } from '../src/client';

async function main() {
    await prisma.clubSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: 'ACE Filtradores', shortName: 'ACEF', city: 'Bom Princípio - RS', about: 'Associação Cultural e Esportiva Filtradores - futsal de Bom Princípio-RS.', instagram: 'acefiltradores', primaryColor: '#1b3fd1', secondaryColor: '#d62631' } });

    for (const r of DEFAULT_ROLES) {
        const existing = await prisma.role.findUnique({ where: { key: r.key } });
        if (existing) continue;
        await prisma.role.create({
            data: { key: r.key, name: r.name, description: r.description, require2fa: r.require2fa, Permissions: { create: r.permissions.map(permission => ({ permission })) } },
        });
        console.log(`✔ Papel criado: ${r.name}`);
    }

    for (const g of EXTERNAL_GATEWAYS) {
        await prisma.gatewayConfig.upsert({ where: { gateway: g }, update: {}, create: { gateway: g, enabled: false, sandbox: true, methods: GATEWAY_METHODS[g] } });
    }

    const email = process.env.MASTER_EMAIL?.toLowerCase();
    const password = process.env.MASTER_PASSWORD;
    if (email && password) {
        const exists = await prisma.user.findUnique({ where: { email } });
        if (!exists) {
            await prisma.user.create({
                data: { email, name: process.env.MASTER_NAME ?? 'Master', isMaster: true, emailVerifiedAt: new Date(), passwordHash: await hash(password, { algorithm: 2 }) },
            });
            console.log(`✔ Master criado: ${email} (2FA será exigido no primeiro login)`);
        }
    }
}

main().then(() => prisma.$disconnect()).catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
