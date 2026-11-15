'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Planos de sócio: lista e cadastro (preços, periodicidade, acesso a eventos, descontos, benefícios)
 */
import { useState } from 'react';
import { toast } from 'react-toastify';
import { LABELS, slugify, type PlanDTO } from '@filt/shared';
import API from '@/api';
import type { PlanInput } from '@/api/types';
import { Badge, Checkbox, confirmAction, Empty, Field, Input, Modal, Money, MoneyInput, PageHeader, Select, Spinner, TextArea } from '@/components/ui';
import { optionsOf, RequirePerm, TableBox, toInt, useBusy, useData } from '@/components/admin/common';

type PlanRow = PlanDTO & { activeMembers: number };

const EMPTY: PlanInput = {
    name: '', slug: '', description: '', tierLevel: 1, priceCents: 0, period: 'MONTHLY', enrollmentFeeCents: 0, storeDiscountPct: 0, ticketDiscountPct: 0,
    eventAccess: 'AUTOMATIC', benefits: [], color: '', active: true, sortOrder: 0,
};

function PlanModal({ plan, onClose, onSaved }: { plan: PlanRow | 'new' | null, onClose: () => void, onSaved: () => void }) {
    const [f, setF] = useState<PlanInput>(EMPTY);
    const [benefits, setBenefits] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [loadedFor, setLoadedFor] = useState<PlanRow | 'new' | null>(null);
    const { busy, run } = useBusy();

    if (plan !== loadedFor) {
        setLoadedFor(plan);
        if (plan && plan !== 'new') {
            const { id: _id, activeMembers: _am, ...rest } = plan;
            setF({ ...rest, color: rest.color ?? '' });
            setBenefits(plan.benefits.join('\n'));
            setSlugTouched(true);
        } else { setF(EMPTY); setBenefits(''); setSlugTouched(false); }
    }

    const set = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => setF(p => ({ ...p, [k]: v }));
    const save = async () => {
        const body: PlanInput = {
            ...f, name: f.name.trim(), slug: f.slug || slugify(f.name), description: f.description?.trim() || null, color: f.color?.trim() || null,
            benefits: benefits.split('\n').map(s => s.trim()).filter(Boolean),
        };
        const r = await run('save', () => plan && plan !== 'new' ? API.admin.plans.update(plan.id, body) : API.admin.plans.create(body));
        if (r.success) { toast.success('Plano salvo'); onSaved(); onClose(); }
    };

    return (
        <Modal wide open={!!plan} title={plan === 'new' ? 'Novo plano' : `Editar plano: ${plan?.name ?? ''}`} onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!!busy || f.name.trim().length < 2} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar'}</button></>}>
            <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Nome *" className="sm:col-span-2">
                    <Input value={f.name} onChange={v => setF(p => ({ ...p, name: v, slug: slugTouched ? p.slug : slugify(v) }))} />
                </Field>
                <Field label="Slug (endereço)" className="sm:col-span-2"><Input value={f.slug} onChange={v => { setSlugTouched(true); set('slug', v); }} /></Field>
                <Field label="Preço *"><MoneyInput cents={f.priceCents} onChange={v => set('priceCents', v ?? 0)} /></Field>
                <Field label="Periodicidade"><Select value={f.period} onChange={v => set('period', v)} options={optionsOf(LABELS.billingPeriod)} /></Field>
                <Field label="Taxa de adesão"><MoneyInput cents={f.enrollmentFeeCents} onChange={v => set('enrollmentFeeCents', v ?? 0)} /></Field>
                <Field label="Nível (tier)" hint="Maior = plano superior"><Input type="number" min={1} max={99} value={f.tierLevel} onChange={v => set('tierLevel', toInt(v) ?? 1)} /></Field>
                <Field label="Acesso a eventos" className="sm:col-span-2"
                    hint={f.eventAccess === 'AUTOMATIC' ? 'Entra apresentando a carteirinha (QR) na portaria.' : f.eventAccess === 'CLAIM' ? 'O sócio resgata o ingresso no app/site antes do jogo.' : 'Sem acesso gratuito; pode ter desconto nos ingressos.'}>
                    <Select value={f.eventAccess} onChange={v => set('eventAccess', v)} options={optionsOf(LABELS.memberEventAccess)} />
                </Field>
                <Field label="Desconto na loja (%)"><Input type="number" min={0} max={100} value={f.storeDiscountPct} onChange={v => set('storeDiscountPct', toInt(v) ?? 0)} /></Field>
                <Field label="Desconto em ingressos (%)"><Input type="number" min={0} max={100} value={f.ticketDiscountPct} onChange={v => set('ticketDiscountPct', toInt(v) ?? 0)} /></Field>
                <Field label="Descrição" className="sm:col-span-4"><TextArea value={f.description} onChange={v => set('description', v)} rows={2} /></Field>
                <Field label="Benefícios (um por linha)" className="sm:col-span-4"><TextArea value={benefits} onChange={setBenefits} rows={4} placeholder={'Entrada em todos os jogos em casa\n10% de desconto na loja'} /></Field>
                <Field label="Cor do cartão" hint="Dado do plano (carteirinha), formato #RRGGBB">
                    <div className="flex gap-2">
                        <input type="color" className="inp !w-12 !p-1" value={/^#[0-9a-fA-F]{6}$/.test(f.color ?? '') ? f.color! : '#000000'} onChange={e => set('color', e.target.value)} />
                        <Input value={f.color} onChange={v => set('color', v)} placeholder="(padrão)" />
                    </div>
                </Field>
                <Field label="Ordem"><Input type="number" value={f.sortOrder} onChange={v => set('sortOrder', toInt(v) ?? 0)} /></Field>
                <div className="flex items-end pb-2 sm:col-span-2"><Checkbox checked={f.active} onChange={v => set('active', v)} label="Ativo (disponível para adesão)" /></div>
            </div>
        </Modal>
    );
}

function PlansInner() {
    const { data, loading, reload } = useData(() => API.admin.plans.list(), []);
    const [editing, setEditing] = useState<PlanRow | 'new' | null>(null);
    const { busy, run } = useBusy();

    const remove = async (p: PlanRow) => {
        if (!confirmAction(`Excluir o plano "${p.name}"? Ele deixa de aparecer para novas adesões; os sócios atuais continuam no plano.`)) return;
        const r = await run(`del${p.id}`, () => API.admin.plans.remove(p.id));
        if (r.success) { toast.success('Plano excluído'); void reload(); }
    };

    return (
        <div>
            <PageHeader title="Planos de sócio" actions={<button className="btn btn-primary" onClick={() => setEditing('new')}>+ Novo plano</button>} />
            {loading && !data ? <Spinner /> : !data?.length ? <Empty>Nenhum plano cadastrado.</Empty> : (
                <TableBox>
                    <thead><tr><th>Plano</th><th className="num">Nível</th><th className="num">Preço</th><th>Período</th><th className="num">Adesão</th><th>Eventos</th><th className="num">Descontos</th><th className="num">Sócios ativos</th><th>Situação</th><th /></tr></thead>
                    <tbody>
                        {data.map(p => (
                            <tr key={p.id}>
                                <td>
                                    <div className="flex items-center gap-2">
                                        {/* cor do plano é dado (não token de UI) */}
                                        <span className="inline-block h-3 w-3 rounded-full border border-line" style={p.color ? { background: p.color } : undefined} />
                                        <span className="font-medium">{p.name}</span>
                                    </div>
                                </td>
                                <td className="num">{p.tierLevel}</td>
                                <td className="num"><Money cents={p.priceCents} /></td>
                                <td>{LABELS.billingPeriod[p.period]}</td>
                                <td className="num"><Money cents={p.enrollmentFeeCents} /></td>
                                <td>{LABELS.memberEventAccess[p.eventAccess]}</td>
                                <td className="num text-xs">loja {p.storeDiscountPct}% · ingr. {p.ticketDiscountPct}%</td>
                                <td className="num">{p.activeMembers}</td>
                                <td>{p.active ? <Badge tone="ok">Ativo</Badge> : <Badge>Inativo</Badge>}</td>
                                <td className="whitespace-nowrap text-right">
                                    <button className="btn btn-sm" onClick={() => setEditing(p)}>Editar</button>{' '}
                                    <button className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => void remove(p)}>Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableBox>
            )}
            <PlanModal plan={editing} onClose={() => setEditing(null)} onSaved={() => void reload()} />
        </div>
    );
}

export default function Plans() {
    return <RequirePerm perms={['plans.manage']}><PlansInner /></RequirePerm>;
}
