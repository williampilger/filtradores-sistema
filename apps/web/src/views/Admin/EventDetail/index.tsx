'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Evento: abas Dados, Lotes, Ingressos, Cortesias, Portaria/Venda, Equipe, Escalação e Entradas
 *              (cada aba aparece conforme as permissões do usuário; ?tab= abre uma aba direto)
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { formatDateTime, LABELS, type EventCounters, type EventStatus } from '@filt/shared';
import API from '@/api';
import { Badge, Empty, PageHeader, Spinner, statusTone, Tabs } from '@/components/ui';
import { RequirePerm, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';
import DataTab from './form.Data';
import TicketTypesTab from './form.TicketTypes';
import TicketsTab from './form.Tickets';
import CourtesyTab from './form.Courtesy';
import PosTab from './form.Pos';
import StaffTab from './form.Staff';
import LineupTab from './form.Lineup';
import EntriesTab from './form.Entries';

type TabKey = 'dados' | 'lotes' | 'ingressos' | 'cortesias' | 'venda' | 'equipe' | 'escalacao' | 'entradas';

function EventDetailInner({ id }: { id: number }) {
    const { can } = useSession();
    const sp = useSearchParams();
    const canAdmin = can('events.read', 'events.write', 'lineups.write');

    // detalhe administrativo (quem tem permissão) ou painel da equipe (portaria/venda)
    const admin = useData(() => API.admin.events.get(id), [id], canAdmin);
    const staff = useData(() => API.staff.event(id), [id], !canAdmin);

    const tabs: { key: TabKey, label: string, hidden?: boolean }[] = [
        { key: 'dados', label: 'Dados', hidden: !canAdmin },
        { key: 'lotes', label: 'Lotes', hidden: !can('events.read', 'events.write') },
        { key: 'ingressos', label: 'Ingressos', hidden: !can('events.read', 'tickets.refund') },
        { key: 'cortesias', label: 'Cortesias', hidden: !can('tickets.courtesy') },
        { key: 'venda', label: 'Portaria / Venda', hidden: !can('tickets.sell_manual') },
        { key: 'equipe', label: 'Equipe', hidden: !can('events.write') },
        { key: 'escalacao', label: 'Escalação', hidden: !can('lineups.write') },
        { key: 'entradas', label: 'Entradas', hidden: !can('events.read', 'checkin.validate', 'tickets.sell_manual') },
    ];
    const visible = tabs.filter(t => !t.hidden);
    const wanted = sp.get('tab') as TabKey | null;
    const [tab, setTab] = useState<TabKey | null>(null);
    const current: TabKey | undefined = tab ?? (visible.find(t => t.key === wanted)?.key) ?? visible[0]?.key;

    const loading = canAdmin ? admin.loading && !admin.data : staff.loading && !staff.data;
    if (loading) return <Spinner />;

    const ev = admin.data;
    const head: { title: string, slug: string, startsAt: string, venue: string | null, status: EventStatus, counters: EventCounters } | null =
        ev ?? (staff.data ? { ...staff.data } : null);
    if (!head) return <Empty>Evento não encontrado.</Empty>;
    const c = head.counters;
    const reload = () => { if (canAdmin) void admin.reload(); else void staff.reload(); };

    return (
        <div>
            <PageHeader
                title={head.title}
                subtitle={<span className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(head.status)}>{LABELS.eventStatus[head.status]}</Badge>
                    <span>{formatDateTime(head.startsAt)}</span>
                    {head.venue && <span>· {head.venue}</span>}
                    <span className="text-ink-faint">· ingressos {c.ticketsSold}{c.capacity ? `/${c.capacity}` : ''} · utilizados {c.ticketsUsed} · sócios {c.memberEntries}</span>
                </span>}
                actions={<>
                    <Link href="/admin/eventos" className="btn">‹ Eventos</Link>
                    {head.status === 'PUBLISHED' && <Link href={`/eventos/${head.slug}`} className="btn" target="_blank">Ver no site</Link>}
                </>} />

            <Tabs tabs={tabs} value={current ?? 'dados'} onChange={setTab} />

            {current === 'dados' && ev && <DataTab ev={ev} onSaved={reload} />}
            {current === 'lotes' && ev && <TicketTypesTab ev={ev} onChanged={reload} />}
            {current === 'ingressos' && <TicketsTab eventId={id} />}
            {current === 'cortesias' && <CourtesyTab eventId={id} ticketTypes={ev?.ticketTypes ?? null} onIssued={reload} />}
            {current === 'venda' && <PosTab eventId={id} onSold={reload} />}
            {current === 'equipe' && <StaffTab eventId={id} />}
            {current === 'escalacao' && <LineupTab eventId={id} />}
            {current === 'entradas' && <EntriesTab eventId={id} />}
            {!current && <Empty>Sem abas disponíveis para o seu perfil.</Empty>}
        </div>
    );
}

export default function EventDetail({ id }: { id: number }) {
    return <RequirePerm perms={['events.read', 'events.write', 'lineups.write', 'tickets.sell_manual', 'checkin.validate']}><EventDetailInner id={id} /></RequirePerm>;
}
