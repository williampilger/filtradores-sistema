/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - ESLint (flat config) para o monorepo (o app mobile usa o lint do Expo)
 */
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/generated/**', '**/*.d.ts', '.storage/**', 'apps/mobile/**'] },
    ...tseslint.configs.recommended,
    {
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
        rules: {
            // variáveis desestruturadas só para remover campos: prefixo "_"
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
    {
        files: ['apps/web/**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks, '@next/next': nextPlugin },
        rules: {
            ...reactHooks.configs.recommended.rules,
            ...nextPlugin.configs.recommended.rules,
            '@next/next/no-img-element': 'off', // imagens vêm do storage (sem otimizador)
            // regras novas do react-hooks 7 (React Compiler) - o projeto não usa o compiler
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/refs': 'off',
            'react-hooks/purity': 'off',
            'react-hooks/immutability': 'off',
            'react-hooks/static-components': 'off',
            'react-hooks/preserve-manual-memoization': 'off',
            'react-hooks/incompatible-library': 'off',
        },
        settings: { next: { rootDir: 'apps/web' } },
    },
);
