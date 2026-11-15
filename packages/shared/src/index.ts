/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - @filt/shared (usado por web, worker E app mobile: nada de node-only aqui!)
 */
export * from './enums';
export * from './permissions';
export * from './qr';
export * from './format';
export * from './billing';
export * from './schemas';
export * from './types';

/** Filas BullMQ (web enfileira, worker processa) */
export const QUEUES = {
    webhooks: 'filt-payment-webhooks',
    mail: 'filt-mail',
    images: 'filt-images',
} as const;
