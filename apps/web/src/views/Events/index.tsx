'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Agenda de jogos (próximos) e resultados (passados, com placar)
 */
import { useEffect, useState } from 'react';
import type { EventListItem } from '@filt/shared';
import API from '@/api';
import { Empty, Spinner } from '@/components/ui';
import { EventCard, ResultCard } from '@/components/site/EventCard';
import { Container, PageHero, SectionTitle } from '@/components/site/Section';
import { useSiteData } from '@/components/site/SiteData';

export default function Events() {
    const { home } = useSiteData();
    const [upcoming, setUpcoming] = useState<EventListItem[] | null>(null);
    const [past, setPast] = useState<EventListItem[] | null>(null);

    useEffect(() => {
        API.public.events().then(r => setUpcoming(r.success ? r.data : []));
        API.public.events(true).then(r => setPast(r.success ? r.data : []));
    }, []);

    return (
        <>
            <PageHero kicker="Ingressos à venda" title="Garanta seu ingresso" subtitle="Agenda do Filtradores no Ginásio do Morangão e fora de casa. Compre online e entre com o QR no celular." />
            <Container className="py-10">
                <SectionTitle kicker="Agenda" title="Próximos jogos" />
                {upcoming === null ? <Spinner /> : upcoming.length === 0 ? <Empty>Nenhum jogo agendado no momento. Volte em breve!</Empty> : (
                    <div className="grid gap-3 md:grid-cols-2">
                        {upcoming.map(e => <EventCard key={e.id} event={e} />)}
                    </div>
                )}

                <div className="mt-14">
                    <SectionTitle kicker="Fim de jogo" title="Resultados" />
                    {past === null ? <Spinner /> : past.length === 0 ? <Empty>Ainda não há resultados por aqui.</Empty> : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {past.map(e => <ResultCard key={e.id} event={e} logoUrl={home?.club.logoUrl} />)}
                        </div>
                    )}
                </div>
            </Container>
        </>
    );
}
