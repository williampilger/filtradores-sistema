'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Pedidos: filtros (situação, canal, busca, entregas pendentes) e paginação
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { formatDateTime, LABELS, ORDER_STATUS, type GatewayId, type OrderChannel, type OrderStatus } from '@filt/shared';
import API from '@/api';
import { Badge, Checkbox, Empty, Input, Money, PageHeader, Pagination, Select, Spinner, statusTone } from '@/components/ui';
import { FilterBar, optionsOf, RequirePerm, TableBox, useData } from '@/components/admin/common';

function OrdersInner() {
    const sp = useSearchParams();
    const st = sp.get('status');
    const [status, setStatus] = useState<OrderStatus | ''>((ORDER_STATUS as readonly string[]).includes(st ?? '') ? st as OrderStatus : '');
    const [channel, setChannel] = useState<OrderChannel | ''>('');
    const [pending, setPending] = useState(sp.get('delivery') === 'pending');
    const [q, setQ] = useState(sp.get('q') ?? '');
    const [search, setSearch] = useState(sp.get('q') ?? '');
    const [page, setPage] = useState(1);

    const { data, loading } = useData(() => API.admin.orders.list({ status: status || undefined, channel: channel || undefined, q: search || undefined, delivery: pending ? 'pending' : undefined, page }),
        [status, channel, search, pending, page]);

    return (
        <div>
            <PageHeader title="Pedidos" subtitle="Ingressos, loja e mensalidades" />
            <FilterBar>
                <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}>
                    <Input value={q} onChange={setQ} placeholder="Código, nome, e-mail ou CPF" className="!w-64" />
                    <button className="btn">Buscar</button>
                </form>
                <Select<OrderStatus | ''> value={status} className="!w-52" disabled={pending} onChange={v => { setPage(1); setStatus(v); }} options={[{ value: '', label: 'Todas as situações' }, ...optionsOf(LABELS.orderStatus)]} />
                <Select<OrderChannel | ''> value={channel} className="!w-40" onChange={v => { setPage(1); setChannel(v); }} options={[{ value: '', label: 'Todos os canais' }, ...optionsOf(LABELS.orderChannel)]} />
                <div className="flex h-[34px] items-center"><Checkbox checked={pending} onChange={v => { setPage(1); setPending(v); }} label="Com itens a entregar" /></div>
            </FilterBar>

            {loading && !data ? <Spinner /> : !data?.rows.length ? <Empty>Nenhum pedido encontrado.</Empty> : (
                <>
                    <TableBox>
                        <thead><tr><th>Código</th><th>Data</th><th>Cliente</th><th>Itens</th><th>Canal</th><th className="num">Total</th><th>Situação</th><th>Último pagamento</th><th>Entrega</th></tr></thead>
                        <tbody>
                            {data.rows.map(o => (
                                <tr key={o.id}>
                                    <td><Link href={`/admin/pedidos/${o.id}`} className="font-mono font-semibold text-brand hover:underline">{o.code}</Link></td>
                                    <td className="whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                                    <td>{o.customerName}{o.customerEmail && <div className="text-xs text-ink-muted">{o.customerEmail}</div>}</td>
                                    <td className="max-w-[280px] truncate text-xs" title={o.items}>{o.items}</td>
                                    <td>{LABELS.orderChannel[o.channel]}</td>
                                    <td className="num"><Money cents={o.totalCents} />{o.refundedCents > 0 && <div className="text-xs text-danger">-<Money cents={o.refundedCents} /></div>}</td>
                                    <td><Badge tone={statusTone(o.status)}>{LABELS.orderStatus[o.status]}</Badge></td>
                                    <td className="text-xs">{o.lastPayment ? <>{LABELS.gateway[o.lastPayment.gateway as GatewayId] ?? o.lastPayment.gateway} · {LABELS.paymentMethod[o.lastPayment.method]}<div className="text-ink-muted">{LABELS.paymentStatus[o.lastPayment.status]}</div></> : '-'}</td>
                                    <td>{o.pendingDelivery > 0 ? <Badge tone="warn">{o.pendingDelivery} a entregar</Badge> : <span className="text-ink-faint">-</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </TableBox>
                    <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
                </>
            )}
        </div>
    );
}

export default function Orders() {
    return <RequirePerm perms={['orders.read']}><OrdersInner /></RequirePerm>;
}
