/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Configuração do Prisma 7 (o .env fica na raiz do monorepo)
 */
import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

config({ path: path.resolve(import.meta.dirname, '../../.env'), quiet: true });

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
        seed: 'tsx --env-file=../../.env prisma/seed.ts',
    },
    datasource: {
        url: env('DATABASE_URL'),
        shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
    },
});
