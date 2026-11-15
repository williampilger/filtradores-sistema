'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Página do jogo/evento: informações, benefício de sócio, lotes de ingresso, checkout e escalação
 */
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaClock, FaLocationDot, FaTicket } from 'react-icons/fa6';
import { formatMoney, LABELS, type EventDetail as EventDetailDTO } from '@filt/shared';
import API from '@/api';
import { Checkbox, Empty, Spinner } from '@/components/ui';
import { type CartItem, CheckoutBox, type CheckoutLine } from '@/components/site/Checkout';
import { ClubLogo, OpponentCrest } from '@/components/site/ClubLogo';
import { CLUB_HOME_VENUE, CLUB_SHORT, dateParts, matchTitle } from '@/components/site/helpers';
import { Container } from '@/components/site/Section';
import { useSiteData } from '@/components/site/SiteData';
import { useSession } from '@/hooks/useSession';
import { Lineup } from './form.Lineup';
import { MemberBenefit } from './form.MemberBenefit';
import { TicketTypeRow } from './form.TicketTypes';

export default function EventDetail({ slug }: { slug: string }) {
    const { session } = useSession();
    const { home } = useSiteData();
    const [ev, setEv] = useState<EventDetailDTO | null | undefined>(undefined);
    const [qty, setQty] = useState<Record<number, number>>({});
    const [askNames, setAskNames] = useState(false);
    const [names, setNames] = useState<Record<number, string[]>>({});
    const userId = session?.user.id;

    const load = useCallback(async () => {
        const r = await API.public.event(slug);
        setEv(r.success ? r.data : null);
    }, [slug]);
    // recarrega ao entrar/sair (preço de sócio e benefício dependem do usuário)
    useEffect(() => { void load(); }, [load, userId]);

    const activeMember = session?.membership?.status === 'ACTIVE';

    const { items, lines, count } = useMemo(() => {
        const items: CartItem[] = [];
        const lines: CheckoutLine[] = [];
        let count = 0;
        for (const t of ev?.ticketTypes ?? []) {
            const q = qty[t.id] ?? 0;
            if (q <= 0) continue;
            count += q;
            const holderNames = askNames ? (names[t.id] ?? []).slice(0, q).map(n => n.trim()).filter(Boolean) : [];
            items.push({ kind: 'TICKET', ticketTypeId: t.id, quantity: q, holderNames: holderNames.length ? holderNames : undefined });
            lines.push({ label: t.name, quantity: q, unitCents: t.priceCents, memberUnitCents: t.memberPriceCents });
        }
        return { items, lines, count };
    }, [ev, qty, askNames, names]);

    if (ev === undefined) return <Spinner />;
    if (ev === null) return (
        <Container className="py-16">
            <Empty>Evento não encontrado. <Link href="/jogos" className="font-semibold text-brand hover:underline">Ver a agenda</Link></Empty>
        </Container>
    );

    const d = dateParts(ev.startsAt);
    const saleOpen = ev.status === 'PUBLISHED';
    const hasScore = ev.homeScore != null && ev.awayScore != null;
    const totalCents = lines.reduce((s, l) => s + l.quantity * (l.memberUnitCents ?? l.unitCents), 0);

    return (
        <>
            {/* CABEÇALHO */}
            <section className="hero-blue relative overflow-hidden">
                {ev.coverUrl && <img src={ev.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
                <Container className="relative py-10 text-center sm:py-14">
                    <div className="text-xs font-bold uppercase tracking-[.25em] text-club-gold">{ev.competition || (ev.isMatch ? 'Futsal' : 'Evento')}</div>
                    {ev.isMatch ? (
                        <div className="mt-5 flex items-center justify-center gap-4 sm:gap-10">
                            <div className="flex flex-col items-center gap-2"><ClubLogo logoUrl={home?.club.logoUrl} size="lg" /><span className="display text-xl">{CLUB_SHORT}</span></div>
                            {hasScore
                                ? <span className="display text-6xl tabular-nums sm:text-8xl">{ev.homeScore}<span className="mx-2 text-club-gold">x</span>{ev.awayScore}</span>
                                : <span className="display text-5xl text-club-gold sm:text-7xl">X</span>}
                            <div className="flex flex-col items-center gap-2"><OpponentCrest name={ev.opponent} size="lg" /><span className="display max-w-40 truncate text-xl">{ev.opponent}</span></div>
                        </div>
                    ) : <h1 className="display mt-3 text-5xl sm:text-6xl">{ev.title}</h1>}
                    {ev.isMatch && <h1 className="sr-only">{matchTitle(ev)}</h1>}
                    {hasScore && <div className="display mt-3 text-2xl text-club-gold">Fim de jogo</div>}
                    <div className="display mt-5 text-3xl">{d.weekday} {d.day}/{d.month} · {d.time}</div>
                    <div className="mt-2 flex flex-col items-center gap-1 text-sm opacity-90">
                        <span className="flex items-center gap-2"><FaLocationDot /> {ev.venue || CLUB_HOME_VENUE}{ev.address ? ` · ${ev.address}` : ''}</span>
                        {ev.gatesOpenAt && <span className="flex items-center gap-2"><FaClock /> Portões abrem às {dateParts(ev.gatesOpenAt).time}</span>}
                    </div>
                    {ev.status !== 'PUBLISHED' && <div className="mt-4 inline-block rounded-full bg-surface px-3 py-1 text-sm font-bold text-brand-deep">{LABELS.eventStatus[ev.status]}</div>}
                </Container>
                <div className="club-stripes h-2" aria-hidden />
            </section>

            <Container className="flex max-w-4xl flex-col gap-6 py-8">
                <MemberBenefit event={ev} isLogged={!!session} onChange={() => void load()} />

                {/* INGRESSOS */}
                {ev.ticketTypes.length > 0 && (
                    <section>
                        <h2 className="display mb-3 text-3xl text-brand-deep">Ingressos</h2>
                        <div className="flex flex-col gap-3">
                            {ev.ticketTypes.map(t => (
                                <TicketTypeRow key={t.id} t={t} qty={qty[t.id] ?? 0} activeMember={activeMember} saleOpen={saleOpen}
                                    onQty={n => setQty(q => ({ ...q, [t.id]: n }))} />
                            ))}
                        </div>

                        {count > 0 && (
                            <div className="mt-4 rounded-xl border border-line bg-surface p-4">
                                <Checkbox checked={askNames} onChange={setAskNames} label="Informar o nome de quem vai usar cada ingresso (opcional)" />
                                {askNames && (
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        {ev.ticketTypes.flatMap(t => Array.from({ length: qty[t.id] ?? 0 }, (_, i) => (
                                            <label key={`${t.id}-${i}`} className="block">
                                                <span className="lbl">{t.name} #{i + 1}</span>
                                                <input className="inp" value={names[t.id]?.[i] ?? ''} placeholder="Nome do titular" onChange={e => setNames(n => {
                                                    const arr = [...(n[t.id] ?? [])];
                                                    arr[i] = e.target.value;
                                                    return { ...n, [t.id]: arr };
                                                })} />
                                            </label>
                                        )))}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                )}

                {count > 0 && (
                    <div id="checkout" className="scroll-mt-24">
                        <CheckoutBox items={items} lines={lines} title="Finalizar compra" />
                    </div>
                )}

                {ev.description && (
                    <section className="panel p-5">
                        <h2 className="display mb-2 text-2xl text-brand-deep">Sobre o {ev.isMatch ? 'jogo' : 'evento'}</h2>
                        <p className="whitespace-pre-line text-sm">{ev.description}</p>
                    </section>
                )}

                {ev.lineup && ev.lineup.entries.length > 0 && <Lineup lineup={ev.lineup} />}
            </Container>

            {/* barra fixa no celular com o total */}
            {count > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface p-3 shadow-2xl sm:hidden">
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <div className="text-xs text-ink-muted">{count} ingresso(s)</div>
                            <div className="text-lg font-bold text-brand">{formatMoney(totalCents)}</div>
                        </div>
                        <a href="#checkout" className="btn btn-accent btn-lg"><FaTicket /> Finalizar</a>
                    </div>
                </div>
            )}
        </>
    );
}
