'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Últimas leituras do evento (todas as portarias)
 */
import { useCallback, useEffect, useState } from 'react';
import { FaRotate } from 'react-icons/fa6';
import API from '@/api';
import type { CheckInLogRow } from '@/api/types';
import { Badge, Empty, Spinner } from '@/components/ui';

const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Sao_Paulo' });

export function LogPanel({ eventId, deviceId }: { eventId: number, deviceId: string }) {
    const [rows, setRows] = useState<CheckInLogRow[] | null>(null);
    const load = useCallback(() => API.staff.checkins(eventId).then(r => setRows(r.success ? r.data : [])), [eventId]);
    useEffect(() => { void load(); }, [load]);

    return (
        <div className="flex-1 overflow-y-auto bg-app p-4 text-ink">
            <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-ink-muted">Últimas 200 leituras</span>
                <button type="button" className="btn btn-sm" onClick={() => { setRows(null); void load(); }}><FaRotate /> Atualizar</button>
            </div>
            {rows === null ? <Spinner /> : rows.length === 0 ? <Empty>Nenhuma leitura ainda.</Empty> : (
                <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
                    {rows.map(r => (
                        <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                            <span className="w-16 shrink-0 font-mono text-xs text-ink-muted">{time(r.createdAt)}</span>
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-semibold">{r.name || 'Código não identificado'}</div>
                                <div className="truncate text-xs text-ink-faint">{r.kind === 'member' ? 'Sócio' : r.kind === 'ticket' ? 'Ingresso' : '-'} · {r.operator}{r.deviceId === deviceId ? ' (este aparelho)' : ''}</div>
                            </div>
                            <Badge tone={r.result === 'OK' ? 'ok' : 'danger'}>{r.label}</Badge>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
