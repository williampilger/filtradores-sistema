/**
 * 2026.11.15 - Aplica as migrations no banco de teste antes da suíte
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { config } from 'dotenv';

export default function setup() {
    config({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true });
    const url = process.env.TEST_DATABASE_URL;
    if (!url) throw new Error('Defina TEST_DATABASE_URL no .env');
    execSync('npx prisma migrate deploy', { cwd: path.resolve(import.meta.dirname, '../../db'), env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
}
