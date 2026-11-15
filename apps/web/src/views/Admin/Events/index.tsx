'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Eventos: próximos/anteriores e cadastro.
 *              Quem só tem permissões de portaria (venda/relatórios) vê a lista de eventos da equipe.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatDateTime, LABELS, type EventStatus } from '@filt/shared';
import API from '@/api';
import type { EventInput } from '@/api/types';
import { Badge, Empty, Modal, PageHeader, Spinner, statusTone } from '@/components/ui';
import { RequirePerm, TableBox, useBusy, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';
import { EMPTY_EVENT, EventFields, eventBody } from '../EventDetail/form.Data';

type Row = { id: number, title: string, startsAt: string, venue: string | null, status: EventStatus, capacity: number | null, tickets: number, memberEntries: number, lineupPublished: boolean | null };

function CreateEventModal({ open, onClose }: { open: boolean, onClose: () => void }) {
    const router = useRouter();
    const [f, setF] = useState<EventInput>(EMPTY_EVENT);
    const { busy, run } = useBusy();
    const submit = async () => {
        const r = await run('save', () => API.admin.events.create(eventBody(f)));
        if (r.success) { toast.success('Evento criado. Cadastre os lotes de ingressos.'); setF(EMPTY_EVENT); router.push(`/admin/eventos/${r.data.id}?tab=lotes`); }
    };
    return (
        <Modal wide open={open} title="Novo evento" onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!!busy || !f.startsAt || f.title.trim().length < 2} onClick={() => void submit()}>{busy ? 'Salvando...' : 'Criar evento'}</button></>}>
            <EventFields f={f} setF={setF} slugAuto />
        </Modal>
    );
}

function EventsInner() {
    const { can } = useSession();
    const adminList = can('events.read', 'events.write', 'lineups.write');
    const [past, setPast] = useState(false);
    const [creating, setCreating] = useState(false);

    const { data, loading } = useData<Row[]>(async () => {
        if (adminList) return API.admin.events.list(past);
        const r = await API.staff.events();
        return { ...r, data: (r.data ?? []).map(e => ({ id: e.id, title: e.title, startsAt: e.startsAt, venue: e.venue, status: e.status, capacity: e.counters.capacity, tickets: e.counters.ticketsSold, memberEntries: e.counters.memberEntries, lineupPublished: null })) };
    }, [past, adminList]);

    return (
        <div>
            <PageHeader title="Eventos e jogos"
                actions={<>
                    {adminList && (
                        <div className="flex rounded-md border border-line-strong">
                            <button className={`btn btn-sm !border-0 ${!past ? '!bg-brand-soft font-semibold text-brand' : ''}`} onClick={() => setPast(false)}>Próximos</button>
                            <button className={`btn btn-sm !border-0 ${past ? '!bg-brand-soft font-semibold text-brand' : ''}`} onClick={() => setPast(true)}>Anteriores</button>
                        </div>
                    )}
                    {can('events.write') && <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Novo evento</button>}
                </>} />

            {loading && !data ? <Spinner /> : !data?.length ? <Empty>{past ? 'Nenhum evento anterior.' : 'Nenhum evento agendado.'}</Empty> : (
                <TableBox>
                    <thead><tr><th>Evento</th><th>Data</th><th>Local</th><th>Situação</th><th className="num">Ingressos</th><th className="num">Entradas de sócios</th>{adminList && <th>Escalação</th>}</tr></thead>
                    <tbody>
                        {data.map(e => (
                            <tr key={e.id}>
                                <td><Link href={`/admin/eventos/${e.id}`} className="font-medium text-brand hover:underline">{e.title}</Link></td>
                                <td className="whitespace-nowrap">{formatDateTime(e.startsAt)}</td>
                                <td className="text-ink-muted">{e.venue}</td>
                                <td><Badge tone={statusTone(e.status)}>{LABELS.eventStatus[e.status]}</Badge></td>
                                <td className="num">{e.tickets}{e.capacity ? ` / ${e.capacity}` : ''}</td>
                                <td className="num">{e.memberEntries}</td>
                                {adminList && <td>{e.lineupPublished ? <Badge tone="ok">Publicada</Badge> : <span className="text-ink-faint">-</span>}</td>}
                            </tr>
                        ))}
                    </tbody>
                </TableBox>
            )}
            {can('events.write') && <CreateEventModal open={creating} onClose={() => setCreating(false)} />}
        </div>
    );
}

export default function Events() {
    return <RequirePerm perms={['events.read', 'events.write', 'lineups.write', 'tickets.sell_manual', 'checkin.validate']}><EventsInner /></RequirePerm>;
}
