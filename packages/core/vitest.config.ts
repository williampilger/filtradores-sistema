/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Testes de integração do core: rodam contra TEST_DATABASE_URL (banco descartável no mysql-dev)
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globalSetup: ['./test/globalSetup.ts'],
        setupFiles: ['./test/setupEnv.ts'],
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 60_000,
    },
});
