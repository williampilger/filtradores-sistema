'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Elenco agrupado por posição (futsal: goleiro, fixo, ala, pivô, comissão técnica)
 */
import { useEffect, useState } from 'react';
import { LABELS, PLAYER_POSITIONS, type PlayerDTO } from '@filt/shared';
import API from '@/api';
import { Empty, Spinner } from '@/components/ui';
import { initials } from '@/components/site/helpers';
import { Container, PageHero, SectionTitle } from '@/components/site/Section';

const PLURAL: Record<string, string> = { GK: 'Goleiros', DF: 'Fixos', MF: 'Alas', FW: 'Pivôs', STAFF: 'Comissão técnica' };

function PlayerCard({ p }: { p: PlayerDTO }) {
    return (
        <article className="group overflow-hidden rounded-xl bg-surface shadow-sm">
            <div className="hero-blue relative aspect-[3/4] overflow-hidden">
                {p.photoUrl
                    ? <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover object-top transition-transform group-hover:scale-105" loading="lazy" />
                    : <div className="flex h-full items-center justify-center"><span className="display text-6xl opacity-40">{initials(p.nickname || p.name)}</span></div>}
                {p.number != null && <span className="display absolute left-2 top-1 text-5xl text-brand-ink drop-shadow">{p.number}</span>}
                <div className="club-stripes absolute inset-x-0 bottom-0 h-1.5" aria-hidden />
            </div>
            <div className="p-3">
                <h3 className="display truncate text-xl text-brand-deep">{p.nickname || p.name}</h3>
                {p.nickname && <div className="truncate text-xs text-ink-muted">{p.name}</div>}
                {p.bio && <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{p.bio}</p>}
            </div>
        </article>
    );
}

export default function Squad() {
    const [players, setPlayers] = useState<PlayerDTO[] | null>(null);
    useEffect(() => { API.public.squad().then(r => setPlayers(r.success ? r.data : [])); }, []);

    return (
        <>
            <PageHero kicker="Futsal" title="Elenco" subtitle="Os atletas que defendem as cores do Filtradores." />
            <Container className="py-10">
                {players === null ? <Spinner /> : players.length === 0 ? <Empty>O elenco será divulgado em breve.</Empty> : (
                    <div className="flex flex-col gap-12">
                        {PLAYER_POSITIONS.map(pos => {
                            const list = players.filter(p => p.position === pos);
                            if (!list.length) return null;
                            return (
                                <section key={pos}>
                                    <SectionTitle kicker={LABELS.playerPosition[pos]} title={PLURAL[pos]} />
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                                        {list.map(p => <PlayerCard key={p.id} p={p} />)}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </Container>
        </>
    );
}
