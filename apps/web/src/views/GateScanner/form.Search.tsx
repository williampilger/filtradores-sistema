'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Busca manual (nome / CPF) para quem está sem o QR: dá entrada pelo ingresso ou pelo sócio
 */
import { useState } from 'react';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { formatDateTime, LABELS } from '@filt/shared';
import API from '@/api';
import type { AttendeeSearch } from '@/api/types';
import { Badge, Empty, Spinner, statusTone } from '@/components/ui';
import { Avatar } from '@/components/site/Avatar';

export function SearchPanel({ eventId, onCheckin }: { eventId: number, onCheckin: (b: { ticketId?: number, membershipId?: number }) => Promise<void> }) {
    const [q, setQ] = useState('');
    const [res, setRes] = useState<AttendeeSearch | null>(null);
    const [busy, setBusy] = useState(false);

    const search = async () => {
        if (q.trim().length < 2) return;
        setBusy(true);
        const r = await API.staff.search(eventId, q.trim());
        setBusy(false);
        setRes(r.success ? r.data : { tickets: [], members: [] });
    };

    const enter = async (b: { ticketId?: number, membershipId?: number }) => {
        await onCheckin(b);
        void search();
    };

    return (
        <div className="flex-1 overflow-y-auto bg-app p-4 text-ink">
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void search(); }}>
                <input className="inp !h-12 !text-base" value={q} onChange={e => setQ(e.target.value)} placeholder="Nome ou CPF" autoFocus enterKeyHint="search" />
                <button className="btn btn-primary !h-12 shrink-0" disabled={q.trim().length < 2 || busy}><FaMagnifyingGlass /> Buscar</button>
            </form>
            <div className="mt-4 flex flex-col gap-2">
                {busy ? <Spinner label="Buscando..." /> : !res ? <p className="text-center text-sm text-ink-muted">Busque pelo nome do titular do ingresso ou do sócio, ou pelos números do CPF.</p>
                    : !res.tickets.length && !res.members.length ? <Empty>Ninguém encontrado para &quot;{q}&quot;.</Empty> : (
                        <>
                            {res.members.map(m => (
                                <div key={`m${m.membershipId}`} className="panel flex items-center gap-3 p-3">
                                    <Avatar name={m.name} photoUrl={m.photoUrl} size={48} />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold">{m.name}</div>
                                        <div className="text-xs text-ink-muted">{m.planName}{m.memberNumber != null ? ` · nº ${m.memberNumber}` : ''} · {m.cpfMasked}</div>
                                        <Badge tone={statusTone(m.status)}>{LABELS.membershipStatus[m.status]}</Badge>
                                    </div>
                                    <button type="button" className="btn btn-primary btn-lg shrink-0 !px-3" onClick={() => void enter({ membershipId: m.membershipId })}>Dar entrada</button>
                                </div>
                            ))}
                            {res.tickets.map(t => (
                                <div key={`t${t.id}`} className="panel flex items-center gap-3 p-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold">{t.holderName}</div>
                                        <div className="text-xs text-ink-muted">{t.ticketTypeName || LABELS.ticketOrigin[t.origin]} · {t.cpfMasked || 'sem CPF'}</div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge tone={statusTone(t.status)}>{LABELS.ticketStatus[t.status]}</Badge>
                                            {t.usedAt && <span className="text-xs text-ink-faint">{formatDateTime(t.usedAt)}</span>}
                                        </div>
                                    </div>
                                    {t.status === 'VALID' && <button type="button" className="btn btn-primary btn-lg shrink-0 !px-3" onClick={() => void enter({ ticketId: t.id })}>Dar entrada</button>}
                                </div>
                            ))}
                        </>
                    )}
            </div>
        </div>
    );
}
