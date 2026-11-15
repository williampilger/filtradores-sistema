'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Painel inicial do admin: sócios, pedidos, entregas, fila de espera, receita do mês e próximos eventos
 *              (cada bloco só aparece se a API devolveu, conforme as permissões do usuário)
 */
import Link from 'next/link';
import { formatDateTime, LABELS, MEMBERSHIP_STATUS, type GatewayId } from '@filt/shared';
import API from '@/api';
import { Badge, Card, Empty, Money, PageHeader, Spinner, Stat, statusTone } from '@/components/ui';
import { TableBox, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';

export default function Dashboard() {
    const { session } = useSession();
    const { data, loading } = useData(() => API.admin.dashboard(), []);

    if (loading && !data) return <Spinner />;
    const d = data ?? {};
    const revenueTotal = (d.revenueMonth ?? []).reduce((s, r) => s + r.cents, 0);

    return (
        <div className="space-y-5">
            <PageHeader title={<span className="display text-3xl text-brand-deep">Olá, {session?.user.name.split(' ')[0]}</span>} subtitle="Resumo do clube" />

            {d.members && (
                <section>
                    <h2 className="mb-2 text-sm font-semibold text-ink-muted">Sócios</h2>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                        {MEMBERSHIP_STATUS.map(s => (
                            <Link key={s} href={`/admin/socios?status=${s}`}>
                                <Stat label={LABELS.membershipStatus[s]} value={d.members?.[s] ?? 0}
                                    tone={s === 'ACTIVE' ? 'ok' : s === 'OVERDUE' ? 'danger' : s === 'PENDING' ? 'warn' : 'default'} />
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {(d.ordersPending !== undefined || d.paymentsToRefund !== undefined) && (
                <section>
                    <h2 className="mb-2 text-sm font-semibold text-ink-muted">Operação</h2>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {d.ordersPending !== undefined && <Link href="/admin/pedidos?status=PENDING_PAYMENT"><Stat label="Pedidos aguardando pagamento" value={d.ordersPending} tone={d.ordersPending ? 'warn' : 'default'} /></Link>}
                        {d.itemsToDeliver !== undefined && <Link href="/admin/pedidos?delivery=pending"><Stat label="Itens a entregar" value={d.itemsToDeliver} tone={d.itemsToDeliver ? 'warn' : 'default'} /></Link>}
                        {d.waitlistWaiting !== undefined && <Stat label="Na lista de espera" value={d.waitlistWaiting} />}
                        {d.paymentsToRefund !== undefined && (
                            <Link href="/admin/pagamentos?attention=1">
                                <Stat label="Pagamentos p/ estornar" value={d.paymentsToRefund} tone={d.paymentsToRefund ? 'danger' : 'ok'} hint="Pagos após a expiração do pedido" />
                            </Link>
                        )}
                    </div>
                </section>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                {d.revenueMonth && (
                    <Card title="Receita do mês (líquida de estornos)">
                        {d.revenueMonth.length === 0 ? <Empty>Nenhum pagamento neste mês.</Empty> : (
                            <TableBox>
                                <thead><tr><th>Gateway</th><th className="num">Valor</th></tr></thead>
                                <tbody>
                                    {d.revenueMonth.map(r => <tr key={r.gateway}><td>{LABELS.gateway[r.gateway as GatewayId] ?? r.gateway}</td><td className="num"><Money cents={r.cents} /></td></tr>)}
                                    <tr><td className="font-semibold">Total</td><td className="num font-semibold"><Money cents={revenueTotal} /></td></tr>
                                </tbody>
                            </TableBox>
                        )}
                    </Card>
                )}

                {d.upcomingEvents && (
                    <Card title="Próximos eventos" actions={<Link href="/admin/eventos" className="btn btn-sm">Ver todos</Link>}>
                        {d.upcomingEvents.length === 0 ? <Empty>Nenhum evento agendado.</Empty> : (
                            <TableBox>
                                <thead><tr><th>Evento</th><th>Data</th><th>Status</th><th className="num">Ingressos</th></tr></thead>
                                <tbody>
                                    {d.upcomingEvents.map(e => (
                                        <tr key={e.id}>
                                            <td><Link href={`/admin/eventos/${e.id}`} className="font-medium text-brand hover:underline">{e.title}</Link></td>
                                            <td className="whitespace-nowrap">{formatDateTime(e.startsAt)}</td>
                                            <td><Badge tone={statusTone(e.status)}>{LABELS.eventStatus[e.status]}</Badge></td>
                                            <td className="num">{e._count.Tickets}{e.capacity ? ` / ${e.capacity}` : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </TableBox>
                        )}
                    </Card>
                )}
            </div>
        </div>
    );
}
