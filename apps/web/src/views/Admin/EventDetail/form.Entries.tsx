'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Evento > Entradas: contadores ao vivo (atualiza a cada 10 s) e registro das leituras da portaria
 */
import { useEffect } from 'react';
import { formatDateTime, LABELS, type CheckInResult } from '@filt/shared';
import API from '@/api';
import { Badge, Card, Empty, Spinner, Stat, statusTone } from '@/components/ui';
import { TableBox, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';

const REFRESH_MS = 10_000;

export default function EntriesTab({ eventId }: { eventId: number }) {
    const { can } = useSession();
    const canLog = can('checkin.reports', 'checkin.validate');
    const panel = useData(() => API.staff.event(eventId), [eventId]);
    const log = useData(() => API.staff.checkins(eventId), [eventId], canLog);
    const reloadPanel = panel.reload, reloadLog = log.reload;

    useEffect(() => {
        const t = setInterval(() => { void reloadPanel(); if (canLog) void reloadLog(); }, REFRESH_MS);
        return () => clearInterval(t);
    }, [reloadPanel, reloadLog, canLog]);

    if (panel.loading && !panel.data) return <Spinner />;
    const p = panel.data;
    if (!p) return <Empty>Painel indisponível.</Empty>;
    const c = p.counters;
    const inside = c.ticketsUsed + c.memberEntries;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Stat label="Presentes" value={inside} hint={c.capacity ? `de ${c.capacity} (capacidade)` : 'sem limite de capacidade'} tone="ok" />
                <Stat label="Ingressos emitidos" value={c.ticketsSold} />
                <Stat label="Ingressos utilizados" value={c.ticketsUsed} hint={c.ticketsSold ? `${Math.round((c.ticketsUsed / c.ticketsSold) * 100)}%` : undefined} />
                <Stat label="Entradas de sócios" value={c.memberEntries} hint={p.memberCapacity ? `limite ${p.memberCapacity}` : undefined} />
                <Stat label="Faltam entrar" value={Math.max(0, c.ticketsSold - c.ticketsUsed)} tone="warn" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Ingressos por origem">
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(p.ticketsByOrigin).map(([k, n]) => <Badge key={k} tone="info">{LABELS.ticketOrigin[k as keyof typeof LABELS.ticketOrigin]}: {n}</Badge>)}
                        {Object.keys(p.ticketsByOrigin).length === 0 && <span className="text-sm text-ink-faint">Nenhum ingresso emitido.</span>}
                    </div>
                </Card>
                {p.checkinsByResult && (
                    <Card title="Leituras por resultado">
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(p.checkinsByResult).map(([k, n]) => <Badge key={k} tone={k === 'OK' ? 'ok' : 'danger'}>{LABELS.checkInResult[k as CheckInResult]}: {n}</Badge>)}
                            {Object.keys(p.checkinsByResult).length === 0 && <span className="text-sm text-ink-faint">Nenhuma leitura ainda.</span>}
                        </div>
                    </Card>
                )}
            </div>

            {canLog && (
                <Card title="Últimas leituras (200)" actions={<span className="text-xs text-ink-faint">atualiza a cada 10 s</span>}>
                    {!log.data?.length ? <Empty>Nenhuma leitura registrada.</Empty> : (
                        <TableBox>
                            <thead><tr><th>Horário</th><th>Resultado</th><th>Pessoa</th><th>Tipo</th><th>Operador</th><th>Aparelho</th></tr></thead>
                            <tbody>
                                {log.data.map(r => (
                                    <tr key={r.id}>
                                        <td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                                        <td><Badge tone={r.result === 'OK' ? 'ok' : statusTone(r.result) === 'default' ? 'danger' : statusTone(r.result)}>{r.label}</Badge></td>
                                        <td>{r.name ?? '-'}</td>
                                        <td>{r.kind === 'member' ? 'Sócio' : r.kind === 'ticket' ? 'Ingresso' : '-'}</td>
                                        <td>{r.operator}</td>
                                        <td className="font-mono text-xs text-ink-muted">{r.deviceId ?? ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </TableBox>
                    )}
                </Card>
            )}
        </div>
    );
}
