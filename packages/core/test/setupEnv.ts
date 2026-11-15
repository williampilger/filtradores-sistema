/**
 * 2026.11.15 - Ambiente dos testes: banco de teste, Redis em DB separado (15), sem e-mail real
 */
import path from 'node:path';
import { config } from 'dotenv';

config({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });
if (!process.env.TEST_DATABASE_URL) throw new Error('Defina TEST_DATABASE_URL no .env (banco descartável)');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.REDIS_URL = (process.env.REDIS_URL ?? 'redis://localhost:6393').replace(/\/\d+$/, '') + '/15';
process.env.SMTP_HOST = '';
process.env.LOG_LEVEL = 'error';
process.env.LOG_PRETTY = 'false';
process.env.GOOGLE_CHAT_WEBHOOK = '';
process.env.QR_SIGNING_SECRET ||= 'teste';
process.env.ENCRYPTION_KEY ||= Buffer.alloc(32, 1).toString('base64');
