'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Home pública: hero "SEJA SÓCIO", próximo jogo, agenda, planos, loja e feed
 */
import Link from 'next/link';
import { FaArrowRight, FaTicket } from 'react-icons/fa6';
import { Empty, Spinner } from '@/components/ui';
import { ClubLogo } from '@/components/site/ClubLogo';
import { EventCard, MatchHero } from '@/components/site/EventCard';
import { CLUB_CITY, CLUB_HOME_VENUE, CLUB_NAME } from '@/components/site/helpers';
import { PlanCard } from '@/components/site/PlanCard';
import { PostCard } from '@/components/site/PostCard';
import { ProductCard } from '@/components/site/ProductCard';
import { Container, SectionTitle } from '@/components/site/Section';
import { useSiteData } from '@/components/site/SiteData';
import { useSession } from '@/hooks/useSession';

export default function Home() {
    const { home, loading } = useSiteData();
    const { session } = useSession();
    const isMember = session?.membership?.status === 'ACTIVE';

    const next = home?.events.find(e => e.isMatch && e.status === 'PUBLISHED') ?? home?.events[0] ?? null;
    const others = home?.events.filter(e => e.id !== next?.id) ?? [];
    const featuredIdx = home && home.plans.length >= 3 ? Math.floor(home.plans.length / 2) : -1;

    return (
        <>
            {/* HERO */}
            <section className="hero-blue relative overflow-hidden">
                <Container className="grid items-center gap-8 py-12 sm:py-16 md:grid-cols-[1.4fr_1fr] md:py-20">
                    <div>
                        <div className="mb-3 text-xs font-bold uppercase tracking-[.25em] text-club-gold">{home?.club.name || CLUB_NAME}</div>
                        <h1 className="display !leading-[.9] text-7xl sm:text-8xl lg:text-9xl">
                            {isMember ? <>Bem-vindo,<br /><span className="text-club-gold">sócio!</span></> : <>Seja<br /><span className="text-club-gold">sócio</span></>}
                        </h1>
                        <p className="mt-5 max-w-lg text-lg opacity-90">
                            {isMember ? 'Sua carteirinha digital, seus ingressos e as novidades do time estão aqui.' : 'Seu lugar no Filtradores começa aqui! Garanta vantagens nos jogos do Morangão, descontos na loja e conteúdo exclusivo.'}
                        </p>
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            {isMember
                                ? <Link href="/minha-conta?aba=carteirinha" className="btn btn-accent btn-lg">Minha carteirinha</Link>
                                : <Link href="/socio" className="btn btn-accent btn-lg">Quero ser sócio <FaArrowRight /></Link>}
                            <Link href="/jogos" className="btn btn-lg !border-surface !bg-transparent text-brand-ink hover:!bg-surface hover:text-brand-deep"><FaTicket /> Ingressos</Link>
                        </div>
                    </div>
                    <div className="hidden justify-center md:flex">
                        <ClubLogo logoUrl={home?.club.logoUrl} size="hero" className="shadow-2xl" />
                    </div>
                </Container>
                <div className="club-stripes h-3" aria-hidden />
            </section>

            {loading && !home ? <Spinner /> : !home ? (
                <Container className="py-10"><Empty>Não foi possível carregar as informações agora. Tente novamente em instantes.</Empty></Container>
            ) : (
                <>
                    {/* PRÓXIMO JOGO */}
                    <Container className="-mt-2 pt-10">
                        <SectionTitle kicker="Ingressos à venda" title="Próximo jogo" action={<Link href="/jogos" className="text-sm font-semibold text-brand hover:underline">Agenda completa →</Link>} />
                        {next ? <MatchHero event={next} logoUrl={home.club.logoUrl} /> : <Empty>Nenhum jogo agendado no momento. Fique de olho no nosso Instagram!</Empty>}
                        {others.length > 0 && (
                            <div className="mt-5 grid gap-3 md:grid-cols-2">
                                {others.slice(0, 4).map(e => <EventCard key={e.id} event={e} />)}
                            </div>
                        )}
                    </Container>

                    {/* PLANOS */}
                    {home.plans.length > 0 && (
                        <section className="mt-14 bg-brand-deep py-12 text-brand-ink">
                            <Container>
                                <SectionTitle light kicker="Sócio-torcedor" title="Escolha seu plano" action={<Link href="/socio" className="text-sm font-semibold text-club-gold hover:underline">Ver todos os detalhes →</Link>} />
                                <div className="grid gap-5 text-ink sm:grid-cols-2 lg:grid-cols-3">
                                    {home.plans.slice(0, 3).map((p, i) => (
                                        <PlanCard key={p.id} plan={p} featured={i === featuredIdx}
                                            action={<Link href="/socio" className={`btn btn-lg w-full ${i === featuredIdx ? 'btn-accent' : 'btn-primary'}`}>Quero este plano</Link>} />
                                    ))}
                                </div>
                            </Container>
                        </section>
                    )}

                    {/* LOJA */}
                    {home.products.length > 0 && (
                        <Container className="pt-14">
                            <SectionTitle kicker="Loja oficial" title="Vista o manto" action={<Link href="/loja" className="text-sm font-semibold text-brand hover:underline">Ver loja →</Link>} />
                            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
                                {home.products.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
                            </div>
                        </Container>
                    )}

                    {/* NOTÍCIAS */}
                    {home.posts.length > 0 && (
                        <Container className="pt-14">
                            <SectionTitle kicker="Bastidores" title="Notícias" action={<Link href="/noticias" className="text-sm font-semibold text-brand hover:underline">Ver todas →</Link>} />
                            <div className="grid gap-5 md:grid-cols-3">
                                {home.posts.slice(0, 3).map(p => <PostCard key={p.id} post={p} compact />)}
                            </div>
                        </Container>
                    )}

                    {/* CASA */}
                    <Container className="pt-14">
                        <div className="club-stripes overflow-hidden rounded-2xl">
                            <div className="flex flex-col items-start gap-3 bg-brand-deep/85 p-6 text-brand-ink sm:flex-row sm:items-center sm:justify-between sm:p-8">
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[.25em] text-club-gold">Nossa casa</div>
                                    <div className="display text-3xl sm:text-4xl">{CLUB_HOME_VENUE}</div>
                                    <div className="text-sm opacity-90">{CLUB_CITY} · Futsal</div>
                                </div>
                                <Link href="/elenco" className="btn btn-accent btn-lg">Conheça o elenco</Link>
                            </div>
                        </div>
                    </Container>
                </>
            )}
        </>
    );
}
