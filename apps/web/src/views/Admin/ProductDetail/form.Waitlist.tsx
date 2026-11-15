'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Produto > Lista de espera: fila por ordem de chegada, filtro por situação e remoção
 */
import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatDateTime, LABELS, type WaitlistStatus } from '@filt/shared';
import API from '@/api';
import { Badge, Card, confirmAction, Empty, Select, Spinner, statusTone } from '@/components/ui';
import { optionsOf, TableBox, useBusy, useData } from '@/components/admin/common';

export default function WaitlistTab({ productId, onChanged }: { productId: number, onChanged: () => void }) {
    const [status, setStatus] = useState<WaitlistStatus | ''>('');
    const { data, loading, reload } = useData(() => API.admin.waitlist.list({ productId, status: status || undefined }), [productId, status]);
    const { busy, run } = useBusy();

    const remove = async (id: number, name: string) => {
        if (!confirmAction(`Remover ${name} da lista de espera? A reserva (se houver) é liberada e a pessoa é avisada.`)) return;
        const r = await run(`d${id}`, () => API.admin.waitlist.remove(id));
        if (r.success) { toast.success('Removido da lista'); void reload(); onChanged(); }
    };

    return (
        <Card title="Lista de espera" actions={
            <Select<WaitlistStatus | ''> value={status} className="!h-[28px] !w-56 text-xs" onChange={setStatus}
                options={[{ value: '', label: 'Ativos (na fila / chamados)' }, ...optionsOf(LABELS.waitlistStatus)]} />
        }>
            {loading && !data ? <Spinner /> : !data?.length ? <Empty>Ninguém na lista.</Empty> : (
                <TableBox>
                    <thead><tr><th className="num">#</th><th>Nome</th><th>Contato</th><th>Variação</th><th className="num">Qtd.</th><th>Lote</th><th>Situação</th><th>Entrou em</th><th /></tr></thead>
                    <tbody>
                        {data.map((w, i) => (
                            <tr key={w.id}>
                                <td className="num text-ink-muted">{i + 1}</td>
                                <td>{w.name}{w.note && <div className="text-xs text-ink-muted">{w.note}</div>}</td>
                                <td className="text-xs text-ink-muted">{w.email}{w.phone && <><br />{w.phone}</>}</td>
                                <td>{w.variant}</td>
                                <td className="num">{w.quantity}</td>
                                <td>{w.batch ?? '-'}</td>
                                <td>
                                    <Badge tone={statusTone(w.status)}>{LABELS.waitlistStatus[w.status]}</Badge>
                                    {w.status === 'NOTIFIED' && w.reservationExpiresAt && <div className="text-xs text-ink-muted">reserva até {formatDateTime(w.reservationExpiresAt)}</div>}
                                </td>
                                <td className="whitespace-nowrap">{formatDateTime(w.createdAt)}</td>
                                <td className="text-right">{(w.status === 'WAITING' || w.status === 'NOTIFIED') && <button className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => void remove(w.id, w.name)}>Remover</button>}</td>
                            </tr>
                        ))}
                    </tbody>
                </TableBox>
            )}
        </Card>
    );
}
