/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Cards de jogos/eventos: destaque do próximo jogo, item da lista e placar ("FIM DE JOGO")
 */
import Link from 'next/link';
import { FaCalendarDays, FaLocationDot, FaTicket } from 'react-icons/fa6';
import { formatMoney, type EventListItem } from '@filt/shared';
import { Badge } from '@/components/ui';
import { ClubLogo, OpponentCrest } from './ClubLogo';
import { CLUB_HOME_VENUE, CLUB_SHORT, dateParts, matchTitle } from './helpers';

const hasScore = (e: EventListItem) => e.homeScore != null && e.awayScore != null;

/** Destaque do próximo jogo (home) */
export function MatchHero({ event, logoUrl }: { event: EventListItem, logoUrl?: string | null }) {
    const d = dateParts(event.startsAt);
    return (
        <article className="hero-blue relative overflow-hidden rounded-2xl shadow-lg">
            <div className="club-stripes absolute inset-x-0 top-0 h-2" aria-hidden />
            <div className="px-5 pb-6 pt-8 sm:px-10">
                <div className="text-center text-xs font-bold uppercase tracking-[.25em] text-club-gold">{event.competition || 'Próximo jogo'}</div>
                {event.isMatch ? (
                    <div className="mt-5 flex items-center justify-center gap-4 sm:gap-10">
                        <div className="flex flex-col items-center gap-2">
                            <ClubLogo logoUrl={logoUrl} size="lg" />
                            <span className="display text-xl">{CLUB_SHORT}</span>
                        </div>
                        <span className="display text-5xl text-club-gold sm:text-7xl">X</span>
                        <div className="flex flex-col items-center gap-2">
                            <OpponentCrest name={event.opponent} size="lg" />
                            <span className="display max-w-36 truncate text-xl">{event.opponent || 'Adversário'}</span>
                        </div>
                    </div>
                ) : (
                    <h3 className="display mt-4 text-center text-4xl sm:text-5xl">{event.title}</h3>
                )}
                <div className="mt-6 flex flex-col items-center gap-1 text-center">
                    <div className="display text-3xl sm:text-4xl">{d.weekday} {d.day}/{d.month} · {d.time}</div>
                    <div className="flex items-center gap-2 text-sm opacity-90"><FaLocationDot /> {event.venue || CLUB_HOME_VENUE}</div>
                </div>
                <div className="mt-6 flex flex-col items-center gap-2">
                    <Link href={`/jogos/${event.slug}`} className="btn btn-accent btn-lg w-full max-w-xs">
                        <FaTicket /> Garanta seu ingresso
                    </Link>
                    {event.fromPriceCents != null && <span className="text-xs opacity-80">a partir de {formatMoney(event.fromPriceCents)}</span>}
                </div>
            </div>
        </article>
    );
}

/** Item da lista de jogos */
export function EventCard({ event }: { event: EventListItem }) {
    const d = dateParts(event.startsAt);
    const past = new Date(event.startsAt).getTime() < Date.now() - 6 * 3_600_000;
    return (
        <Link href={`/jogos/${event.slug}`} className="panel group flex overflow-hidden transition-shadow hover:shadow-lg">
            <div className="hero-blue flex w-20 shrink-0 flex-col items-center justify-center py-3 sm:w-24">
                <span className="text-[11px] font-bold tracking-wider text-club-gold">{d.weekday}</span>
                <span className="display text-4xl">{d.day}</span>
                <span className="display text-base">{d.month}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-4">
                {event.competition && <span className="truncate text-[11px] font-bold uppercase tracking-[.15em] text-club-red">{event.competition}</span>}
                <h3 className="display truncate text-2xl text-brand-deep group-hover:text-brand">{matchTitle(event)}</h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                    <span className="flex items-center gap-1"><FaCalendarDays /> {d.time}</span>
                    <span className="flex items-center gap-1"><FaLocationDot /> {event.venue || CLUB_HOME_VENUE}</span>
                </div>
            </div>
            <div className="hidden shrink-0 flex-col items-end justify-center gap-2 p-4 sm:flex">
                {past && hasScore(event) ? <ScoreBadge event={event} />
                    : event.status === 'CANCELED' ? <Badge tone="danger">Cancelado</Badge>
                        : event.fromPriceCents != null ? (
                            <>
                                <span className="text-xs text-ink-muted">a partir de</span>
                                <span className="text-lg font-bold text-brand">{formatMoney(event.fromPriceCents)}</span>
                            </>
                        ) : <Badge tone="brand">Ver detalhes</Badge>}
            </div>
        </Link>
    );
}

function ScoreBadge({ event }: { event: EventListItem }) {
    return <span className="display rounded-lg bg-brand-deep px-3 py-1 text-2xl text-brand-ink">{event.homeScore} x {event.awayScore}</span>;
}

/** Placar no estilo "FIM DE JOGO" (jogos passados) */
export function ResultCard({ event, logoUrl }: { event: EventListItem, logoUrl?: string | null }) {
    const d = dateParts(event.startsAt);
    return (
        <Link href={`/jogos/${event.slug}`} className="hero-blue block overflow-hidden rounded-xl shadow transition-transform hover:-translate-y-0.5">
            <div className="px-4 pb-4 pt-3">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[.2em]">
                    <span className="text-club-gold">{hasScore(event) ? 'Fim de jogo' : 'Encerrado'}</span>
                    <span className="opacity-80">{d.day}/{d.month}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-col items-center gap-1">
                        <ClubLogo logoUrl={logoUrl} size="md" />
                        <span className="display text-sm">{CLUB_SHORT}</span>
                    </div>
                    <div className="display text-5xl tabular-nums">
                        {hasScore(event) ? <>{event.homeScore}<span className="mx-2 text-club-gold">x</span>{event.awayScore}</> : <span className="text-3xl">vs</span>}
                    </div>
                    <div className="flex min-w-0 flex-col items-center gap-1">
                        <OpponentCrest name={event.opponent || event.title} size="md" />
                        <span className="display max-w-20 truncate text-sm">{event.opponent || event.title}</span>
                    </div>
                </div>
                {event.competition && <div className="mt-2 truncate text-center text-xs opacity-80">{event.competition}</div>}
            </div>
            <div className="club-stripes h-1.5" aria-hidden />
        </Link>
    );
}
