/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Upload de imagens (multipart campo `file`): valida tamanho/tipo, normaliza para webp e grava no storage
 */
import 'server-only';
import { randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { InputError } from '@filt/core';
import { normalizeImage } from '@filt/integrations/images';
import { StorageSystem } from '@filt/integrations/storage';
import ENV from './environmentConstants';

/** folder: ex. "public/products/12" ou "users/5". Retorna a chave gravada. */
export async function uploadImage(req: NextRequest, folder: string, maxSize = 1600): Promise<string> {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new InputError('Envie o arquivo no campo "file"', 261115220001);
    if (file.size > ENV.UPLOAD_MAX_MB * 1024 * 1024) throw new InputError(`Arquivo maior que ${ENV.UPLOAD_MAX_MB} MB`, 261115220002);
    if (!/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.type)) throw new InputError('Formato de imagem não suportado (use JPG, PNG ou WebP)', 261115220003);
    let out: Buffer;
    try { out = await normalizeImage(Buffer.from(await file.arrayBuffer()), maxSize); } catch { throw new InputError('Imagem inválida ou corrompida', 261115220004); }
    const key = `${folder}/${Date.now()}-${randomBytes(4).toString('hex')}.webp`;
    await StorageSystem.put(key, out);
    return key;
}
