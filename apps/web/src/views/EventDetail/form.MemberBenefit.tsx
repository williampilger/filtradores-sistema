'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Benefício do sócio no evento (resgate do ingresso / entrada com a carteirinha)
 */
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { FaIdCard, FaTicket } from 'react-icons/fa6';
import type { EventDetail, TicketDTO } from '@filt/shared';
import API from '@/api';
import { TicketCard } from '@/components/site/TicketQr';

export function MemberBenefit({ event, isLogged, onChange }: { event: EventDetail, isLogged: boolean, onChange: () => void }) {
    const [busy, setBusy] = useState(false);
    const [ticket, setTicket] = useState<TicketDTO | null>(null);
    const b = event.memberBenefit;
    const open = event.status === 'PUBLISHED';

    const box = (children: React.ReactNode) => (
        <section className="overflow-hidden rounded-2xl border border-club-gold bg-surface shadow-sm">
            <div className="flex items-center gap-2 bg-club-gold px-4 py-2 text-sm font-bold uppercase tracking-wider text-brand-deep"><FaIdCard /> Benefício de sócio</div>
            <div className="p-4">{children}</div>
        </section>
    );

    // não é sócio (ou não está logado): convite
    if (!b) {
        if (!open) return null;
        return box(
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">Sócio do Filtradores tem vantagens nos jogos: entrada com a carteirinha, resgate de ingresso e descontos.</p>
                <Link href="/socio" className="btn btn-accent shrink-0">{isLogged ? 'Conheça os planos' : 'Seja sócio'}</Link>
            </div>,
        );
    }

    if (ticket) return box(
        <div className="flex flex-col gap-3">
            <p className="font-semibold text-ok">Ingresso resgatado! Ele também fica em Minha conta → Ingressos.</p>
            <div className="mx-auto w-full max-w-sm"><TicketCard ticket={ticket} /></div>
        </div>,
    );

    if (b.access === 'AUTOMATIC') {
        return box(b.eligible ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="display text-2xl text-brand-deep">Entre com sua carteirinha</div>
                    <p className="text-sm text-ink-muted">Seu plano dá acesso a este jogo. É só apresentar o QR da carteirinha digital na portaria.</p>
                </div>
                <Link href="/minha-conta?aba=carteirinha" className="btn btn-primary btn-lg shrink-0"><FaIdCard /> Abrir carteirinha</Link>
            </div>
        ) : <NotEligible reason={b.reason} />);
    }

    if (b.access === 'CLAIM') {
        if (b.claimed) return box(
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="display text-2xl text-brand-deep">Ingresso garantido!</div>
                    <p className="text-sm text-ink-muted">Você já resgatou seu ingresso de sócio para este jogo.</p>
                </div>
                <Link href="/minha-conta?aba=ingressos" className="btn btn-primary btn-lg shrink-0"><FaTicket /> Ver meu ingresso</Link>
            </div>,
        );
        return box(b.eligible && open ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="display text-2xl text-brand-deep">Seu ingresso está incluso</div>
                    <p className="text-sm text-ink-muted">Resgate agora, sem custo: o ingresso com QR vai para a sua conta.</p>
                </div>
                <button type="button" className="btn btn-accent btn-lg shrink-0" disabled={busy} onClick={async () => {
                    setBusy(true);
                    const r = await API.public.claimTicket(event.slug);
                    setBusy(false);
                    if (!r.success) return;
                    toast.success('Ingresso resgatado! Nos vemos no ginásio!');
                    setTicket(r.data);
                    onChange();
                }}>
                    <FaTicket /> {busy ? 'Resgatando...' : 'Resgatar meu ingresso'}
                </button>
            </div>
        ) : <NotEligible reason={b.reason ?? (open ? null : 'O resgate não está aberto para este evento.')} />);
    }

    return box(<NotEligible reason={b.reason ?? 'Seu plano não inclui acesso aos jogos. Você ainda pode comprar ingressos abaixo.'} />);
}

function NotEligible({ reason }: { reason: string | null }) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted">{reason || 'Seu plano não dá acesso a este evento.'}</p>
            <Link href="/minha-conta?aba=socio" className="btn shrink-0">Minha associação</Link>
        </div>
    );
}
