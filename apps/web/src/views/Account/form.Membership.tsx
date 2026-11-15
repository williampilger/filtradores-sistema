'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Minha associação: plano, situação e cobranças (pagar abre o pedido)
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaCheck } from 'react-icons/fa6';
import { formatDate, formatMoney, LABELS, type ChargeDTO } from '@filt/shared';
import API from '@/api';
import type { MyMembership } from '@/api/types';
import { Badge, Card, Empty, Spinner, statusTone } from '@/components/ui';

export function MembershipTab() {
    const router = useRouter();
    const [data, setData] = useState<{ membership: MyMembership | null, charges: ChargeDTO[] } | null>(null);
    const [paying, setPaying] = useState<number | null>(null);

    useEffect(() => { API.me.membership().then(r => setData(r.success ? r.data : { membership: null, charges: [] })); }, []);

    if (!data) return <Spinner />;
    const m = data.membership;
    if (!m) return (
        <div className="hero-blue flex flex-col items-center gap-4 rounded-2xl p-8 text-center">
            <h2 className="display text-5xl">Seja sócio</h2>
            <p className="max-w-md opacity-90">Você ainda não é sócio do Filtradores. Escolha um plano e tenha a carteirinha digital, vantagens nos jogos e descontos.</p>
            <Link href="/socio" className="btn btn-accent btn-lg">Conhecer os planos</Link>
        </div>
    );

    const pay = async (c: ChargeDTO) => {
        setPaying(c.id);
        const r = await API.me.payCharge(c.id);
        setPaying(null);
        if (r.success) router.push(`/pedido/${r.data.code}`);
    };

    return (
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="hero-blue p-5">
                    <div className="text-xs font-bold uppercase tracking-[.2em] text-club-gold">Seu plano</div>
                    <div className="display text-4xl">{m.plan.name}</div>
                    <div className="mt-1 text-sm opacity-90">{formatMoney(m.plan.priceCents)} · {LABELS.billingPeriod[m.plan.period]}</div>
                </div>
                <div className="club-stripes h-1.5" aria-hidden />
                <dl className="grid grid-cols-2 gap-3 p-5 text-sm">
                    <div><dt className="lbl">Situação</dt><dd><Badge tone={statusTone(m.status)}>{LABELS.membershipStatus[m.status]}</Badge></dd></div>
                    <div><dt className="lbl">Nº de sócio</dt><dd className="font-semibold">{m.memberNumber ?? '-'}</dd></div>
                    <div><dt className="lbl">Sócio desde</dt><dd>{formatDate(m.startedAt) || '-'}</dd></div>
                    <div><dt className="lbl">Válido até</dt><dd>{formatDate(m.currentPeriodEnd) || '-'}</dd></div>
                    <div className="col-span-2"><dt className="lbl">Jogos</dt><dd>{LABELS.memberEventAccess[m.plan.eventAccess]}</dd></div>
                </dl>
                {m.plan.benefits.length > 0 && (
                    <ul className="flex flex-col gap-1.5 border-t border-line p-5 text-sm">
                        {m.plan.benefits.map((b, i) => <li key={i} className="flex gap-2"><FaCheck className="mt-0.5 shrink-0 text-ok" />{b}</li>)}
                    </ul>
                )}
                <div className="border-t border-line p-5">
                    <Link href="/minha-conta?aba=carteirinha" className="btn btn-primary w-full">Abrir carteirinha</Link>
                    {(m.status === 'CANCELED' || m.status === 'EXPIRED') && <Link href="/socio" className="btn btn-accent mt-2 w-full">Associar-se novamente</Link>}
                </div>
            </div>

            <Card title="Cobranças">
                {m.status === 'PENDING' && <p className="mb-3 rounded-lg bg-warn-soft p-3 text-sm">Sua adesão aguarda pagamento. Assim que for confirmado, a carteirinha é liberada.</p>}
                {m.status === 'OVERDUE' && <p className="mb-3 rounded-lg bg-danger-soft p-3 text-sm">Há cobrança vencida. Regularize para voltar a entrar nos jogos com a carteirinha.</p>}
                {data.charges.length === 0 ? <Empty>Nenhuma cobrança.</Empty> : (
                    <div className="overflow-x-auto">
                        <table className="tbl">
                            <thead><tr><th>Vencimento</th><th>Período</th><th className="num">Valor</th><th>Situação</th><th /></tr></thead>
                            <tbody>
                                {data.charges.map(c => (
                                    <tr key={c.id}>
                                        <td>{formatDate(c.dueDate)}</td>
                                        <td className="text-xs text-ink-muted">{c.periodStart ? `${formatDate(c.periodStart)} a ${formatDate(c.periodEnd)}` : 'Adesão'}</td>
                                        <td className="num">{formatMoney(c.amountCents)}</td>
                                        <td><Badge tone={statusTone(c.status)}>{LABELS.chargeStatus[c.status]}</Badge>{c.paidAt && <div className="text-xs text-ink-faint">em {formatDate(c.paidAt)}</div>}</td>
                                        <td className="text-right">
                                            {(c.status === 'OPEN' || c.status === 'OVERDUE') && (
                                                <button type="button" className="btn btn-accent btn-sm" disabled={paying !== null} onClick={() => void pay(c)}>{paying === c.id ? 'Aguarde...' : 'Pagar'}</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
