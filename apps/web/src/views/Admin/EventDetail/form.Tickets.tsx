'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Evento > Ingressos emitidos: busca, filtros (origem/situação) e cancelamento com motivo
 */
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatCpf, formatDateTime, LABELS, type TicketOrigin, type TicketStatus } from '@filt/shared';
import API from '@/api';
import type { AdminTicketRow } from '@/api/types';
import { Badge, Empty, Field, Input, Modal, Pagination, Select, Spinner, statusTone, TextArea } from '@/components/ui';
import { FilterBar, optionsOf, TableBox, useBusy, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';

function CancelTicketModal({ ticket, onClose, onDone }: { ticket: AdminTicketRow | null, onClose: () => void, onDone: () => void }) {
    const [reason, setReason] = useState('');
    const { busy, run } = useBusy();
    const submit = async () => {
        if (!ticket) return;
        const r = await run('cancel', () => API.admin.events.cancelTicket(ticket.id, reason.trim()));
        if (r.success) { toast.success('Ingresso cancelado'); setReason(''); onClose(); onDone(); }
    };
    return (
        <Modal open={!!ticket} title={`Cancelar ingresso de ${ticket?.holderName ?? ''}`} onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Voltar</button><button className="btn btn-danger" disabled={!!busy || reason.trim().length < 3} onClick={() => void submit()}>{busy ? 'Cancelando...' : 'Cancelar ingresso'}</button></>}>
            <p className="mb-3 text-sm text-ink-muted">O QR deixa de valer na portaria. O cancelamento do ingresso <b>não estorna</b> o pagamento: se for o caso, estorne pelo pedido.</p>
            <Field label="Motivo *"><TextArea value={reason} onChange={setReason} rows={3} /></Field>
        </Modal>
    );
}

export default function TicketsTab({ eventId }: { eventId: number }) {
    const { can } = useSession();
    const [q, setQ] = useState('');
    const [search, setSearch] = useState('');
    const [origin, setOrigin] = useState<TicketOrigin | ''>('');
    const [status, setStatus] = useState<TicketStatus | ''>('');
    const [page, setPage] = useState(1);
    const [canceling, setCanceling] = useState<AdminTicketRow | null>(null);
    const { data, loading, reload } = useData(() => API.admin.events.tickets(eventId, { q: search || undefined, origin: origin || undefined, status: status || undefined, page }), [eventId, search, origin, status, page]);

    return (
        <div>
            <FilterBar>
                <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}>
                    <Input value={q} onChange={setQ} placeholder="Nome, código do ingresso ou do pedido" className="!w-72" />
                    <button className="btn">Buscar</button>
                </form>
                <Select<TicketOrigin | ''> value={origin} className="!w-40" onChange={v => { setPage(1); setOrigin(v); }} options={[{ value: '', label: 'Todas as origens' }, ...optionsOf(LABELS.ticketOrigin)]} />
                <Select<TicketStatus | ''> value={status} className="!w-40" onChange={v => { setPage(1); setStatus(v); }} options={[{ value: '', label: 'Todas as situações' }, ...optionsOf(LABELS.ticketStatus)]} />
            </FilterBar>
            {loading && !data ? <Spinner /> : !data?.rows.length ? <Empty>Nenhum ingresso encontrado.</Empty> : (
                <>
                    <TableBox>
                        <thead><tr><th>Titular</th><th>CPF</th><th>Lote</th><th>Origem</th><th>Situação</th><th>Pedido</th><th>Emitido</th><th>Utilizado</th><th /></tr></thead>
                        <tbody>
                            {data.rows.map(t => (
                                <tr key={t.id}>
                                    <td className="font-medium">{t.holderName}</td>
                                    <td className="whitespace-nowrap">{t.cpf && t.cpf.includes('*') ? t.cpf : formatCpf(t.cpf)}</td>
                                    <td>{t.ticketType ?? '-'}</td>
                                    <td>
                                        <Badge tone={t.origin === 'COURTESY' ? 'info' : t.origin === 'MEMBER_CLAIM' ? 'brand' : 'default'}>{LABELS.ticketOrigin[t.origin]}</Badge>
                                        {t.courtesyReason && <div className="text-xs text-ink-muted" title={t.courtesyReason}>{t.courtesyReason}</div>}
                                    </td>
                                    <td><Badge tone={statusTone(t.status)}>{LABELS.ticketStatus[t.status]}</Badge></td>
                                    <td>{t.orderCode ? <Link href={`/pedido/${t.orderCode}`} className="font-mono text-brand hover:underline" target="_blank">{t.orderCode}</Link> : '-'}</td>
                                    <td className="whitespace-nowrap text-xs">{formatDateTime(t.createdAt)}{t.issuedBy && <div className="text-ink-muted">por {t.issuedBy}</div>}</td>
                                    <td className="whitespace-nowrap text-xs">{formatDateTime(t.usedAt) || '-'}</td>
                                    <td className="text-right">{can('tickets.refund') && t.status === 'VALID' && <button className="btn btn-danger btn-sm" onClick={() => setCanceling(t)}>Cancelar</button>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </TableBox>
                    <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
                </>
            )}
            <CancelTicketModal ticket={canceling} onClose={() => setCanceling(null)} onDone={() => void reload()} />
        </div>
    );
}
