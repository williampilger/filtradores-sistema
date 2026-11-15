'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Sócio: ficha (foto, plano, período), reemissão da carteirinha, cancelamento, cobranças e entradas em eventos
 */
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatCpf, formatDate, formatDateTime, LABELS, type GatewayId } from '@filt/shared';
import API from '@/api';
import type { MemberDetail as MemberDetailT } from '@/api/types';
import { Badge, Card, confirmAction, Empty, Field, Modal, Money, MoneyInput, PageHeader, Select, Spinner, statusTone, TextArea } from '@/components/ui';
import { dateInputToIso, RequirePerm, TableBox, Thumb, useBusy, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';

type Charge = MemberDetailT['charges'][number];

function NewChargeModal({ open, member, onClose, onDone }: { open: boolean, member: MemberDetailT, onClose: () => void, onDone: () => void }) {
    const [amount, setAmount] = useState<number | null>(null);
    const [due, setDue] = useState('');
    const { busy, run } = useBusy();
    const submit = async () => {
        const r = await run('save', () => API.admin.members.createCharge(member.id, { amountCents: amount ?? undefined, dueDate: dateInputToIso(due) ?? undefined }));
        if (r.success) { toast.success('Cobrança gerada'); setAmount(null); setDue(''); onClose(); onDone(); }
    };
    return (
        <Modal open={open} title="Gerar cobrança" onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!!busy} onClick={() => void submit()}>{busy ? 'Gerando...' : 'Gerar'}</button></>}>
            <div className="space-y-3">
                <p className="text-sm text-ink-muted">Gera a cobrança do próximo período do plano <b>{member.plan.name}</b> (<Money cents={member.plan.priceCents} />, {LABELS.billingPeriod[member.plan.period].toLowerCase()}).</p>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Valor" hint="Vazio = preço do plano"><MoneyInput cents={amount} onChange={setAmount} /></Field>
                    <Field label="Vencimento" hint="Vazio = padrão"><input type="date" className="inp" value={due} onChange={e => setDue(e.target.value)} /></Field>
                </div>
            </div>
        </Modal>
    );
}

function PayManualModal({ charge, onClose, onDone }: { charge: Charge | null, onClose: () => void, onDone: () => void }) {
    const [method, setMethod] = useState<'CASH' | 'MANUAL'>('CASH');
    const [note, setNote] = useState('');
    const { busy, run } = useBusy();
    const submit = async () => {
        if (!charge) return;
        const r = await run('pay', () => API.admin.members.payChargeManual(charge.id, method, note.trim() || undefined));
        if (r.success) { toast.success(`Pagamento registrado (pedido ${r.data.orderCode})`); setNote(''); onClose(); onDone(); }
    };
    return (
        <Modal open={!!charge} title="Registrar pagamento manual" onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!!busy} onClick={() => void submit()}>{busy ? 'Registrando...' : 'Registrar pagamento'}</button></>}>
            {charge && (
                <div className="space-y-3">
                    <p className="text-sm">Cobrança #{charge.id} · <Money cents={charge.amountCents} /> · vencimento {formatDate(charge.dueDate)}</p>
                    <Field label="Forma"><Select value={method} onChange={setMethod} options={[{ value: 'CASH', label: LABELS.paymentMethod.CASH }, { value: 'MANUAL', label: 'Manual (transferência, PIX direto etc.)' }]} /></Field>
                    <Field label="Observação"><TextArea value={note} onChange={setNote} rows={2} placeholder="Ex.: recebido na secretaria por Fulano" /></Field>
                </div>
            )}
        </Modal>
    );
}

function CancelModal({ open, memberId, onClose, onDone }: { open: boolean, memberId: number, onClose: () => void, onDone: () => void }) {
    const [reason, setReason] = useState('');
    const { busy, run } = useBusy();
    const submit = async () => {
        const r = await run('cancel', () => API.admin.members.cancel(memberId, reason.trim()));
        if (r.success) { toast.success('Associação cancelada'); setReason(''); onClose(); onDone(); }
    };
    return (
        <Modal open={open} title="Cancelar associação" onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Voltar</button><button className="btn btn-danger" disabled={!!busy || reason.trim().length < 3} onClick={() => void submit()}>{busy ? 'Cancelando...' : 'Cancelar associação'}</button></>}>
            <p className="mb-3 text-sm text-ink-muted">A carteirinha deixa de valer e as cobranças em aberto são canceladas.</p>
            <Field label="Motivo *"><TextArea value={reason} onChange={setReason} rows={3} /></Field>
        </Modal>
    );
}

function MemberDetailInner({ id }: { id: number }) {
    const { can } = useSession();
    const { data: m, loading, reload } = useData(() => API.admin.members.get(id), [id]);
    const [newCharge, setNewCharge] = useState(false);
    const [paying, setPaying] = useState<Charge | null>(null);
    const [canceling, setCanceling] = useState(false);
    const { busy, run } = useBusy();

    if (loading && !m) return <Spinner />;
    if (!m) return <Empty>Sócio não encontrado.</Empty>;
    const refresh = () => void reload();
    const active = m.status !== 'CANCELED' && m.status !== 'EXPIRED';

    const rotate = async () => {
        if (!confirmAction('Reemitir a carteirinha? O QR atual deixa de valer (use em caso de perda/roubo do celular ou print compartilhado).')) return;
        const r = await run('rotate', () => API.admin.members.rotateCard(m.id));
        if (r.success) refresh();
    };
    const cancelCharge = async (c: Charge) => {
        if (!confirmAction(`Cancelar a cobrança #${c.id}?`)) return;
        const r = await run(`cc${c.id}`, () => API.admin.members.cancelCharge(c.id));
        if (r.success) { toast.success('Cobrança cancelada'); refresh(); }
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title={<span className="flex items-center gap-3"><Thumb url={m.user.photoUrl} size={56} round />{m.user.name}</span>}
                subtitle={<span>{m.memberNumber ? `Sócio nº ${m.memberNumber} · ` : ''}{m.user.email}</span>}
                actions={<>
                    <Link href="/admin/socios" className="btn">‹ Sócios</Link>
                    {can('users.read') && <Link href={`/admin/usuarios/${m.user.id}`} className="btn">Cadastro do usuário</Link>}
                </>} />

            <div className="grid gap-4 lg:grid-cols-3">
                <Card title="Associação" className="lg:col-span-2">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                        <div><dt className="lbl">Situação</dt><dd><Badge tone={statusTone(m.status)}>{LABELS.membershipStatus[m.status]}</Badge></dd></div>
                        <div><dt className="lbl">Plano</dt><dd className="font-medium">{m.plan.name}</dd></div>
                        <div><dt className="lbl">Valor do plano</dt><dd><Money cents={m.plan.priceCents} /> <span className="text-ink-muted">({LABELS.billingPeriod[m.plan.period]})</span></dd></div>
                        <div><dt className="lbl">Sócio desde</dt><dd>{formatDate(m.startedAt) || '-'}</dd></div>
                        <div><dt className="lbl">Período atual</dt><dd>{m.currentPeriodStart ? `${formatDate(m.currentPeriodStart)} a ${formatDate(m.currentPeriodEnd)}` : '-'}</dd></div>
                        <div><dt className="lbl">Acesso a eventos</dt><dd>{LABELS.memberEventAccess[m.plan.eventAccess]}</dd></div>
                        <div><dt className="lbl">CPF</dt><dd>{formatCpf(m.user.cpf) || '-'}</dd></div>
                        <div><dt className="lbl">Telefone</dt><dd>{m.user.phone || '-'}</dd></div>
                        <div><dt className="lbl">Versão da carteirinha</dt><dd>{m.qrVersion}</dd></div>
                        {m.canceledAt && <div className="col-span-full"><dt className="lbl">Cancelado em</dt><dd>{formatDateTime(m.canceledAt)} - {m.cancelReason}</dd></div>}
                    </dl>
                </Card>
                <Card title="Ações">
                    <div className="flex flex-col gap-2">
                        {can('members.write') && active && <button className="btn" disabled={!!busy} onClick={() => void rotate()}>Reemitir carteirinha (novo QR)</button>}
                        {can('memberships.charges') && active && <button className="btn" onClick={() => setNewCharge(true)}>Gerar cobrança</button>}
                        {can('members.write') && active && <button className="btn btn-danger" onClick={() => setCanceling(true)}>Cancelar associação</button>}
                        {!active && <p className="text-sm text-ink-muted">Associação encerrada. Para reativar, use "Sócio" no cadastro do usuário.</p>}
                    </div>
                </Card>
            </div>

            <Card title="Cobranças">
                {m.charges.length === 0 ? <Empty>Nenhuma cobrança.</Empty> : (
                    <TableBox>
                        <thead><tr><th>#</th><th>Vencimento</th><th>Referência</th><th className="num">Valor</th><th>Situação</th><th>Pago em</th><th>Pedidos / pagamentos</th><th /></tr></thead>
                        <tbody>
                            {m.charges.map(c => {
                                const open = c.status === 'OPEN' || c.status === 'OVERDUE';
                                return (
                                    <tr key={c.id}>
                                        <td className="text-ink-muted">{c.id}</td>
                                        <td className="whitespace-nowrap">{formatDate(c.dueDate)}</td>
                                        <td className="whitespace-nowrap text-xs">{c.isEnrollment ? 'Adesão' : c.periodStart ? `${formatDate(c.periodStart)} a ${formatDate(c.periodEnd)}` : '-'}</td>
                                        <td className="num"><Money cents={c.amountCents} /></td>
                                        <td><Badge tone={statusTone(c.status)}>{LABELS.chargeStatus[c.status]}</Badge></td>
                                        <td className="whitespace-nowrap">{formatDateTime(c.paidAt) || '-'}</td>
                                        <td className="text-xs">
                                            {c.orders.map(o => (
                                                <div key={o.id}>
                                                    {can('orders.read') ? <Link href={`/admin/pedidos/${o.id}`} className="font-mono text-brand hover:underline">{o.code}</Link> : <span className="font-mono">{o.code}</span>}
                                                    {' '}<span className="text-ink-muted">{LABELS.orderStatus[o.status]}</span>
                                                    {o.payments.map(p => <span key={p.id} className="ml-1 text-ink-faint">· {LABELS.gateway[p.gateway as GatewayId] ?? p.gateway} {LABELS.paymentMethod[p.method]} ({LABELS.paymentStatus[p.status]})</span>)}
                                                </div>
                                            ))}
                                        </td>
                                        <td className="whitespace-nowrap text-right">
                                            {open && can('payments.manual') && <button className="btn btn-sm" onClick={() => setPaying(c)}>Registrar pagamento</button>}{' '}
                                            {open && can('memberships.charges') && <button className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => void cancelCharge(c)}>Cancelar</button>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </TableBox>
                )}
            </Card>

            <Card title="Entradas em eventos (últimas 50)">
                {m.entries.length === 0 ? <Empty>Nenhuma entrada registrada com a carteirinha.</Empty> : (
                    <TableBox>
                        <thead><tr><th>Evento</th><th>Data do evento</th><th>Entrada</th></tr></thead>
                        <tbody>
                            {m.entries.map((e, i) => (
                                <tr key={i}>
                                    <td>{e.event.title}</td>
                                    <td className="whitespace-nowrap">{formatDateTime(e.event.startsAt)}</td>
                                    <td className="whitespace-nowrap">{formatDateTime(e.at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </TableBox>
                )}
            </Card>

            <NewChargeModal open={newCharge} member={m} onClose={() => setNewCharge(false)} onDone={refresh} />
            <PayManualModal charge={paying} onClose={() => setPaying(null)} onDone={refresh} />
            <CancelModal open={canceling} memberId={m.id} onClose={() => setCanceling(false)} onDone={refresh} />
        </div>
    );
}

export default function MemberDetail({ id }: { id: number }) {
    return <RequirePerm perms={['members.read']}><MemberDetailInner id={id} /></RequirePerm>;
}
