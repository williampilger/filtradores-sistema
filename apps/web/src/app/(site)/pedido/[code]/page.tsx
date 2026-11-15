/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Pedido (pagamento, acompanhamento e ingressos)
 */
import type { Metadata } from 'next';
import Order from '@/views/Order';

export const metadata: Metadata = { title: 'Pedido' };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    return <Order code={code} />;
}
