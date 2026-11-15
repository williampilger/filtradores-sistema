'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Evento > Lotes de ingressos: lista (vendidos/disponíveis), cadastro/edição e exclusão
 */
import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatDateTime } from '@filt/shared';
import API from '@/api';
import type { AdminEventDetail, AdminTicketType, TicketTypeInput } from '@/api/types';
import { Badge, Card, Checkbox, confirmAction, DateTimeInput, Empty, Field, Input, Modal, Money, MoneyInput } from '@/components/ui';
import { TableBox, toInt, useBusy } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';

const EMPTY: TicketTypeInput = { name: '', description: '', priceCents: 0, quantity: 100, maxPerOrder: 10, salesStartAt: null, salesEndAt: null, membersOnly: false, memberDiscount: true, active: true, sortOrder: 0 };

function TicketTypeModal({ eventId, value, onClose, onSaved }: { eventId: number, value: AdminTicketType | 'new' | null, onClose: () => void, onSaved: () => void }) {
    const [f, setF] = useState<TicketTypeInput>(EMPTY);
    const [loadedFor, setLoadedFor] = useState<AdminTicketType | 'new' | null>(null);
    const { busy, run } = useBusy();
    if (value !== loadedFor) {
        setLoadedFor(value);
        if (value && value !== 'new') {
            const { id: _i, eventId: _e, calc_allocated: _c, available: _a, ...rest } = value;
            setF({ ...rest, description: rest.description ?? '' });
        } else setF(EMPTY);
    }
    const set = <K extends keyof TicketTypeInput>(k: K, v: TicketTypeInput[K]) => setF(p => ({ ...p, [k]: v }));
    const allocated = value && value !== 'new' ? value.calc_allocated : 0;

    const save = async () => {
        const body = { ...f, name: f.name.trim(), description: f.description?.trim() || null };
        const r = value && value !== 'new' ? await run('save', () => API.admin.events.updateTicketType(value.id, body)) : await run('save', () => API.admin.events.createTicketType(eventId, body));
        if (r.success) { toast.success('Lote salvo'); onSaved(); onClose(); }
    };

    return (
        <Modal open={!!value} title={value === 'new' ? 'Novo lote de ingressos' : 'Editar lote'} onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!!busy || !f.name.trim() || f.quantity < allocated} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar'}</button></>}>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Nome *" className="col-span-2"><Input value={f.name} onChange={v => set('name', v)} placeholder="Ex.: Inteira - 1º lote" /></Field>
                <Field label="Descrição" className="col-span-2"><Input value={f.description} onChange={v => set('description', v)} /></Field>
                <Field label="Preço"><MoneyInput cents={f.priceCents} onChange={v => set('priceCents', v ?? 0)} /></Field>
                <Field label="Quantidade" hint={allocated ? `Mínimo ${allocated} (já vendidos/reservados)` : undefined}><Input type="number" min={allocated} value={f.quantity} onChange={v => set('quantity', toInt(v) ?? 0)} /></Field>
                <Field label="Máximo por pedido"><Input type="number" min={1} max={50} value={f.maxPerOrder} onChange={v => set('maxPerOrder', toInt(v) ?? 1)} /></Field>
                <Field label="Ordem"><Input type="number" value={f.sortOrder} onChange={v => set('sortOrder', toInt(v) ?? 0)} /></Field>
                <Field label="Início das vendas" hint="Vazio = imediato"><DateTimeInput value={f.salesStartAt} onChange={v => set('salesStartAt', v)} /></Field>
                <Field label="Fim das vendas" hint="Vazio = até o início do evento"><DateTimeInput value={f.salesEndAt} onChange={v => set('salesEndAt', v)} /></Field>
                <div className="col-span-2 flex flex-col gap-1.5">
                    <Checkbox checked={f.membersOnly} onChange={v => set('membersOnly', v)} label="Exclusivo para sócios" />
                    <Checkbox checked={f.memberDiscount} onChange={v => set('memberDiscount', v)} label="Aplica o desconto de sócio do plano" />
                    <Checkbox checked={f.active} onChange={v => set('active', v)} label="Ativo (à venda)" />
                </div>
            </div>
        </Modal>
    );
}

export default function TicketTypesTab({ ev, onChanged }: { ev: AdminEventDetail, onChanged: () => void }) {
    const { can } = useSession();
    const canWrite = can('events.write');
    const [editing, setEditing] = useState<AdminTicketType | 'new' | null>(null);
    const { busy, run } = useBusy();

    const remove = async (t: AdminTicketType) => {
        if (!confirmAction(`Excluir o lote "${t.name}"? Lotes com pedidos não podem ser excluídos (desative-os).`)) return;
        const r = await run(`del${t.id}`, () => API.admin.events.removeTicketType(t.id));
        if (r.success) { toast.success('Lote excluído'); onChanged(); }
    };
    const totals = ev.ticketTypes.reduce((s, t) => ({ q: s.q + t.quantity, a: s.a + t.calc_allocated }), { q: 0, a: 0 });

    return (
        <Card title="Lotes de ingressos" actions={canWrite && <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}>+ Novo lote</button>}>
            {ev.ticketTypes.length === 0 ? <Empty>Nenhum lote cadastrado. Sem lotes, o evento não vende ingressos (sócios podem entrar conforme o plano).</Empty> : (
                <TableBox>
                    <thead><tr><th>Lote</th><th className="num">Preço</th><th className="num">Qtd.</th><th className="num">Vendidos/reserv.</th><th className="num">Disponível</th><th className="num">Máx./pedido</th><th>Vendas</th><th>Regras</th><th /></tr></thead>
                    <tbody>
                        {ev.ticketTypes.map(t => (
                            <tr key={t.id}>
                                <td><span className="font-medium">{t.name}</span>{t.description && <div className="text-xs text-ink-muted">{t.description}</div>}</td>
                                <td className="num"><Money cents={t.priceCents} /></td>
                                <td className="num">{t.quantity}</td>
                                <td className="num">{t.calc_allocated}</td>
                                <td className={`num font-semibold ${t.available <= 0 ? 'text-danger' : 'text-ok'}`}>{t.available}</td>
                                <td className="num">{t.maxPerOrder}</td>
                                <td className="whitespace-nowrap text-xs">{t.salesStartAt ? formatDateTime(t.salesStartAt) : 'imediato'}<br />{t.salesEndAt ? `até ${formatDateTime(t.salesEndAt)}` : 'até o evento'}</td>
                                <td>
                                    <div className="flex flex-wrap gap-1">
                                        {!t.active && <Badge tone="danger">Inativo</Badge>}
                                        {t.membersOnly && <Badge tone="brand">Só sócios</Badge>}
                                        {t.memberDiscount && <Badge tone="info">Desc. sócio</Badge>}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap text-right">
                                    {canWrite && <>
                                        <button className="btn btn-sm" onClick={() => setEditing(t)}>Editar</button>{' '}
                                        <button className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => void remove(t)}>Excluir</button>
                                    </>}
                                </td>
                            </tr>
                        ))}
                        <tr><td className="font-semibold">Total</td><td /><td className="num font-semibold">{totals.q}</td><td className="num font-semibold">{totals.a}</td><td className="num font-semibold">{totals.q - totals.a}</td><td colSpan={4} /></tr>
                    </tbody>
                </TableBox>
            )}
            <TicketTypeModal eventId={ev.id} value={editing} onClose={() => setEditing(null)} onSaved={onChanged} />
        </Card>
    );
}
