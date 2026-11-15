/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Prisma Client singleton (compartilhado entre web e worker) - MySQL via @prisma/adapter-mariadb
 */
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from './generated/prisma/client';

// ⚠️ No Next.js (dev) os módulos são recarregados a cada alteração. Sem o cache no globalThis,
// cada reload abriria um novo pool de conexões até estourar o limite do MySQL.
const globalForPrisma = globalThis as unknown as { __filtPrisma?: PrismaClient };

function createClient() {

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('261115000001 - DATABASE_URL não definida');

    const url = new URL(databaseUrl);
    const adapter = new PrismaMariaDb({
        host: url.hostname,
        port: url.port ? Number(url.port) : 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: decodeURIComponent(url.pathname.replace(/^\//, '')),
        connectionLimit: Number(process.env.DATABASE_POOL_MAX ?? 10),
        // MySQL 8 com caching_sha2_password sem TLS (container local): o driver precisa buscar a chave pública
        allowPublicKeyRetrieval: true,
        timezone: 'Z',
    });

    return new PrismaClient({
        adapter,
        log: process.env.PRISMA_LOG_QUERIES === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });
}

export const prisma = globalForPrisma.__filtPrisma ?? createClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__filtPrisma = prisma;
