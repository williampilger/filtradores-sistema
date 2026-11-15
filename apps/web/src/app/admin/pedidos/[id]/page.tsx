'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Pedido (wrapper)
 */
import { use } from 'react';
import OrderDetail from '@/views/Admin/OrderDetail';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <OrderDetail id={Number(id)} />;
}
