'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Estrutura do painel administrativo: barra superior (marca + menu do usuário), menu lateral por permissão
 *              (vira gaveta no celular) e guarda de acesso (login / 2FA / equipe)
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import {
    MdAdminPanelSettings, MdArticle, MdAttachMoney, MdCardMembership, MdClose, MdDashboard, MdEvent, MdHistory, MdInventory2, MdKeyboardArrowDown,
    MdMenu, MdPayments, MdPeople, MdQrCodeScanner, MdReceiptLong, MdSettings, MdSportsSoccer, MdVerifiedUser, MdWorkspacePremium,
} from 'react-icons/md';
import type { Permission } from '@filt/shared';
import { Spinner } from '@/components/ui';
import { useSession } from '@/hooks/useSession';

type NavItem = { href: string, label: string, icon: IconType, perms?: Permission[] };

/** Menu agrupado. Cada item aparece somente se o usuário tiver UMA das permissões listadas. */
const NAV: { label: string, items: NavItem[] }[] = [
    { label: 'Geral', items: [{ href: '/admin', label: 'Painel', icon: MdDashboard }] },
    {
        label: 'Sócios', items: [
            { href: '/admin/socios', label: 'Sócios', icon: MdCardMembership, perms: ['members.read'] },
            { href: '/admin/planos', label: 'Planos', icon: MdWorkspacePremium, perms: ['plans.manage'] },
        ],
    },
    {
        label: 'Time e eventos', items: [
            { href: '/admin/eventos', label: 'Eventos e jogos', icon: MdEvent, perms: ['events.read', 'events.write', 'lineups.write', 'tickets.sell_manual', 'checkin.validate'] },
            { href: '/validar', label: 'Leitor de QR (portaria)', icon: MdQrCodeScanner, perms: ['checkin.validate'] },
            { href: '/admin/elenco', label: 'Elenco', icon: MdSportsSoccer, perms: ['squad.write'] },
            { href: '/admin/feed', label: 'Feed', icon: MdArticle, perms: ['feed.write'] },
        ],
    },
    {
        label: 'Loja', items: [
            { href: '/admin/produtos', label: 'Produtos', icon: MdInventory2, perms: ['products.write', 'stock.adjust', 'waitlist.manage', 'orders.read'] },
            { href: '/admin/pedidos', label: 'Pedidos', icon: MdReceiptLong, perms: ['orders.read'] },
        ],
    },
    {
        label: 'Financeiro', items: [
            { href: '/admin/pagamentos', label: 'Pagamentos', icon: MdAttachMoney, perms: ['payments.read', 'reports.finance'] },
            { href: '/admin/gateways', label: 'Gateways', icon: MdPayments, perms: ['gateways.manage'] },
        ],
    },
    {
        label: 'Administração', items: [
            { href: '/admin/usuarios', label: 'Usuários', icon: MdPeople, perms: ['users.read', 'members.read'] },
            { href: '/admin/papeis', label: 'Papéis e permissões', icon: MdVerifiedUser, perms: ['roles.manage'] },
            { href: '/admin/auditoria', label: 'Auditoria', icon: MdHistory, perms: ['audit.read'] },
            { href: '/admin/configuracoes', label: 'Configurações', icon: MdSettings, perms: ['settings.manage'] },
        ],
    },
];

function SideNav({ pathname, can }: { pathname: string, can: (...p: Permission[]) => boolean }) {
    return (
        <nav className="flex flex-col gap-3 py-3">
            {NAV.map(g => {
                const items = g.items.filter(i => !i.perms || can(...i.perms));
                if (!items.length) return null;
                return (
                    <div key={g.label}>
                        <div className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-ink/60">{g.label}</div>
                        {items.map(i => {
                            const active = i.href === '/admin' ? pathname === '/admin' : pathname.startsWith(i.href);
                            const Icon = i.icon;
                            return (
                                <Link key={i.href} href={i.href}
                                    className={`flex h-9 items-center gap-2.5 border-l-[3px] px-4 text-[13.5px] ${active ? 'border-sidebar-active bg-header/50 font-semibold text-sidebar-active' : 'border-transparent hover:bg-header/30 hover:text-header-ink'}`}>
                                    <Icon size={18} className="shrink-0" />
                                    <span className="truncate">{i.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                );
            })}
        </nav>
    );
}

function UserMenu({ name, email, onLogout }: { name: string, email: string, onLogout: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        window.addEventListener('mousedown', h);
        return () => window.removeEventListener('mousedown', h);
    }, [open]);
    return (
        <div className="relative" ref={ref}>
            <button className="flex h-9 items-center gap-1 rounded-md px-2 text-sm text-header-ink hover:bg-sidebar" onClick={() => setOpen(v => !v)}>
                <span className="max-w-[160px] truncate">{name}</span>
                <MdKeyboardArrowDown />
            </button>
            {open && (
                <div className="panel absolute right-0 top-10 z-50 w-56 py-1 text-ink shadow-xl">
                    <div className="border-b border-line px-3 py-2">
                        <div className="truncate text-sm font-semibold">{name}</div>
                        <div className="truncate text-xs text-ink-muted">{email}</div>
                    </div>
                    <Link href="/" className="block px-3 py-2 text-sm hover:bg-surface-hover" onClick={() => setOpen(false)}>Ver site</Link>
                    <Link href="/minha-conta" className="block px-3 py-2 text-sm hover:bg-surface-hover" onClick={() => setOpen(false)}>Minha conta</Link>
                    <button className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft" onClick={onLogout}>Sair</button>
                </div>
            )}
        </div>
    );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const { session, loading, can, isStaff, logout } = useSession();
    const pathname = usePathname() ?? '/admin';
    const router = useRouter();
    const [drawer, setDrawer] = useState(false);

    // guarda: sem sessão -> login | 2FA pendente/obrigatório -> tela do 2FA
    const blocked = !session || session.mfaPending || session.mfaSetupRequired;
    useEffect(() => {
        if (loading) return;
        const next = encodeURIComponent(pathname);
        if (!session) router.replace(`/login?next=${next}`);
        else if (session.mfaPending || session.mfaSetupRequired) router.replace(`/2fa?next=${next}`);
    }, [loading, session, pathname, router]);

    // fecha a gaveta ao navegar
    useEffect(() => { setDrawer(false); }, [pathname]);

    if (loading || blocked) return <div className="flex min-h-screen items-center justify-center"><Spinner label={loading ? 'Carregando...' : 'Redirecionando...'} /></div>;

    if (!isStaff) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="panel max-w-sm p-6 text-center">
                    <div className="display mb-2 text-3xl text-brand">Sem acesso</div>
                    <p className="mb-4 text-sm text-ink-muted">Sua conta não tem permissão para acessar o painel administrativo.</p>
                    <Link href="/" className="btn btn-primary">Voltar ao site</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-30 flex h-header shrink-0 items-center gap-2 bg-header px-2 text-header-ink shadow md:px-4">
                <button className="btn btn-ghost btn-sm text-header-ink md:hidden" onClick={() => setDrawer(true)} aria-label="Abrir menu"><MdMenu size={20} /></button>
                <Link href="/admin" className="flex items-baseline gap-2">
                    <span className="display text-2xl text-header-ink">AC<span className="text-club-gold">EF</span></span>
                    <span className="hidden items-center gap-1 text-xs text-sidebar-ink sm:flex"><MdAdminPanelSettings /> Painel administrativo</span>
                </Link>
                <div className="flex-1" />
                <UserMenu name={session.user.name} email={session.user.email} onLogout={() => void logout()} />
            </header>
            <div className="club-stripes h-1 shrink-0" />

            <div className="flex min-h-0 flex-1">
                <aside className="hidden w-menu shrink-0 overflow-y-auto bg-sidebar text-sidebar-ink md:block">
                    <SideNav pathname={pathname} can={can} />
                </aside>

                {drawer && (
                    <div className="fixed inset-0 z-40 flex md:hidden">
                        <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} />
                        <aside className="relative h-full w-[260px] max-w-[85vw] overflow-y-auto bg-sidebar text-sidebar-ink shadow-xl">
                            <div className="flex h-header items-center justify-between bg-header px-4">
                                <span className="display text-xl text-header-ink">AC<span className="text-club-gold">EF</span></span>
                                <button className="btn btn-ghost btn-sm text-header-ink" onClick={() => setDrawer(false)} aria-label="Fechar menu"><MdClose size={18} /></button>
                            </div>
                            <SideNav pathname={pathname} can={can} />
                        </aside>
                    </div>
                )}

                <main className="min-w-0 flex-1 p-3 md:p-6">
                    <div className="mx-auto max-w-[1400px]">{children}</div>
                </main>
            </div>
        </div>
    );
}
