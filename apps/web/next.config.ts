/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Configuração do Next.js
 */
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '../..');
loadEnvConfig(repoRoot); // o .env fica na raiz do monorepo

const nextConfig: NextConfig = {
    poweredByHeader: false,
    agentRules: false, // não gerar AGENTS.md automaticamente
    reactStrictMode: true,
    transpilePackages: ['@filt/db', '@filt/shared', '@filt/integrations', '@filt/core'],
    // libs nativas / node-only: não empacotar
    serverExternalPackages: ['@node-rs/argon2', '@prisma/adapter-mariadb', 'mariadb', 'sharp', 'nodemailer', 'bullmq', 'ioredis', 'pino', 'pino-pretty', '@williampilger/payment-gateways'],
    outputFileTracingRoot: repoRoot,
    turbopack: { root: repoRoot },
    allowedDevOrigins: ['sony'],
    // DEMO_MODE (servidor) controla também a faixa de demonstração no front
    env: { NEXT_PUBLIC_DEMO_MODE: process.env.DEMO_MODE === 'true' ? 'true' : 'false' },
};

export default nextConfig;
