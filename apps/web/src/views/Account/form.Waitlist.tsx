'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Minhas listas de espera (posição, chamada para compra, sair da lista)
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { formatDate, formatDateTime, LABELS, type WaitlistEntryDTO } from '@filt/shared';
import API from '@/api';
import { Badge, confirmAction, Empty, Spinner, statusTone } from '@/components/ui';

export function WaitlistTab() {
    const [rows, setRows] = useState<WaitlistEntryDTO[] | null>(null);
    const load = useCallback(() => API.me.waitlist().then(r => setRows(r.success ? r.data : [])), []);
    useEffect(() => { void load(); }, [load]);

    if (rows === null) return <Spinner />;
    if (!rows.length) return <Empty>Você não está em nenhuma lista de espera.</Empty>;

    return (
        <ul className="flex flex-col gap-3">
            {rows.map(e => {
                const open = e.status === 'WAITING' || e.status === 'NOTIFIED';
                return (
                    <li key={e.id} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                            <Link href={`/loja/${e.product.slug}`} className="font-bold text-brand-deep hover:underline">{e.product.name}</Link>
                            <div className="text-sm text-ink-muted">{e.variant.name} · {e.quantity} un. · desde {formatDate(e.createdAt)}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                                <Badge tone={statusTone(e.status)}>{LABELS.waitlistStatus[e.status]}</Badge>
                                {e.position != null && <span>Posição: <b>{e.position}º</b></span>}
                                {e.batch && <span className="text-ink-muted">Lote {e.batch.name} · {LABELS.batchStatus[e.batch.status]}</span>}
                                {e.status === 'NOTIFIED' && e.reservationExpiresAt && <span className="font-semibold text-club-red">Reservado até {formatDateTime(e.reservationExpiresAt)}</span>}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {e.status === 'NOTIFIED' && <Link href={`/loja/${e.product.slug}`} className="btn btn-accent">Comprar agora</Link>}
                            {open && (
                                <button type="button" className="btn btn-danger" onClick={async () => {
                                    if (!confirmAction('Sair da lista de espera? Você perde a sua posição.')) return;
                                    const r = await API.me.leaveWaitlist(e.id);
                                    if (r.success) { toast.info('Você saiu da lista'); void load(); }
                                }}>Sair da lista</button>
                            )}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
