'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Meus pedidos
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatDateTime, formatMoney, LABELS, type OrderDTO } from '@filt/shared';
import API from '@/api';
import { Badge, Empty, Spinner, statusTone } from '@/components/ui';

export function OrdersTab() {
    const [orders, setOrders] = useState<OrderDTO[] | null>(null);
    useEffect(() => { API.me.orders().then(r => setOrders(r.success ? r.data : [])); }, []);

    if (orders === null) return <Spinner />;
    if (!orders.length) return <Empty>Você ainda não fez pedidos. <Link href="/loja" className="font-semibold text-brand hover:underline">Conheça a loja</Link></Empty>;

    return (
        <ul className="flex flex-col gap-3">
            {orders.map(o => (
                <li key={o.id}>
                    <Link href={`/pedido/${o.code}`} className="panel flex flex-col gap-2 p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-sm font-bold">{o.code}</span>
                                <Badge tone={statusTone(o.status)}>{LABELS.orderStatus[o.status]}</Badge>
                            </div>
                            <div className="mt-1 truncate text-sm text-ink-muted">{o.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</div>
                            <div className="text-xs text-ink-faint">{formatDateTime(o.createdAt)}</div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                            <span className="text-lg font-bold text-brand">{formatMoney(o.totalCents)}</span>
                            {o.status === 'PENDING_PAYMENT' && <span className="btn btn-accent btn-sm">Pagar</span>}
                        </div>
                    </Link>
                </li>
            ))}
        </ul>
    );
}
