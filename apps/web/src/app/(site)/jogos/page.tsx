/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Agenda de jogos
 */
import type { Metadata } from 'next';
import Events from '@/views/Events';

export const metadata: Metadata = { title: 'Jogos e ingressos' };

export default function Page() { return <Events />; }
