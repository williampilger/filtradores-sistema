/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Notícias (feed do time)
 */
import type { Metadata } from 'next';
import News from '@/views/News';

export const metadata: Metadata = { title: 'Notícias' };

export default function Page() { return <News />; }
