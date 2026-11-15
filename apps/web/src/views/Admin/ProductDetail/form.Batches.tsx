'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Produto > Lotes de produção (itens sob encomenda): lista, abertura, resumo por variação e avanço de etapas
 *              Fluxo: Aberto -> Fechado -> Em produção -> Pronto -> Entregue (+ Cancelado)
 */
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatDate, formatDateTime, LABELS, type ProductionBatchStatus } from '@filt/shared';
import API from '@/api';
import type { AdminBatch, AdminProductDetail } from '@/api/types';
import { Badge, Card, confirmAction, DateTimeInput, Empty, Field, Input, Modal, Spinner, statusTone, TextArea } from '@/components/ui';
import { TableBox, toInt, useBusy, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';

/** Espelha o BATCH_FLOW do servidor (packages/core/src/waitlist.ts) */
const NEXT: Record<ProductionBatchStatus, { to: ProductionBatchStatus, label: string, confirm: string, danger?: boolean }[]> = {
    OPEN: [
        { to: 'CLOSED', label: 'Fechar pedidos', confirm: 'Fechar o lote? Novos pedidos deixam de entrar neste lote.' },
        { to: 'CANCELED', label: 'Cancelar lote', confirm: 'CANCELAR o lote? Encomendas pagas serão marcadas como canceladas e a lista de espera do lote será cancelada. Os pagamentos precisarão ser ESTORNADOS manualmente.', danger: true },
    ],
    CLOSED: [
        { to: 'IN_PRODUCTION', label: 'Iniciar produção', confirm: 'Enviar o lote para produção? Os compradores serão avisados.' },
        { to: 'OPEN', label: 'Reabrir pedidos', confirm: 'Reabrir o lote para novos pedidos?' },
        { to: 'CANCELED', label: 'Cancelar lote', confirm: 'CANCELAR o lote? Encomendas pagas serão canceladas e os pagamentos precisarão ser ESTORNADOS manualmente.', danger: true },
    ],
    IN_PRODUCTION: [
        { to: 'READY', label: 'Marcar como pronto', confirm: 'Marcar o lote como pronto? Os compradores serão avisados para retirar e a lista de espera (pagamento na entrega) será chamada para pagar.' },
        { to: 'CANCELED', label: 'Cancelar lote', confirm: 'CANCELAR o lote em produção? Os pagamentos precisarão ser ESTORNADOS manualmente.', danger: true },
    ],
    READY: [{ to: 'DELIVERED', label: 'Marcar como entregue', confirm: 'Marcar o lote como entregue (concluído)? Confira as entregas individuais na lista de pedidos.' }],
    DELIVERED: [],
    CANCELED: [],
};

function NewBatchModal({ open, productId, onClose, onSaved }: { open: boolean, productId: number, onClose: () => void, onSaved: () => void }) {
    const [f, setF] = useState({ name: '', minQuantity: '', closesAt: null as string | null, notes: '' });
    const { busy, run } = useBusy();
    const save = async () => {
        const r = await run('s', () => API.admin.products.createBatch(productId, { name: f.name.trim(), minQuantity: toInt(f.minQuantity), closesAt: f.closesAt, notes: f.notes.trim() || null }));
        if (r.success) { toast.success('Lote aberto'); setF({ name: '', minQuantity: '', closesAt: null, notes: '' }); onSaved(); onClose(); }
    };
    return (
        <Modal open={open} title="Abrir lote de produção" onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!!busy || !f.name.trim()} onClick={() => void save()}>{busy ? 'Salvando...' : 'Abrir lote'}</button></>}>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Nome *" className="col-span-2"><Input value={f.name} onChange={v => setF({ ...f, name: v })} placeholder="Ex.: Lote 1 - dezembro" /></Field>
                <Field label="Quantidade mínima" hint="Para viabilizar a produção (informativo)"><Input type="number" min={1} value={f.minQuantity} onChange={v => setF({ ...f, minQuantity: v })} /></Field>
                <Field label="Encerra os pedidos em"><DateTimeInput value={f.closesAt} onChange={v => setF({ ...f, closesAt: v })} /></Field>
                <Field label="Observações" className="col-span-2"><TextArea value={f.notes} onChange={v => setF({ ...f, notes: v })} rows={2} /></Field>
            </div>
            <p className="mt-3 text-xs text-ink-muted">Só pode haver um lote aberto por produto. As encomendas feitas na loja entram no lote aberto.</p>
        </Modal>
    );
}

function BatchModal({ batch, onClose, onChanged }: { batch: AdminBatch | null, onClose: () => void, onChanged: () => void }) {
    const { can } = useSession();
    const { data: b, loading, reload } = useData(() => API.admin.products.batch(batch!.id), [batch?.id], !!batch);
    const { busy, run } = useBusy();
    const go = async (to: ProductionBatchStatus, text: string) => {
        if (!b || !confirmAction(text)) return;
        const r = await run(to, () => API.admin.products.setBatchStatus(b.id, to));
        if (r.success) { toast.success(`Lote: ${LABELS.batchStatus[to]}`); void reload(); onChanged(); }
    };
    const totals = (b?.summary ?? []).reduce((s, x) => ({ paid: s.paid + x.paid, wl: s.wl + x.waitlist }), { paid: 0, wl: 0 });

    return (
        <Modal wide open={!!batch} title={`Lote: ${batch?.name ?? ''}`} onClose={onClose}>
            {loading && !b ? <Spinner /> : !b ? <Empty>Lote não encontrado.</Empty> : (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={statusTone(b.status)}>{LABELS.batchStatus[b.status]}</Badge>
                        {b.minQuantity && <span className="text-sm text-ink-muted">Mínimo: {b.minQuantity} un. ({totals.paid + totals.wl} até agora)</span>}
                        {b.closesAt && <span className="text-sm text-ink-muted">· encerra {formatDateTime(b.closesAt)}</span>}
                        <span className="text-sm text-ink-muted">· lista: {LABELS.waitlistPayment[b.product.waitlistPayment].toLowerCase()}</span>
                    </div>
                    {b.notes && <p className="whitespace-pre-line text-sm text-ink-muted">{b.notes}</p>}
                    {can('waitlist.manage') && NEXT[b.status].length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {NEXT[b.status].map(n => (
                                <button key={n.to} className={`btn btn-sm ${n.danger ? 'btn-danger' : 'btn-primary'}`} disabled={!!busy} onClick={() => void go(n.to, n.confirm)}>{busy === n.to ? '...' : n.label}</button>
                            ))}
                        </div>
                    )}

                    <div>
                        <h4 className="mb-1 text-sm font-semibold">Resumo para produção</h4>
                        {b.summary.length === 0 ? <p className="text-sm text-ink-faint">Nenhuma encomenda.</p> : (
                            <TableBox>
                                <thead><tr><th>Variação</th><th className="num">Pagas</th><th className="num">Lista de espera</th><th className="num">Total a produzir</th></tr></thead>
                                <tbody>
                                    {b.summary.map(s => <tr key={s.variantId}><td>{s.name}</td><td className="num">{s.paid}</td><td className="num">{s.waitlist}</td><td className="num font-semibold">{s.paid + s.waitlist}</td></tr>)}
                                    <tr><td className="font-semibold">Total</td><td className="num font-semibold">{totals.paid}</td><td className="num font-semibold">{totals.wl}</td><td className="num font-semibold">{totals.paid + totals.wl}</td></tr>
                                </tbody>
                            </TableBox>
                        )}
                    </div>

                    <div>
                        <h4 className="mb-1 text-sm font-semibold">Encomendas ({b.orders.length})</h4>
                        {b.orders.length === 0 ? <p className="text-sm text-ink-faint">Nenhuma.</p> : (
                            <TableBox>
                                <thead><tr><th>Pedido</th><th>Cliente</th><th>Variação</th><th className="num">Qtd.</th><th>Pedido</th><th>Entrega</th></tr></thead>
                                <tbody>
                                    {b.orders.map(o => (
                                        <tr key={o.itemId}>
                                            <td className="font-mono">{can('orders.read') ? <Link href={`/admin/pedidos?q=${o.orderCode}`} className="text-brand hover:underline">{o.orderCode}</Link> : o.orderCode}</td>
                                            <td>{o.customer}{o.phone && <div className="text-xs text-ink-muted">{o.phone}</div>}</td>
                                            <td>{o.variant ?? '-'}</td>
                                            <td className="num">{o.quantity}</td>
                                            <td><Badge tone={statusTone(o.orderStatus)}>{LABELS.orderStatus[o.orderStatus]}</Badge></td>
                                            <td><Badge tone={statusTone(o.deliveryStatus)}>{LABELS.deliveryStatus[o.deliveryStatus]}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </TableBox>
                        )}
                    </div>

                    <div>
                        <h4 className="mb-1 text-sm font-semibold">Lista de espera do lote ({b.waitlist.length})</h4>
                        {b.waitlist.length === 0 ? <p className="text-sm text-ink-faint">Ninguém na lista.</p> : (
                            <TableBox>
                                <thead><tr><th>Nome</th><th>Contato</th><th>Variação</th><th className="num">Qtd.</th><th>Situação</th><th>Desde</th></tr></thead>
                                <tbody>
                                    {b.waitlist.map(w => (
                                        <tr key={w.id}>
                                            <td>{w.name}</td>
                                            <td className="text-xs text-ink-muted">{w.email}{w.phone && <><br />{w.phone}</>}</td>
                                            <td>{w.variant}</td>
                                            <td className="num">{w.quantity}</td>
                                            <td><Badge tone={statusTone(w.status)}>{LABELS.waitlistStatus[w.status]}</Badge>{w.reservationExpiresAt && w.status === 'NOTIFIED' && <div className="text-xs text-ink-muted">até {formatDateTime(w.reservationExpiresAt)}</div>}</td>
                                            <td className="whitespace-nowrap">{formatDate(w.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </TableBox>
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}

export default function BatchesTab({ p, onChanged }: { p: AdminProductDetail, onChanged: () => void }) {
    const { can } = useSession();
    const [creating, setCreating] = useState(false);
    const [open, setOpen] = useState<AdminBatch | null>(null);
    const hasOpen = p.batches.some(b => b.status === 'OPEN');

    return (
        <Card title="Lotes de produção" actions={can('waitlist.manage') && <button className="btn btn-primary btn-sm" disabled={hasOpen} title={hasOpen ? 'Feche o lote aberto antes de abrir outro' : ''} onClick={() => setCreating(true)}>+ Abrir lote</button>}>
            {p.batches.length === 0 ? <Empty>Nenhum lote. Abra um lote para começar a receber encomendas.</Empty> : (
                <TableBox>
                    <thead><tr><th>Lote</th><th>Situação</th><th className="num">Mínimo</th><th>Encerra</th><th>Criado</th><th /></tr></thead>
                    <tbody>
                        {p.batches.map(b => (
                            <tr key={b.id}>
                                <td className="font-medium">{b.name}</td>
                                <td><Badge tone={statusTone(b.status)}>{LABELS.batchStatus[b.status]}</Badge></td>
                                <td className="num">{b.minQuantity ?? '-'}</td>
                                <td className="whitespace-nowrap">{formatDateTime(b.closesAt) || '-'}</td>
                                <td className="whitespace-nowrap">{formatDate(b.createdAt)}</td>
                                <td className="text-right"><button className="btn btn-sm" onClick={() => setOpen(b)}>Abrir</button></td>
                            </tr>
                        ))}
                    </tbody>
                </TableBox>
            )}
            <NewBatchModal open={creating} productId={p.id} onClose={() => setCreating(false)} onSaved={onChanged} />
            <BatchModal batch={open} onClose={() => setOpen(null)} onChanged={onChanged} />
        </Card>
    );
}
