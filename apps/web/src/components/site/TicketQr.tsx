'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Ingresso com QR (o campo `qr` do TicketDTO é o conteúdo a codificar)
 */
import Link from 'next/link';
import { FaCalendarDays, FaLocationDot } from 'react-icons/fa6';
import { formatDateTime, LABELS, type TicketDTO } from '@filt/shared';
import { Badge, statusTone } from '@/components/ui';
import { CLUB_HOME_VENUE, dateParts } from './helpers';
import { QrImage } from './QrImage';

export function TicketCard({ ticket }: { ticket: TicketDTO }) {
    const d = dateParts(ticket.event.startsAt);
    const valid = ticket.status === 'VALID';
    return (
        <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="hero-blue px-4 pb-4 pt-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-[.2em] text-club-gold">{ticket.ticketTypeName || LABELS.ticketOrigin[ticket.origin]}</div>
                        <Link href={`/jogos/${ticket.event.slug}`} className="display mt-1 block text-2xl hover:underline">{ticket.event.title}</Link>
                    </div>
                    <span className="shrink-0 rounded-lg bg-surface px-2 py-1 text-center text-brand-deep">
                        <span className="display block text-2xl leading-none">{d.day}</span>
                        <span className="display block text-xs">{d.month}</span>
                    </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-90">
                    <span className="flex items-center gap-1"><FaCalendarDays /> {d.weekday} · {d.time}</span>
                    <span className="flex items-center gap-1"><FaLocationDot /> {ticket.event.venue || CLUB_HOME_VENUE}</span>
                </div>
            </div>
            <div className="club-stripes h-1.5" aria-hidden />
            <div className="flex flex-col items-center gap-3 p-4">
                {valid ? (
                    <QrImage value={ticket.qr} size={220} alt={`QR do ingresso de ${ticket.holderName}`} className="rounded-lg border border-line p-1" />
                ) : (
                    <div className="flex h-[140px] w-full items-center justify-center rounded-lg bg-surface-alt text-center text-sm text-ink-muted">
                        {ticket.status === 'USED' ? <>Entrada registrada{ticket.usedAt ? <><br />em {formatDateTime(ticket.usedAt)}</> : null}</> : `Ingresso ${LABELS.ticketStatus[ticket.status].toLowerCase()}`}
                    </div>
                )}
                <div className="w-full text-center">
                    <div className="font-semibold">{ticket.holderName}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-ink-faint break-all">{ticket.code}</div>
                    <div className="mt-2"><Badge tone={statusTone(ticket.status)}>{LABELS.ticketStatus[ticket.status]}</Badge></div>
                </div>
                {valid && <p className="text-center text-xs text-ink-muted">Apresente este QR na entrada do ginásio. Aumente o brilho da tela.</p>}
            </div>
        </article>
    );
}
