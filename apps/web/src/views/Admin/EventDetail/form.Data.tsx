'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Evento: campos do formulário (usados no cadastro e na aba "Dados") + aba Dados (capa, salvar, excluir)
 */
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { LABELS, slugify } from '@filt/shared';
import API from '@/api';
import type { AdminEventDetail, EventInput } from '@/api/types';
import { Card, Checkbox, confirmAction, DateTimeInput, Field, FileButton, Input, Select, TextArea } from '@/components/ui';
import { optionsOf, orNull, toInt, useBusy, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';

export const EMPTY_EVENT: EventInput = {
    title: 'ACEF x ', slug: '', description: '', isMatch: true, opponent: '', competition: '', venue: 'Ginásio do Morangão', address: 'Bom Princípio - RS',
    startsAt: '', endsAt: null, gatesOpenAt: null, capacity: null, memberAccess: true, memberCapacity: null, status: 'DRAFT', eligiblePlanIds: [], homeScore: null, awayScore: null,
};

/** Converte o formulário no corpo da API (textos vazios -> null) */
export const eventBody = (f: EventInput): EventInput => ({
    ...f, title: f.title.trim(), slug: f.slug || slugify(f.title), description: orNull(f.description), opponent: orNull(f.opponent), competition: orNull(f.competition),
    venue: orNull(f.venue), address: orNull(f.address),
});

export function EventFields({ f, setF, slugAuto, disabled }: { f: EventInput, setF: (fn: (p: EventInput) => EventInput) => void, slugAuto: boolean, disabled?: boolean }) {
    const plans = useData(() => API.admin.plans.list(), []);
    const set = <K extends keyof EventInput>(k: K, v: EventInput[K]) => setF(p => ({ ...p, [k]: v }));
    return (
        <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-4">
            <Field label="Título *" className="sm:col-span-2">
                <Input value={f.title} onChange={v => setF(p => ({ ...p, title: v, slug: slugAuto ? slugify(v) : p.slug }))} />
            </Field>
            <Field label="Slug (endereço)"><Input value={f.slug} onChange={v => set('slug', v)} /></Field>
            <Field label="Situação"><Select value={f.status} onChange={v => set('status', v)} options={optionsOf(LABELS.eventStatus)} /></Field>

            <div className="flex items-end pb-2"><Checkbox checked={f.isMatch} onChange={v => set('isMatch', v)} label="É um jogo" /></div>
            {f.isMatch && <>
                <Field label="Adversário"><Input value={f.opponent} onChange={v => set('opponent', v)} /></Field>
                <Field label="Competição"><Input value={f.competition} onChange={v => set('competition', v)} placeholder="Gauchão de Futsal - Série A" /></Field>
                <div className="grid grid-cols-2 gap-2">
                    <Field label="Placar ACEF"><Input type="number" min={0} value={f.homeScore ?? ''} onChange={v => set('homeScore', toInt(v))} /></Field>
                    <Field label="Adversário"><Input type="number" min={0} value={f.awayScore ?? ''} onChange={v => set('awayScore', toInt(v))} /></Field>
                </div>
            </>}
            {!f.isMatch && <div className="sm:col-span-3" />}

            <Field label="Início *"><DateTimeInput value={f.startsAt || null} onChange={v => set('startsAt', v ?? '')} /></Field>
            <Field label="Abertura dos portões"><DateTimeInput value={f.gatesOpenAt} onChange={v => set('gatesOpenAt', v)} /></Field>
            <Field label="Término"><DateTimeInput value={f.endsAt} onChange={v => set('endsAt', v)} /></Field>
            <Field label="Capacidade total" hint="Vazio = sem limite"><Input type="number" min={1} value={f.capacity ?? ''} onChange={v => set('capacity', toInt(v))} /></Field>

            <Field label="Local" className="sm:col-span-2"><Input value={f.venue} onChange={v => set('venue', v)} /></Field>
            <Field label="Endereço" className="sm:col-span-2"><Input value={f.address} onChange={v => set('address', v)} /></Field>

            <div className="rounded-lg border border-line p-3 sm:col-span-4">
                <div className="mb-2 flex flex-wrap items-center gap-4">
                    <Checkbox checked={f.memberAccess} onChange={v => set('memberAccess', v)} label="Sócios têm acesso (conforme o plano)" />
                    {f.memberAccess && (
                        <label className="flex items-center gap-2 text-sm">Vagas para sócios
                            <input type="number" min={0} className="inp !w-28" value={f.memberCapacity ?? ''} placeholder="sem limite" onChange={e => set('memberCapacity', toInt(e.target.value))} />
                        </label>
                    )}
                </div>
                {f.memberAccess && (
                    <>
                        <span className="lbl">Planos com acesso (nenhum marcado = todos os planos com acesso a eventos)</span>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {(plans.data ?? []).map(p => (
                                <Checkbox key={p.id} checked={f.eligiblePlanIds.includes(p.id)}
                                    onChange={v => set('eligiblePlanIds', v ? [...f.eligiblePlanIds, p.id] : f.eligiblePlanIds.filter(x => x !== p.id))}
                                    label={<span>{p.name} <span className="text-xs text-ink-faint">({LABELS.memberEventAccess[p.eventAccess]})</span></span>} />
                            ))}
                        </div>
                    </>
                )}
            </div>

            <Field label="Descrição" className="sm:col-span-4"><TextArea value={f.description} onChange={v => set('description', v)} rows={4} /></Field>
        </fieldset>
    );
}

export default function DataTab({ ev, onSaved }: { ev: AdminEventDetail, onSaved: () => void }) {
    const { can } = useSession();
    const router = useRouter();
    const canWrite = can('events.write');
    const toForm = (e: AdminEventDetail): EventInput => ({
        title: e.title, slug: e.slug, description: e.description ?? '', isMatch: e.isMatch, opponent: e.opponent ?? '', competition: e.competition ?? '', venue: e.venue ?? '',
        address: e.address ?? '', startsAt: e.startsAt, endsAt: e.endsAt ?? null, gatesOpenAt: e.gatesOpenAt ?? null, capacity: e.capacity ?? null, memberAccess: e.memberAccess,
        memberCapacity: e.memberCapacity ?? null, status: e.status, eligiblePlanIds: e.eligiblePlanIds, homeScore: e.homeScore ?? null, awayScore: e.awayScore ?? null,
    });
    const [f, setF] = useState<EventInput>(() => toForm(ev));
    const [cover, setCover] = useState(ev.coverUrl);
    const { busy, run } = useBusy();
    useEffect(() => { setF(toForm(ev)); setCover(ev.coverUrl); }, [ev]);

    const save = async () => {
        const r = await run('save', () => API.admin.events.update(ev.id, eventBody(f)));
        if (r.success) { toast.success('Evento salvo'); onSaved(); }
    };
    const upload = async (file: File) => {
        const r = await run('cover', () => API.admin.events.uploadCover(ev.id, file));
        if (r.success) { setCover(r.data.coverUrl); toast.success('Capa atualizada'); }
    };
    const remove = async () => {
        if (!confirmAction(`Excluir o evento "${ev.title}"? Eventos com ingressos emitidos não podem ser excluídos (altere a situação para Cancelado).`)) return;
        const r = await run('del', () => API.admin.events.remove(ev.id));
        if (r.success) { toast.success('Evento excluído'); router.push('/admin/eventos'); }
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <Card title="Dados do evento" actions={canWrite && <button className="btn btn-primary btn-sm" disabled={!!busy || !f.startsAt} onClick={() => void save()}>{busy === 'save' ? 'Salvando...' : 'Salvar'}</button>}>
                <EventFields f={f} setF={setF} slugAuto={false} disabled={!canWrite} />
            </Card>
            <div className="space-y-4">
                <Card title="Capa">
                    {cover ? <img src={cover} alt="Capa do evento" className="mb-3 aspect-video w-full rounded-lg border border-line object-cover" /> : <div className="mb-3 flex aspect-video items-center justify-center rounded-lg border border-dashed border-line text-sm text-ink-faint">Sem capa</div>}
                    {canWrite && <FileButton label={busy === 'cover' ? 'Enviando...' : 'Enviar imagem'} disabled={!!busy} onFile={f => void upload(f)} />}
                </Card>
                {canWrite && (
                    <Card title="Zona de perigo">
                        <button className="btn btn-danger w-full" disabled={!!busy} onClick={() => void remove()}>Excluir evento</button>
                    </Card>
                )}
            </div>
        </div>
    );
}
