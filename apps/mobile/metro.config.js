/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Metro (monorepo npm workspaces: resolve @filt/shared direto do TS em packages/shared/src)
 */
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// O Expo (SDK 52+) já detecta o monorepo; deixamos explícito para não depender da heurística.
config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), monorepoRoot]));
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
