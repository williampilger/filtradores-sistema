'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Evento > Portaria / Venda (PDV): escolhe lotes e quantidades, recebe em dinheiro/PIX/manual e emite os ingressos na hora
 */
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatMoney, type TicketDTO } from '@filt/shared';
import API from '@/api';
import { Card, Empty, Field, Input, Money, Select, Spinner } from '@/components/ui';
import { TableBox, useBusy, useData } from '@/components/admin/common';

type Method = 'CASH' | 'PIX' | 'MANUAL';

export default function PosTab({ eventId, onSold }: { eventId: number, onSold: () => void }) {
    const { data: ev, loading, reload } = useData(() => API.staff.event(eventId), [eventId]);
    const [qty, setQty] = useState<Record<number, number>>({});
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [method, setMethod] = useState<Method>('CASH');
    const [note, setNote] = useState('');
    const [last, setLast] = useState<{ orderCode: string, totalCents: number, tickets: TicketDTO[] } | null>(null);
    const { busy, run } = useBusy();

    if (loading && !ev) return <Spinner />;
    if (!ev) return <Empty>Evento indisponível.</Empty>;

    const lines = Object.entries(qty).filter(([, q]) => q > 0).map(([id, q]) => ({ ticketTypeId: Number(id), quantity: q }));
    const total = lines.reduce((s, l) => s + (ev.ticketTypes.find(t => t.id === l.ticketTypeId)?.priceCents ?? 0) * l.quantity, 0);
    const setQ = (id: number, v: number, max: number) => setQty(p => ({ ...p, [id]: Math.max(0, Math.min(max, v)) }));

    const sell = async () => {
        const r = await run('sell', () => API.staff.sell(eventId, { lines, customerName: name.trim() || undefined, customerCpf: cpf.trim() || undefined, method, note: note.trim() || undefined }));
        if (r.success) {
            toast.success(`Venda registrada: ${r.data.tickets.length} ingresso(s)`);
            setLast(r.data); setQty({}); setName(''); setCpf(''); setNote('');
            void reload(); onSold();
        }
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <Card title="Venda na portaria">
                {ev.ticketTypes.length === 0 ? <Empty>Nenhum lote cadastrado para este evento.</Empty> : (
                    <TableBox className="mb-4">
                        <thead><tr><th>Lote</th><th className="num">Preço</th><th className="num">Disponível</th><th className="num">Quantidade</th><th className="num">Subtotal</th></tr></thead>
                        <tbody>
                            {ev.ticketTypes.map(t => {
                                const q = qty[t.id] ?? 0;
                                const max = Math.min(50, t.available);
                                return (
                                    <tr key={t.id}>
                                        <td className="font-medium">{t.name}{t.membersOnly && <span className="ml-1 text-xs text-ink-muted">(sócios)</span>}</td>
                                        <td className="num"><Money cents={t.priceCents} /></td>
                                        <td className={`num ${t.available <= 0 ? 'text-danger' : ''}`}>{t.available}</td>
                                        <td className="num">
                                            <div className="inline-flex items-center gap-1">
                                                <button className="btn btn-sm" disabled={q <= 0} onClick={() => setQ(t.id, q - 1, max)}>−</button>
                                                <input className="inp num !h-[28px] !w-14" inputMode="numeric" value={q} onChange={e => setQ(t.id, Number(e.target.value.replace(/\D/g, '')) || 0, max)} />
                                                <button className="btn btn-sm" disabled={q >= max} onClick={() => setQ(t.id, q + 1, max)}>+</button>
                                            </div>
                                        </td>
                                        <td className="num"><Money cents={t.priceCents * q} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </TableBox>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Nome do comprador" hint="Opcional"><Input value={name} onChange={setName} /></Field>
                    <Field label="CPF" hint="Opcional"><Input value={cpf} onChange={setCpf} inputMode="numeric" /></Field>
                    <Field label="Forma de pagamento">
                        <Select value={method} onChange={setMethod} options={[{ value: 'CASH', label: 'Dinheiro' }, { value: 'PIX', label: 'PIX (chave do clube)' }, { value: 'MANUAL', label: 'Outro (manual)' }]} />
                    </Field>
                    <Field label="Observação" className="sm:col-span-3"><Input value={note} onChange={setNote} /></Field>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                    <span className="text-lg">Total: <b>{formatMoney(total)}</b></span>
                    <button className="btn btn-primary btn-lg" disabled={!!busy || lines.length === 0} onClick={() => void sell()}>{busy ? 'Registrando...' : 'Confirmar venda'}</button>
                </div>
            </Card>

            <Card title="Última venda">
                {!last ? <p className="text-sm text-ink-faint">Os códigos dos ingressos emitidos aparecem aqui.</p> : (
                    <div className="space-y-2 text-sm">
                        <div>Pedido <Link href={`/pedido/${last.orderCode}`} target="_blank" className="font-mono font-semibold text-brand hover:underline">{last.orderCode}</Link> · <Money cents={last.totalCents} /></div>
                        <ul className="space-y-1">
                            {last.tickets.map(t => (
                                <li key={t.id} className="rounded-md border border-line px-2 py-1">
                                    <span className="font-mono font-semibold">{t.code}</span> <span className="text-ink-muted">· {t.ticketTypeName ?? ''} · {t.holderName}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs text-ink-muted">Abra o pedido para mostrar/imprimir os QR codes.</p>
                    </div>
                )}
            </Card>
        </div>
    );
}
