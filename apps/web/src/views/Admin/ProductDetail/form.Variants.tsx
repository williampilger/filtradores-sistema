'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Produto > Variações e estoque: edição de variações, entrada/ajuste de estoque e histórico de movimentações
 */
import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatDateTime } from '@filt/shared';
import API from '@/api';
import type { AdminProductDetail, AdminVariant, VariantInput } from '@/api/types';
import { Badge, Card, Checkbox, Empty, Field, Input, Modal, Money, MoneyInput, Select, Spinner } from '@/components/ui';
import { TableBox, toInt, useBusy, useClientPage, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';

const REASONS: Record<string, string> = { RESTOCK: 'Entrada', ADJUST: 'Ajuste', SALE: 'Venda', RETURN: 'Devolução/cancelamento', CANCEL: 'Cancelamento' };
const EMPTY: VariantInput = { name: '', sku: '', priceCents: null, active: true, sortOrder: 0 };

function VariantModal({ productId, value, onClose, onSaved }: { productId: number, value: AdminVariant | 'new' | null, onClose: () => void, onSaved: () => void }) {
    const [f, setF] = useState<VariantInput>(EMPTY);
    const [loadedFor, setLoadedFor] = useState<AdminVariant | 'new' | null>(null);
    const { busy, run } = useBusy();
    if (value !== loadedFor) {
        setLoadedFor(value);
        setF(value && value !== 'new' ? { name: value.name, sku: value.sku ?? '', priceCents: value.priceCents ?? null, active: value.active, sortOrder: value.sortOrder } : EMPTY);
    }
    const save = async () => {
        const body = { ...f, name: f.name.trim(), sku: f.sku?.trim() || null };
        const r = value && value !== 'new' ? await run('s', () => API.admin.products.updateVariant(value.id, body)) : await run('s', () => API.admin.products.createVariant(productId, body));
        if (r.success) { toast.success('Variação salva'); onSaved(); onClose(); }
    };
    return (
        <Modal open={!!value} title={value === 'new' ? 'Nova variação' : 'Editar variação'} onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!!busy || !f.name.trim()} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar'}</button></>}>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Nome *"><Input value={f.name} onChange={v => setF({ ...f, name: v })} placeholder="Ex.: G" /></Field>
                <Field label="SKU"><Input value={f.sku} onChange={v => setF({ ...f, sku: v })} /></Field>
                <Field label="Preço próprio" hint="Vazio = preço base do produto"><MoneyInput cents={f.priceCents} onChange={v => setF({ ...f, priceCents: v })} /></Field>
                <Field label="Ordem"><Input type="number" value={f.sortOrder} onChange={v => setF({ ...f, sortOrder: toInt(v) ?? 0 })} /></Field>
                <div className="col-span-2"><Checkbox checked={f.active} onChange={v => setF({ ...f, active: v })} label="Ativa (à venda)" /></div>
            </div>
        </Modal>
    );
}

function StockModal({ variant, onClose, onSaved }: { variant: AdminVariant | null, onClose: () => void, onSaved: () => void }) {
    const [reason, setReason] = useState<'RESTOCK' | 'ADJUST'>('RESTOCK');
    const [delta, setDelta] = useState('');
    const [note, setNote] = useState('');
    const { busy, run } = useBusy();
    const n = toInt(delta) ?? 0;
    const close = () => { setDelta(''); setNote(''); setReason('RESTOCK'); onClose(); };
    const save = async () => {
        if (!variant) return;
        const r = await run('s', () => API.admin.products.adjustStock(variant.id, { delta: n, reason, note: note.trim() || undefined }));
        if (r.success) { toast.success(n > 0 ? 'Entrada registrada. A lista de espera foi chamada, se houver.' : 'Ajuste registrado'); close(); onSaved(); }
    };
    return (
        <Modal open={!!variant} title={`Estoque: ${variant?.name ?? ''}`} onClose={close}
            footer={<><button className="btn" onClick={close}>Cancelar</button><button className="btn btn-primary" disabled={!!busy || n === 0 || (reason === 'RESTOCK' && n < 0)} onClick={() => void save()}>{busy ? 'Salvando...' : 'Registrar'}</button></>}>
            {variant && (
                <div className="space-y-3">
                    <p className="text-sm">Estoque atual: <b>{variant.stock}</b> · reservado: {variant.reserved} · disponível: {variant.available} · na lista de espera: {variant.waitlistQty}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Tipo"><Select value={reason} onChange={setReason} options={[{ value: 'RESTOCK', label: 'Entrada de estoque' }, { value: 'ADJUST', label: 'Ajuste (inventário, perda...)' }]} /></Field>
                        <Field label={reason === 'RESTOCK' ? 'Quantidade recebida' : 'Diferença (+/-)'}><Input type="number" value={delta} onChange={setDelta} placeholder={reason === 'RESTOCK' ? 'Ex.: 20' : 'Ex.: -2'} /></Field>
                    </div>
                    <Field label="Observação"><Input value={note} onChange={setNote} placeholder="Ex.: NF 1234 do fornecedor" /></Field>
                    {n !== 0 && <p className="text-sm">Novo estoque: <b>{variant.stock + n}</b>{variant.stock + n < variant.reserved && <span className="text-danger"> (abaixo do reservado: não permitido)</span>}</p>}
                    <p className="rounded-md bg-brand-soft p-2 text-xs text-brand-deep">
                        Uma <b>entrada positiva</b> chama automaticamente a lista de espera desta variação (ordem de chegada): o estoque é reservado para
                        quem está na fila, que é avisado e tem um prazo para comprar.
                    </p>
                </div>
            )}
        </Modal>
    );
}

function MovementsModal({ variant, onClose }: { variant: AdminVariant | null, onClose: () => void }) {
    const { data, loading } = useData(() => API.admin.products.stockMovements(variant!.id), [variant?.id], !!variant);
    const pg = useClientPage(data, 25);
    return (
        <Modal wide open={!!variant} title={`Movimentações: ${variant?.name ?? ''}`} onClose={onClose}>
            {loading ? <Spinner /> : !data?.length ? <Empty>Nenhuma movimentação.</Empty> : (
                <>
                <TableBox>
                    <thead><tr><th>Data</th><th>Tipo</th><th className="num">Qtd.</th><th>Observação</th><th>Usuário</th></tr></thead>
                    <tbody>
                        {pg.rows.map(m => (
                            <tr key={m.id}>
                                <td className="whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                                <td>{REASONS[m.reason] ?? m.reason}</td>
                                <td className={`num font-semibold ${m.delta > 0 ? 'text-ok' : 'text-danger'}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                                <td className="text-ink-muted">{m.note}{m.orderId ? ` (pedido #${m.orderId})` : ''}</td>
                                <td>{m.user ?? '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </TableBox>
                {pg.pager}
                <p className="mt-1 text-xs text-ink-faint">Últimas 200 movimentações.</p>
                </>
            )}
        </Modal>
    );
}

export default function VariantsTab({ p, onChanged }: { p: AdminProductDetail, onChanged: () => void }) {
    const { can } = useSession();
    const [editing, setEditing] = useState<AdminVariant | 'new' | null>(null);
    const [stock, setStock] = useState<AdminVariant | null>(null);
    const [history, setHistory] = useState<AdminVariant | null>(null);
    const isStock = p.fulfillment === 'STOCK';

    return (
        <Card title="Variações e estoque" actions={can('products.write') && <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>+ Nova variação</button>}>
            {!isStock && <p className="mb-3 text-sm text-ink-muted">Produto sob encomenda: o estoque não limita as vendas; as quantidades são controladas pelos lotes de produção.</p>}
            {p.variants.length === 0 ? <Empty>Nenhuma variação.</Empty> : (
                <TableBox>
                    <thead><tr><th>Variação</th><th>SKU</th><th className="num">Preço</th><th className="num">Estoque</th><th className="num">Reservado</th><th className="num">Disponível</th><th className="num">Lista de espera</th><th /></tr></thead>
                    <tbody>
                        {p.variants.map(v => (
                            <tr key={v.id}>
                                <td className="font-medium">{v.name} {!v.active && <Badge>Inativa</Badge>}</td>
                                <td className="font-mono text-xs">{v.sku ?? '-'}</td>
                                <td className="num">{v.priceCents != null ? <Money cents={v.priceCents} /> : <span className="text-ink-faint"><Money cents={p.basePriceCents} /> (base)</span>}</td>
                                <td className="num">{v.stock}</td>
                                <td className="num">{v.reserved}</td>
                                <td className={`num font-semibold ${isStock && v.available <= 0 ? 'text-danger' : ''}`}>{v.available}</td>
                                <td className="num">{v.waitlistQty || '-'}</td>
                                <td className="whitespace-nowrap text-right">
                                    {can('products.write') && <button className="btn btn-sm" onClick={() => setEditing(v)}>Editar</button>}{' '}
                                    {can('stock.adjust') && <button className="btn btn-sm" onClick={() => setStock(v)}>Entrada / Ajuste</button>}{' '}
                                    {can('stock.adjust', 'products.write') && <button className="btn btn-ghost btn-sm" onClick={() => setHistory(v)}>Histórico</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableBox>
            )}
            <VariantModal productId={p.id} value={editing} onClose={() => setEditing(null)} onSaved={onChanged} />
            <StockModal variant={stock} onClose={() => setStock(null)} onSaved={onChanged} />
            <MovementsModal variant={history} onClose={() => setHistory(null)} />
        </Card>
    );
}
