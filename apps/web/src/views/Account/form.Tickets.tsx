'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Meus ingressos (próximos / todos) com QR grande
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { TicketDTO } from '@filt/shared';
import API from '@/api';
import { Empty, Spinner } from '@/components/ui';
import { TicketCard } from '@/components/site/TicketQr';

export function TicketsTab() {
    const [scope, setScope] = useState<'upcoming' | 'all'>('upcoming');
    const [tickets, setTickets] = useState<TicketDTO[] | null>(null);

    useEffect(() => {
        setTickets(null);
        API.me.tickets(scope).then(r => setTickets(r.success ? r.data : []));
    }, [scope]);

    return (
        <div>
            <div className="mb-4 inline-flex rounded-lg border border-line bg-surface p-1">
                {(['upcoming', 'all'] as const).map(s => (
                    <button key={s} type="button" onClick={() => setScope(s)}
                        className={`rounded-md px-4 py-1.5 text-sm font-semibold ${scope === s ? 'bg-brand text-brand-ink' : 'text-ink-muted hover:text-ink'}`}>
                        {s === 'upcoming' ? 'Próximos' : 'Todos'}
                    </button>
                ))}
            </div>
            {tickets === null ? <Spinner /> : tickets.length === 0 ? (
                <Empty>
                    {scope === 'upcoming' ? 'Você não tem ingressos para os próximos jogos.' : 'Nenhum ingresso por aqui ainda.'}{' '}
                    <Link href="/jogos" className="font-semibold text-brand hover:underline">Garanta o seu!</Link>
                </Empty>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {tickets.map(t => <TicketCard key={t.id} ticket={t} />)}
                </div>
            )}
        </div>
    );
}
