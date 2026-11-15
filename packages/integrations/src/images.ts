/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Normalização de imagens enviadas (redimensiona e converte para WebP)
 */
import sharp from 'sharp';

/** Redimensiona (sem ampliar) e converte para webp. Remove EXIF (localização de fotos de celular). */
export async function normalizeImage(input: Buffer, maxSize = 1600): Promise<Buffer> {
    return sharp(input, { failOn: 'error' })
        .rotate() // respeita a orientação EXIF antes de descartá-la
        .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
}
