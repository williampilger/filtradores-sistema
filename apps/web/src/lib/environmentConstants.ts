/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Variáveis de ambiente tipadas do web (somente servidor!)
 */
import 'server-only';

interface EnvConfig {
    SUPPRESS_RESPONSE_ERROR_MESSAGES: boolean;
    SERVER_UNDER_MAINTENANCE: boolean;
    APP_URL: string;
    SESSION_MAX_AGE_DAYS: number;
    COOKIE_SECURE: boolean;
    TOTP_ISSUER: string;
    LOGIN_MAX_ATTEMPTS: number;
    UPLOAD_MAX_MB: number;
}

const requiredEnvVars = ['DATABASE_URL', 'ENCRYPTION_KEY', 'QR_SIGNING_SECRET'] as const;
for (const v of requiredEnvVars) {
    if (!process.env[v]) {
        console.error(`❌ Variável de ambiente obrigatória ausente: ${v}`);
        if (process.env.NEXT_PHASE !== 'phase-production-build') process.exit(1);
    }
}

process.env.LOG_APP_NAME ??= 'filt-web';

const ENV: EnvConfig = {
    SUPPRESS_RESPONSE_ERROR_MESSAGES: process.env.SUPPRESS_RESPONSE_ERROR_MESSAGES === 'true',
    SERVER_UNDER_MAINTENANCE: process.env.SERVER_UNDER_MAINTENANCE === 'true',
    APP_URL: (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
    SESSION_MAX_AGE_DAYS: parseInt(process.env.SESSION_MAX_AGE_DAYS ?? '60', 10),
    COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
    TOTP_ISSUER: process.env.TOTP_ISSUER || 'Filtradores',
    LOGIN_MAX_ATTEMPTS: parseInt(process.env.LOGIN_MAX_ATTEMPTS ?? '8', 10),
    UPLOAD_MAX_MB: parseInt(process.env.UPLOAD_MAX_MB ?? '10', 10),
};

export default ENV;
