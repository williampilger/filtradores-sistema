'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Rodapé do site público (dados do clube + Instagram)
 */
import Link from 'next/link';
import { FaInstagram, FaLocationDot } from 'react-icons/fa6';
import { ClubLogo } from './ClubLogo';
import { CLUB_CITY, CLUB_HOME_VENUE, CLUB_INSTAGRAM, CLUB_NAME } from './helpers';
import { useSiteData } from './SiteData';

export function SiteFooter() {
    const { home } = useSiteData();
    const insta = (home?.club.instagram || CLUB_INSTAGRAM).replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
    return (
        <footer className="mt-16 bg-brand-deep text-brand-ink">
            <div className="club-stripes h-2" aria-hidden />
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
                <div className="flex items-start gap-4">
                    <ClubLogo logoUrl={home?.club.logoUrl} size="lg" />
                    <div>
                        <div className="display text-2xl">ACE Filtradores</div>
                        <p className="mt-1 text-sm opacity-80">{home?.club.name || CLUB_NAME}</p>
                        <p className="mt-2 flex items-center gap-2 text-sm opacity-80"><FaLocationDot /> {CLUB_HOME_VENUE} · {CLUB_CITY}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <Link href="/jogos" className="hover:text-club-gold">Jogos e ingressos</Link>
                    <Link href="/socio" className="hover:text-club-gold">Seja sócio</Link>
                    <Link href="/loja" className="hover:text-club-gold">Loja</Link>
                    <Link href="/noticias" className="hover:text-club-gold">Notícias</Link>
                    <Link href="/elenco" className="hover:text-club-gold">Elenco</Link>
                    <Link href="/minha-conta" className="hover:text-club-gold">Minha conta</Link>
                </div>
                <div className="md:text-right">
                    <a href={`https://instagram.com/${insta}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-lg font-semibold hover:text-club-gold">
                        <FaInstagram size={24} /> @{insta}
                    </a>
                    <p className="mt-2 text-sm opacity-80">Acompanhe os bastidores, as convocações e os resultados.</p>
                </div>
            </div>
            <div className="border-t border-brand-strong py-4 text-center text-xs opacity-70">
                © {new Date().getFullYear()} {CLUB_NAME} · {CLUB_CITY}
            </div>
        </footer>
    );
}
