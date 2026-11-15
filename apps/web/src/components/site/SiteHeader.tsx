'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Cabeçalho do site público (menu, entrar / menu da conta com notificações)
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FaBars, FaBell, FaGauge, FaIdCard, FaQrcode, FaRightFromBracket, FaTicket, FaUser, FaXmark } from 'react-icons/fa6';
import { useSession } from '@/hooks/useSession';
import { Avatar } from './Avatar';
import { Wordmark } from './ClubLogo';
import { useSiteData } from './SiteData';

const LINKS = [
    { href: '/jogos', label: 'Jogos' },
    { href: '/socio', label: 'Seja Sócio' },
    { href: '/loja', label: 'Loja' },
    { href: '/noticias', label: 'Notícias' },
    { href: '/elenco', label: 'Elenco' },
];

export function SiteHeader() {
    const { home } = useSiteData();
    const { session, loading, can, isStaff, logout } = useSession();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // fecha os menus ao navegar
    useEffect(() => { setMobileOpen(false); setMenuOpen(false); }, [pathname]);

    useEffect(() => {
        if (!menuOpen) return;
        const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [menuOpen]);

    const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const unread = session?.unreadNotifications ?? 0;
    const pending2fa = !!session && (session.mfaPending || session.mfaSetupRequired);

    return (
        <header className="sticky top-0 z-40 bg-brand-deep text-brand-ink shadow-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
                <button type="button" className="-ml-1 rounded p-2 md:hidden" aria-label="Abrir menu" onClick={() => setMobileOpen(o => !o)}>
                    {mobileOpen ? <FaXmark size={20} /> : <FaBars size={20} />}
                </button>
                <Link href="/" aria-label="Página inicial"><Wordmark logoUrl={home?.club.logoUrl} /></Link>

                <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Menu principal">
                    {LINKS.map(l => (
                        <Link key={l.href} href={l.href}
                            className={`rounded px-3 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${active(l.href) ? 'text-club-gold' : 'text-brand-ink hover:text-club-gold'}`}>
                            {l.label}
                        </Link>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    {loading ? null : !session ? (
                        <>
                            <Link href="/login" className="hidden text-sm font-semibold hover:text-club-gold sm:inline">Entrar</Link>
                            <Link href="/socio" className="btn btn-accent btn-sm">Seja sócio</Link>
                        </>
                    ) : pending2fa ? (
                        <Link href="/2fa" className="btn btn-accent btn-sm">Concluir login</Link>
                    ) : (
                        <div className="relative" ref={menuRef}>
                            <button type="button" onClick={() => setMenuOpen(o => !o)} className="relative flex items-center gap-2 rounded-full p-0.5" aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Menu da conta">
                                <Avatar name={session.user.name} photoUrl={session.user.photoUrl} size={36} />
                                {unread > 0 && (
                                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-club-red px-1 text-center text-[11px] font-bold leading-5 text-ink-inverse" aria-label={`${unread} notificações não lidas`}>
                                        {unread > 9 ? '9+' : unread}
                                    </span>
                                )}
                            </button>
                            {menuOpen && (
                                <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-line bg-surface text-ink shadow-xl">
                                    <div className="border-b border-line px-4 py-3">
                                        <div className="truncate font-semibold">{session.user.name}</div>
                                        <div className="truncate text-xs text-ink-muted">{session.user.email}</div>
                                    </div>
                                    <MenuLink href="/minha-conta" icon={<FaUser />}>Minha conta</MenuLink>
                                    <MenuLink href="/minha-conta?aba=ingressos" icon={<FaTicket />}>Meus ingressos</MenuLink>
                                    {session.membership && <MenuLink href="/minha-conta?aba=carteirinha" icon={<FaIdCard />}>Carteirinha</MenuLink>}
                                    <MenuLink href="/minha-conta?aba=notificacoes" icon={<FaBell />}>
                                        Notificações {unread > 0 && <span className="ml-auto rounded-full bg-club-red px-2 text-xs font-bold text-ink-inverse">{unread}</span>}
                                    </MenuLink>
                                    {(isStaff || can('checkin.validate')) && <div className="border-t border-line" />}
                                    {isStaff && <MenuLink href="/admin" icon={<FaGauge />}>Painel</MenuLink>}
                                    {can('checkin.validate') && <MenuLink href="/validar" icon={<FaQrcode />}>Validar entradas</MenuLink>}
                                    <button type="button" role="menuitem" onClick={() => void logout()} className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left text-sm hover:bg-surface-hover">
                                        <FaRightFromBracket className="text-ink-muted" /> Sair
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="club-stripes h-1.5" aria-hidden />

            {mobileOpen && (
                <nav className="border-t border-brand-strong bg-brand-deep md:hidden" aria-label="Menu principal">
                    {LINKS.map(l => (
                        <Link key={l.href} href={l.href} className={`display block px-5 py-3 text-xl ${active(l.href) ? 'text-club-gold' : 'text-brand-ink'}`}>{l.label}</Link>
                    ))}
                    {!session && <Link href="/login" className="display block px-5 py-3 text-xl text-brand-ink">Entrar</Link>}
                </nav>
            )}
        </header>
    );
}

function MenuLink({ href, icon, children }: { href: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <Link href={href} role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-hover">
            <span className="text-ink-muted">{icon}</span>{children}
        </Link>
    );
}
