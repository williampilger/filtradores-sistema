'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Minha conta: abas sincronizadas com ?aba= (links diretos do menu, e-mails e notificações)
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LABELS } from '@filt/shared';
import { Spinner, Tabs } from '@/components/ui';
import { Avatar } from '@/components/site/Avatar';
import { Container } from '@/components/site/Section';
import { useRequireSession } from '@/components/site/useRequireSession';
import { CardTab } from './form.Card';
import { DeleteAccountTab } from './form.DeleteAccount';
import { MembershipTab } from './form.Membership';
import { NotificationsTab } from './form.Notifications';
import { OrdersTab } from './form.Orders';
import { ProfileTab } from './form.Profile';
import { SecurityTab } from './form.Security';
import { TicketsTab } from './form.Tickets';
import { WaitlistTab } from './form.Waitlist';

const TAB_KEYS = ['ingressos', 'socio', 'carteirinha', 'pedidos', 'espera', 'notificacoes', 'perfil', 'seguranca', 'excluir'] as const;
type TabKey = (typeof TAB_KEYS)[number];

export default function Account({ tab }: { tab?: string }) {
    const router = useRouter();
    const { session } = useRequireSession();
    const [active, setActive] = useState<TabKey>(TAB_KEYS.includes(tab as TabKey) ? (tab as TabKey) : 'ingressos');

    if (!session) return <Spinner />;

    const change = (k: TabKey) => {
        setActive(k);
        router.replace(`/minha-conta?aba=${k}`, { scroll: false });
    };
    const m = session.membership;
    const unread = session.unreadNotifications;

    return (
        <>
            <section className="hero-blue">
                <Container className="flex items-center gap-4 py-8">
                    <Avatar name={session.user.name} photoUrl={session.user.photoUrl} size={72} className="ring-2 ring-club-gold" />
                    <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-[.25em] text-club-gold">{m && m.status === 'ACTIVE' ? `Sócio ${m.plan.name}` : 'Torcedor'}</div>
                        <h1 className="display truncate text-4xl">{session.user.name}</h1>
                        <div className="text-sm opacity-80">
                            {m ? <>{m.memberNumber != null && <>Sócio nº {m.memberNumber} · </>}{LABELS.membershipStatus[m.status]}</> : session.user.email}
                        </div>
                    </div>
                </Container>
                <div className="club-stripes h-2" aria-hidden />
            </section>
            <Container className="py-6">
                <Tabs<TabKey> value={active} onChange={change} tabs={[
                    { key: 'ingressos', label: 'Ingressos' },
                    { key: 'socio', label: 'Sócio' },
                    { key: 'carteirinha', label: 'Carteirinha' },
                    { key: 'pedidos', label: 'Pedidos' },
                    { key: 'espera', label: 'Lista de espera' },
                    { key: 'notificacoes', label: unread > 0 ? `Notificações (${unread})` : 'Notificações' },
                    { key: 'perfil', label: 'Perfil' },
                    { key: 'seguranca', label: 'Segurança' },
                    { key: 'excluir', label: 'Excluir conta' },
                ]} />
                {active === 'ingressos' && <TicketsTab />}
                {active === 'socio' && <MembershipTab />}
                {active === 'carteirinha' && <CardTab />}
                {active === 'pedidos' && <OrdersTab />}
                {active === 'espera' && <WaitlistTab />}
                {active === 'notificacoes' && <NotificationsTab />}
                {active === 'perfil' && <ProfileTab />}
                {active === 'seguranca' && <SecurityTab />}
                {active === 'excluir' && <DeleteAccountTab />}
            </Container>
        </>
    );
}
