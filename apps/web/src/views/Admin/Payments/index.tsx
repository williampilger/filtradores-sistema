'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Pagamentos: filtros (situação, gateway, período, atenção), totais por situação e estorno
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { formatDateTime, GATEWAY_IDS, LABELS, type GatewayId, type PaymentStatus } from '@filt/shared';
import API from '@/api';
import { Badge, Checkbox, Empty, Field, Money, PageHeader, Pagination, Select, Spinner, statusTone } from '@/components/ui';
import { FilterBar, optionsOf, RequirePerm, TableBox, useData } from '@/components/admin/common';
import RefundModal, { type RefundTarget } from '@/components/admin/RefundModal';
import { useSession } from '@/hooks/useSession';

function PaymentsInner() {
    const { can } = useSession();
    const sp = useSearchParams();
    const [status, setStatus] = useState<PaymentStatus | ''>('');
    const [gateway, setGateway] = useState<GatewayId | ''>('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [attention, setAttention] = useState(sp.get('attention') === '1');
    const [page, setPage] = useState(1);
    const [refund, setRefund] = useState<RefundTarget | null>(null);

    const { data, loading, reload } = useData(
        () => API.admin.payments.list({ status: status || undefined, gateway: gateway || undefined, from: from || undefined, to: to || undefined, attention: attention ? 1 : undefined, page }),
        [status, gateway, from, to, attention, page],
    );
    const f = <T,>(set: (v: T) => void) => (v: T) => { setPage(1); set(v); };

    return (
        <div>
            <PageHeader title="Pagamentos" />
            {attention && (
                <div className="mb-3 rounded-md border border-danger bg-danger-soft p-3 text-sm text-danger">
                    <b>Atenção:</b> pagamentos confirmados pelo gateway <b>depois</b> que o pedido já havia expirado (os itens podem ter sido liberados para outra pessoa).
                    Verifique cada caso: estorne o pagamento ou entre em contato com o cliente.
                </div>
            )}
            <FilterBar>
                <Field label="Situação"><Select<PaymentStatus | ''> value={status} className="!w-44" onChange={f(setStatus)} options={[{ value: '', label: 'Todas' }, ...optionsOf(LABELS.paymentStatus)]} /></Field>
                <Field label="Gateway"><Select<GatewayId | ''> value={gateway} className="!w-44" onChange={f(setGateway)} options={[{ value: '', label: 'Todos' }, ...GATEWAY_IDS.map(g => ({ value: g, label: LABELS.gateway[g] }))]} /></Field>
                <Field label="De"><input type="date" className="inp !w-40" value={from} onChange={e => f(setFrom)(e.target.value)} /></Field>
                <Field label="Até"><input type="date" className="inp !w-40" value={to} onChange={e => f(setTo)(e.target.value)} /></Field>
                <div className="flex h-[34px] items-center"><Checkbox checked={attention} onChange={f(setAttention)} label="Somente pagos após expiração" /></div>
            </FilterBar>

            {data && data.totals.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {data.totals.map(t => (
                        <div key={t.status} className="panel px-3 py-2 text-sm">
                            <Badge tone={statusTone(t.status)}>{LABELS.paymentStatus[t.status]}</Badge>
                            <span className="ml-2 font-semibold"><Money cents={t.amountCents} /></span>
                            <span className="ml-1 text-xs text-ink-muted">({t.count}){t.refundedCents ? <> · estornado <Money cents={t.refundedCents} /></> : null}</span>
                        </div>
                    ))}
                </div>
            )}

            {loading && !data ? <Spinner /> : !data?.rows.length ? <Empty>Nenhum pagamento encontrado.</Empty> : (
                <>
                    <TableBox>
                        <thead><tr><th>#</th><th>Data</th><th>Pedido</th><th>Gateway / forma</th><th>Situação</th><th className="num">Valor</th><th className="num">Estornado</th><th>Obs.</th><th /></tr></thead>
                        <tbody>
                            {data.rows.map(p => (
                                <tr key={p.id}>
                                    <td className="text-ink-muted">{p.id}</td>
                                    <td className="whitespace-nowrap text-xs">{formatDateTime(p.createdAt)}{p.paidAt && <div className="text-ok">pago {formatDateTime(p.paidAt)}</div>}</td>
                                    <td>
                                        {can('orders.read') ? <Link href={`/admin/pedidos/${p.order.id}`} className="font-mono text-brand hover:underline">{p.order.code}</Link> : <span className="font-mono">{p.order.code}</span>}
                                        <div className="text-xs text-ink-muted">{p.order.customerName}</div>
                                    </td>
                                    <td>{LABELS.gateway[p.gateway as GatewayId] ?? p.gateway} · {LABELS.paymentMethod[p.method]}{p.externalId && <div className="font-mono text-xs text-ink-faint">{p.externalId}</div>}</td>
                                    <td><Badge tone={statusTone(p.status)}>{LABELS.paymentStatus[p.status]}</Badge></td>
                                    <td className="num"><Money cents={p.amountCents} /></td>
                                    <td className="num">{p.refundedCents ? <span className="text-danger"><Money cents={p.refundedCents} /></span> : '-'}</td>
                                    <td className="max-w-[240px] text-xs">{p.note}{p.registeredBy && <div className="text-ink-muted">por {p.registeredBy}</div>}</td>
                                    <td className="text-right">
                                        {can('payments.refund') && (p.status === 'PAID' || p.status === 'PARTIALLY_REFUNDED') && p.amountCents > p.refundedCents && (
                                            <button className="btn btn-danger btn-sm" onClick={() => setRefund({ id: p.id, amountCents: p.amountCents, refundedCents: p.refundedCents, label: `Pedido ${p.order.code} · ${p.order.customerName}` })}>Estornar</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </TableBox>
                    <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
                </>
            )}
            <RefundModal target={refund} onClose={() => setRefund(null)} onDone={() => void reload()} />
        </div>
    );
}

export default function Payments() {
    return <RequirePerm perms={['payments.read', 'reports.finance']}><PaymentsInner /></RequirePerm>;
}
