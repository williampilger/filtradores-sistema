/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Loja oficial
 */
import type { Metadata } from 'next';
import Store from '@/views/Store';

export const metadata: Metadata = { title: 'Loja' };

export default function Page() { return <Store />; }
