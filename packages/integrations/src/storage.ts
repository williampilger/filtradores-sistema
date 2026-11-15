/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - StorageSystem: armazenamento de arquivos (fotos, imagens de produtos, capas de eventos)
 *
 * Drivers: `local` (disco). Nuvem fica no ToDo.
 * Chaves são caminhos relativos. Prefixos definem o acesso (ver /api/v1/files):
 *  - public/...  -> qualquer um (produtos, eventos, posts, jogadores, logo)
 *  - users/...   -> o próprio usuário ou staff com permissão (fotos de perfil - usadas na validação de entrada)
 * ⚠️ NUNCA aceitar chave vinda do cliente sem validar (path traversal) - use `safeKey`.
 */
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, rm, stat, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';

function repoRoot(): string {
    let dir = process.cwd();
    for (let i = 0; i < 6; i++) {
        if (existsSync(path.join(dir, 'docker-compose.yml')) && existsSync(path.join(dir, 'packages'))) return dir;
        dir = path.dirname(dir);
    }
    return process.cwd();
}

function root(): string {
    const p = process.env.STORAGE_LOCAL_PATH ?? '.storage';
    // relativo à RAIZ do monorepo (web e worker rodam com cwd diferentes)
    return path.isAbsolute(p) ? p : path.resolve(repoRoot(), p);
}

export function safeKey(key: string): string {
    const norm = path.posix.normalize(key.replace(/\\/g, '/')).replace(/^\/+/, '');
    if (norm.startsWith('..') || norm.includes('/../') || !/^[\w\-./]+$/.test(norm)) throw new Error('261115000060 - Chave de arquivo inválida');
    return norm;
}

const full = (key: string) => path.join(root(), safeKey(key));

export const StorageSystem = {

    driver: () => process.env.STORAGE_DRIVER ?? 'local',

    async put(key: string, data: Buffer | string): Promise<void> {
        if (StorageSystem.driver() !== 'local') throw new Error('261115000061 - Driver de storage não implementado: ' + StorageSystem.driver());
        const f = full(key);
        await mkdir(path.dirname(f), { recursive: true });
        await writeFile(f, data);
    },

    get: (key: string) => readFile(full(key)),

    stream: (key: string): Readable => createReadStream(full(key)),

    async exists(key: string): Promise<boolean> {
        try { await stat(full(key)); return true; } catch { return false; }
    },

    async remove(key: string): Promise<void> {
        await rm(full(key), { force: true });
    },

    /** URL servida pela API (/api/v1/files/...) - relativa; o app mobile prefixa com a URL da API */
    url(key: string | null | undefined): string | null {
        return key ? `/api/v1/files/${safeKey(key)}` : null;
    },
};
