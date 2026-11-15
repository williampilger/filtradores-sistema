'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Pedido: cliente, itens (entrega/retirada), ingressos, pagamentos e estornos; ações de cancelar,
 *              registrar pagamento manual e estornar
 */
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatCpf, formatDateTime, LABELS, type GatewayId } from '@filt/shared';
import API from '@/api';
import type { AdminOrderDetail } from '@/api/types';
import { Badge, Card, confirmAction, Empty, Field, Modal, Money, PageHeader, Select, Spinner, statusTone, TextArea } from '@/components/ui';
import { RequirePerm, TableBox, useBusy, useData } from '@/components/admin/common';
import RefundModal, { type RefundTarget } from '@/components/admin/RefundModal';
import { useSession } from '@/hooks/useSession';

type Item = AdminOrderDetail['items'][number];
const DELIVERY_STEPS = [
    { to: 'PENDING', label: 'A separar' },
    { to: 'READY_FOR_PICKUP', label: 'Pronto p/ retirada' },
    { to: 'DELIVERED', label: 'Entregue' },
] as const;

function ManualPaymentModal({ order, open, onClose, onDone }: { order: AdminOrderDetail, open: boolean, onClose: () => void, onDone: () => void }) {
    const [method, setMethod] = useState<'CASH' | 'MANUAL'>('CASH');
    const [note, setNote] = useState('');
    const { busy, run } = useBusy();
    const submit = async () => {
        const r = await run('pay', () => API.admin.orders.manualPayment(order.id, method, note.trim() || undefined));
        if (r.success) { toast.success('Pagamento registrado'); setNote(''); onClose(); onDone(); }
    };
    return (
        <Modal open={open} title={`Registrar pagamento do pedido ${order.code}`} onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!!busy} onClick={() => void submit()}>{busy ? 'Registrando...' : `Registrar ${(order.totalCents / 100).toFixed(2).replace('.', ',')}`}</button></>}>
            <div className="space-y-3">
                <p className="text-sm">Valor: <b><Money cents={order.totalCents} /></b>. O pedido será marcado como pago e os itens liberados (ingressos emitidos, estoque baixado).</p>
                <Field label="Forma"><Select value={method} onChange={setMethod} options={[{ value: 'CASH', label: 'Dinheiro' }, { value: 'MANUAL', label: 'Manual (transferência, PIX direto etc.)' }]} /></Field>
                <Field label="Observação"><TextArea value={note} onChange={setNote} rows={2} /></Field>
            </div>
        </Modal>
    );
}

function OrderDetailInner({ id }: { id: number }) {
    const { can } = useSession();
    const { data: o, loading, reload } = useData(() => API.admin.orders.get(id), [id]);
    const [paying, setPaying] = useState(false);
    const [refund, setRefund] = useState<RefundTarget | null>(null);
    const { busy, run } = useBusy();

    if (loading && !o) return <Spinner />;
    if (!o) return <Empty>Pedido não encontrado.</Empty>;
    const refresh = () => void reload();
    const pendingPay = o.status === 'PENDING_PAYMENT';

    const cancel = async () => {
        if (!confirmAction(`Cancelar o pedido ${o.code}? As reservas (ingressos/estoque) serão liberadas.`)) return;
        const r = await run('cancel', () => API.admin.orders.cancel(o.id));
        if (r.success) { toast.success('Pedido cancelado'); refresh(); }
    };
    const setDelivery = async (item: Item, to: 'PENDING' | 'READY_FOR_PICKUP' | 'DELIVERED') => {
        if (to === 'DELIVERED' && !confirmAction(`Confirmar a entrega de "${item.name}" (${item.quantity} un.)?`)) return;
        const r = await run(`d${item.id}`, () => API.admin.orders.setDelivery(item.id, to));
        if (r.success) { toast.success(`Item: ${LABELS.deliveryStatus[to]}`); refresh(); }
    };
    const tickets = o.items.flatMap(i => i.tickets);

    return (
        <div className="space-y-4">
            <PageHeader title={<span>Pedido <span className="font-mono">{o.code}</span></span>}
                subtitle={<span className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(o.status)}>{LABELS.orderStatus[o.status]}</Badge>
                    <span>{LABELS.orderChannel[o.channel]}</span>
                    <span>· criado {formatDateTime(o.createdAt)}{o.createdBy ? ` por ${o.createdBy}` : ''}</span>
                    {o.paidAt && <span>· pago {formatDateTime(o.paidAt)}</span>}
                    {o.canceledAt && <span>· cancelado {formatDateTime(o.canceledAt)}</span>}
                    {pendingPay && o.expiresAt && <span>· expira {formatDateTime(o.expiresAt)}</span>}
                </span>}
                actions={<>
                    <Link href="/admin/pedidos" className="btn">‹ Pedidos</Link>
                    <Link href={`/pedido/${o.code}`} target="_blank" className="btn">Página do pedido</Link>
                    {pendingPay && can('payments.manual') && <button className="btn btn-primary" onClick={() => setPaying(true)}>Registrar pagamento manual</button>}
                    {pendingPay && can('orders.manage') && <button className="btn btn-danger" disabled={!!busy} onClick={() => void cancel()}>Cancelar pedido</button>}
                </>} />

            <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Cliente">
                    <dl className="space-y-1 text-sm">
                        <div className="font-medium">{o.customer.name}</div>
                        {o.customer.email && <div className="text-ink-muted">{o.customer.email}</div>}
                        {o.customer.phone && <div className="text-ink-muted">{o.customer.phone}</div>}
                        {o.customer.cpf && <div className="text-ink-muted">CPF {formatCpf(o.customer.cpf)}</div>}
                        {o.user && <div className="pt-1">Conta: {can('users.read', 'members.read') ? <Link href={`/admin/usuarios/${o.user.id}`} className="text-brand hover:underline">{o.user.name}</Link> : o.user.name}</div>}
                        {o.notes && <div className="pt-2 text-xs text-ink-muted">Obs.: {o.notes}</div>}
                    </dl>
                </Card>
                <Card title="Valores" className="lg:col-span-2">
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <div><div className="lbl">Subtotal</div><Money cents={o.subtotalCents} /></div>
                        <div><div className="lbl">Descontos</div><Money cents={o.discountCents} /></div>
                        <div><div className="lbl">Total</div><b><Money cents={o.totalCents} /></b></div>
                        <div><div className="lbl">Estornado</div><span className={o.refundedCents ? 'text-danger' : ''}><Money cents={o.refundedCents} /></span></div>
                    </div>
                </Card>
            </div>

            <Card title="Itens">
                <TableBox>
                    <thead><tr><th>Item</th><th className="num">Qtd.</th><th className="num">Unit.</th><th className="num">Desc.</th><th className="num">Total</th><th>Entrega</th><th /></tr></thead>
                    <tbody>
                        {o.items.map(i => {
                            const deliverable = (i.kind === 'PRODUCT' || i.kind === 'PREORDER') && o.status === 'PAID' && i.deliveryStatus !== 'CANCELED';
                            return (
                                <tr key={i.id}>
                                    <td>{i.name}<div className="text-xs text-ink-muted">{i.kind === 'TICKET' ? 'Ingresso' : i.kind === 'MEMBERSHIP' ? 'Mensalidade' : i.kind === 'PREORDER' ? 'Encomenda' : 'Produto'}</div></td>
                                    <td className="num">{i.quantity}</td>
                                    <td className="num"><Money cents={i.unitPriceCents} /></td>
                                    <td className="num">{i.discountCents ? <Money cents={i.discountCents} /> : '-'}</td>
                                    <td className="num"><Money cents={i.totalCents} /></td>
                                    <td>
                                        {i.deliveryStatus !== 'NOT_APPLICABLE' ? <Badge tone={statusTone(i.deliveryStatus)}>{LABELS.deliveryStatus[i.deliveryStatus]}</Badge> : <span className="text-ink-faint">-</span>}
                                        {i.deliveredAt && <div className="text-xs text-ink-muted">{formatDateTime(i.deliveredAt)}</div>}
                                    </td>
                                    <td className="whitespace-nowrap text-right">
                                        {deliverable && can('orders.manage') && (
                                            <div className="inline-flex gap-1">
                                                {DELIVERY_STEPS.map(s => (
                                                    <button key={s.to} className={`btn btn-sm ${i.deliveryStatus === s.to ? 'btn-primary' : ''}`} disabled={!!busy || i.deliveryStatus === s.to} onClick={() => void setDelivery(i, s.to)}>{s.label}</button>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </TableBox>
            </Card>

            {tickets.length > 0 && (
                <Card title={`Ingressos (${tickets.length})`}>
                    <TableBox>
                        <thead><tr><th>Código</th><th>Titular</th><th>Evento</th><th>Lote</th><th>Origem</th><th>Situação</th><th>Utilizado</th></tr></thead>
                        <tbody>
                            {tickets.map(t => (
                                <tr key={t.id}>
                                    <td className="font-mono">{t.code}</td>
                                    <td>{t.holderName}</td>
                                    <td>{can('events.read', 'events.write') ? <Link href={`/admin/eventos/${t.event.id}`} className="text-brand hover:underline">{t.event.title}</Link> : t.event.title}</td>
                                    <td>{t.ticketTypeName ?? '-'}</td>
                                    <td>{LABELS.ticketOrigin[t.origin]}</td>
                                    <td><Badge tone={statusTone(t.status)}>{LABELS.ticketStatus[t.status]}</Badge></td>
                                    <td className="whitespace-nowrap">{formatDateTime(t.usedAt) || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </TableBox>
                </Card>
            )}

            <Card title="Pagamentos">
                {o.payments.length === 0 ? <Empty>Nenhuma tentativa de pagamento.</Empty> : (
                    <TableBox>
                        <thead><tr><th>#</th><th>Gateway / forma</th><th>Situação</th><th className="num">Valor</th><th className="num">Estornado</th><th>Criado / pago</th><th>Obs.</th><th /></tr></thead>
                        <tbody>
                            {o.payments.map(p => (
                                <tr key={p.id} className="align-top">
                                    <td className="text-ink-muted">{p.id}</td>
                                    <td>{LABELS.gateway[p.gateway as GatewayId] ?? p.gateway} · {LABELS.paymentMethod[p.method]}{p.externalId && <div className="font-mono text-xs text-ink-faint">{p.externalId}</div>}</td>
                                    <td><Badge tone={statusTone(p.status)}>{LABELS.paymentStatus[p.status]}</Badge></td>
                                    <td className="num"><Money cents={p.amountCents} /></td>
                                    <td className="num">{p.refundedCents ? <span className="text-danger"><Money cents={p.refundedCents} /></span> : '-'}</td>
                                    <td className="whitespace-nowrap text-xs">{formatDateTime(p.createdAt)}{p.paidAt && <div className="text-ok">pago {formatDateTime(p.paidAt)}</div>}</td>
                                    <td className="text-xs">
                                        {p.note}{p.registeredBy && <div className="text-ink-muted">por {p.registeredBy}</div>}
                                        {p.refunds.map(r => (
                                            <div key={r.id} className="mt-1 rounded bg-danger-soft px-1.5 py-0.5 text-danger">
                                                Estorno <Money cents={r.amountCents} /> ({r.status}) · {formatDateTime(r.createdAt)}{r.by ? ` · ${r.by}` : ''}{r.reason ? ` · ${r.reason}` : ''}
                                            </div>
                                        ))}
                                    </td>
                                    <td className="text-right">
                                        {can('payments.refund') && (p.status === 'PAID' || p.status === 'PARTIALLY_REFUNDED') && p.amountCents > p.refundedCents && (
                                            <button className="btn btn-danger btn-sm" onClick={() => setRefund({ id: p.id, amountCents: p.amountCents, refundedCents: p.refundedCents, label: `Pedido ${o.code} · ${o.customer.name}` })}>Estornar</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </TableBox>
                )}
            </Card>

            <ManualPaymentModal order={o} open={paying} onClose={() => setPaying(false)} onDone={refresh} />
            <RefundModal target={refund} onClose={() => setRefund(null)} onDone={refresh} />
        </div>
    );
}

export default function OrderDetail({ id }: { id: number }) {
    return <RequirePerm perms={['orders.read']}><OrderDetailInner id={id} /></RequirePerm>;
}
