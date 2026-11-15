'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - "Seja sócio": planos, adesão (exige login e CPF no cadastro) -> pedido para pagamento
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaIdCard, FaPercent, FaTicket, FaLock } from 'react-icons/fa6';
import { formatCpf, isValidCpf, LABELS, onlyDigits, type PlanDTO } from '@filt/shared';
import API from '@/api';
import { Empty, Field, Input, Modal, Spinner } from '@/components/ui';
import { loginHref } from '@/components/site/helpers';
import { PlanCard } from '@/components/site/PlanCard';
import { Container, PageHero, SectionTitle } from '@/components/site/Section';
import { useSession } from '@/hooks/useSession';

export default function Plans() {
    const router = useRouter();
    const { session, refresh } = useSession();
    const [plans, setPlans] = useState<PlanDTO[] | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [cpfFor, setCpfFor] = useState<PlanDTO | null>(null);
    const [cpf, setCpf] = useState('');

    useEffect(() => { API.public.plans().then(r => setPlans(r.success ? r.data : [])); }, []);

    const m = session?.membership;
    const isCurrent = (p: PlanDTO) => m?.plan.id === p.id && m.status !== 'CANCELED' && m.status !== 'EXPIRED';
    const hasMembership = !!m && m.status !== 'CANCELED' && m.status !== 'EXPIRED';

    const join = async (plan: PlanDTO) => {
        if (!session) return router.push(loginHref('/socio'));
        if (session.mfaPending || session.mfaSetupRequired) return router.push('/2fa?next=/socio');
        if (hasMembership) return router.push('/minha-conta?aba=socio');
        if (!session.user.cpf) { setCpfFor(plan); return; }
        setBusyId(plan.id);
        const r = await API.me.join(plan.id);
        setBusyId(null);
        if (!r.success) return;
        toast.success('Adesão registrada! Agora é só pagar para ativar a carteirinha.');
        await refresh();
        router.push(`/pedido/${r.data.code}`);
    };

    const saveCpfAndJoin = async () => {
        if (!cpfFor) return;
        if (!isValidCpf(cpf)) return void toast.error('CPF inválido');
        const r = await API.me.updateProfile({ cpf: onlyDigits(cpf) });
        if (!r.success) return;
        const s = await refresh();
        const plan = cpfFor;
        setCpfFor(null);
        if (s?.user.cpf) void join(plan);
    };

    const featuredIdx = plans && plans.length >= 3 ? Math.floor(plans.length / 2) : -1;

    return (
        <>
            <PageHero kicker="Sócio-torcedor ACEF" title={<>Seja <span className="text-club-gold">sócio</span></>} subtitle="Seu lugar no Filtradores começa aqui! Apoie o time, garanta vantagens nos jogos do Morangão e tenha a carteirinha digital no celular.">
                {hasMembership && (
                    <div className="mt-5 inline-flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 text-ink">
                        <FaIdCard className="text-brand" />
                        <span>Você é sócio <b>{m!.plan.name}</b> · {LABELS.membershipStatus[m!.status]}</span>
                        <Link href="/minha-conta?aba=socio" className="btn btn-primary btn-sm">Minha associação</Link>
                    </div>
                )}
            </PageHero>

            <Container className="py-10">
                <div className="mb-10 grid gap-4 sm:grid-cols-3">
                    {[
                        { icon: <FaTicket />, t: 'Jogos em casa', d: 'Entrada com a carteirinha ou resgate do ingresso, conforme o plano.' },
                        { icon: <FaPercent />, t: 'Descontos', d: 'Preço especial em ingressos e na loja oficial do clube.' },
                        { icon: <FaLock />, t: 'Conteúdo exclusivo', d: 'Bastidores, convocações e novidades só para sócios.' },
                    ].map(x => (
                        <div key={x.t} className="panel flex gap-3 p-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">{x.icon}</span>
                            <div><div className="font-bold text-brand-deep">{x.t}</div><div className="text-sm text-ink-muted">{x.d}</div></div>
                        </div>
                    ))}
                </div>

                <SectionTitle kicker="Planos" title="Escolha o seu" />
                {plans === null ? <Spinner /> : plans.length === 0 ? <Empty>Os planos de sócio estarão disponíveis em breve.</Empty> : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {plans.map((p, i) => (
                            <PlanCard key={p.id} plan={p} featured={i === featuredIdx} action={
                                isCurrent(p) ? (
                                    <Link href="/minha-conta?aba=socio" className="btn btn-lg w-full">Seu plano atual</Link>
                                ) : (
                                    <button type="button" className={`btn btn-lg w-full ${i === featuredIdx ? 'btn-accent' : 'btn-primary'}`} disabled={busyId !== null || (hasMembership && !isCurrent(p))} onClick={() => void join(p)}>
                                        {busyId === p.id ? 'Aguarde...' : hasMembership ? 'Fale com a diretoria para trocar' : 'Quero ser sócio'}
                                    </button>
                                )
                            } />
                        ))}
                    </div>
                )}
                <p className="mt-6 text-center text-xs text-ink-muted">
                    A carteirinha é liberada assim que o pagamento é confirmado. A renovação é cobrada conforme o período do plano.
                    {!session && <> Já tem conta? <Link href={loginHref('/socio')} className="font-semibold text-brand hover:underline">Entre</Link>.</>}
                </p>
            </Container>

            <Modal open={!!cpfFor} title="Informe seu CPF" onClose={() => setCpfFor(null)}
                footer={<><button className="btn" onClick={() => setCpfFor(null)}>Cancelar</button><button className="btn btn-primary" onClick={() => void saveCpfAndJoin()}>Salvar e continuar</button></>}>
                <p className="mb-3 text-sm text-ink-muted">O CPF é necessário para a associação e para emitir as cobranças. Ele fica salvo no seu perfil.</p>
                <Field label="CPF" hint={cpf && !isValidCpf(cpf) ? <span className="text-danger">CPF inválido</span> : undefined}>
                    <Input value={cpf} onChange={setCpf} onBlur={() => setCpf(formatCpf(cpf))} inputMode="numeric" placeholder="000.000.000-00" autoFocus />
                </Field>
            </Modal>
        </>
    );
}
