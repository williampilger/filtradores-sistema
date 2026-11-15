/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Leitor de QR da portaria (validação de ingressos e carteirinhas)
 */
import type { Metadata } from 'next';
import { DemoBanner } from '@/components/site/DemoBanner';
import GateScanner from '@/views/GateScanner';

export const metadata: Metadata = { title: 'Validar entradas' };

export default function Page() {
    return (
        <>
            <DemoBanner />
            <GateScanner />
        </>
    );
}
