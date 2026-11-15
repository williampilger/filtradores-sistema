'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Feed: publicações (texto, imagens, visibilidade por sócio/nível, fixar, vínculo com evento)
 */
import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatDateTime, LABELS, type PostDTO, type PostVisibility } from '@filt/shared';
import API from '@/api';
import type { PostInput } from '@/api/types';
import { Badge, Checkbox, confirmAction, Empty, Field, FileButton, Input, Modal, PageHeader, Select, Spinner, TextArea } from '@/components/ui';
import { optionsOf, RequirePerm, toInt, useBusy, useClientPage, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';

type PostRow = PostDTO & { imageKeys: string[], published: boolean };
type Img = { key: string, url: string };
const EMPTY: PostInput = { title: '', body: '', visibility: 'PUBLIC', minTierLevel: null, pinned: false, published: true, eventId: null, imageKeys: [] };

function PostModal({ post, onClose, onSaved }: { post: PostRow | 'new' | null, onClose: () => void, onSaved: () => void }) {
    const { can } = useSession();
    const [f, setF] = useState<PostInput>(EMPTY);
    const [images, setImages] = useState<Img[]>([]);
    const [loadedFor, setLoadedFor] = useState<PostRow | 'new' | null>(null);
    const { busy, run } = useBusy();
    const canEvents = can('events.read', 'events.write', 'lineups.write');
    const events = useData(async () => {
        const [a, b] = await Promise.all([API.admin.events.list(false), API.admin.events.list(true)]);
        return { success: a.success && b.success, data: [...(a.data ?? []), ...(b.data ?? []).slice(0, 30)] };
    }, [], !!post && canEvents);

    if (post !== loadedFor) {
        setLoadedFor(post);
        if (post && post !== 'new') {
            setF({ title: post.title, body: post.body, visibility: post.visibility, minTierLevel: post.minTierLevel, pinned: post.pinned, published: post.published, eventId: post.event?.id ?? null, imageKeys: post.imageKeys });
            setImages(post.imageKeys.map((key, i) => ({ key, url: post.imageUrls[i] ?? '' })));
        } else { setF(EMPTY); setImages([]); }
    }
    const set = <K extends keyof PostInput>(k: K, v: PostInput[K]) => setF(p => ({ ...p, [k]: v }));

    const upload = async (file: File) => {
        const r = await run('img', () => API.admin.upload('posts', file));
        if (r.success) setImages(x => [...x, r.data]);
    };
    const save = async () => {
        const body: PostInput = { ...f, title: f.title.trim(), minTierLevel: f.visibility === 'MIN_TIER' ? (f.minTierLevel ?? 1) : null, imageKeys: images.map(i => i.key) };
        const r = post && post !== 'new' ? await run('s', () => API.admin.posts.update(post.id, body)) : await run('s', () => API.admin.posts.create(body));
        if (r.success) { toast.success(f.published ? 'Publicação salva' : 'Rascunho salvo'); onSaved(); onClose(); }
    };

    return (
        <Modal wide open={!!post} title={post === 'new' ? 'Nova publicação' : 'Editar publicação'} onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={!!busy || f.title.trim().length < 2} onClick={() => void save()}>{busy === 's' ? 'Salvando...' : 'Salvar'}</button></>}>
            <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Título *" className="sm:col-span-3"><Input value={f.title} onChange={v => set('title', v)} /></Field>
                <Field label="Texto" className="sm:col-span-3"><TextArea value={f.body} onChange={v => set('body', v)} rows={8} /></Field>
                <Field label="Visibilidade"><Select<PostVisibility> value={f.visibility} onChange={v => set('visibility', v)} options={optionsOf(LABELS.postVisibility)} /></Field>
                {f.visibility === 'MIN_TIER'
                    ? <Field label="Nível mínimo do plano" hint="Planos com nível (tier) igual ou maior"><Input type="number" min={1} value={f.minTierLevel ?? 1} onChange={v => set('minTierLevel', toInt(v))} /></Field>
                    : <div />}
                {canEvents
                    ? <Field label="Evento relacionado"><Select<number | ''> value={f.eventId ?? ''} onChange={v => set('eventId', v === '' ? null : v)} options={[{ value: '', label: 'Nenhum' }, ...(events.data ?? []).map(e => ({ value: e.id, label: `${e.title} (${formatDateTime(e.startsAt).slice(0, 10)})` }))]} /></Field>
                    : <div />}
                <div className="flex flex-wrap gap-4 sm:col-span-3">
                    <Checkbox checked={f.published} onChange={v => set('published', v)} label="Publicado (visível no site/app)" />
                    <Checkbox checked={f.pinned} onChange={v => set('pinned', v)} label="Fixar no topo" />
                </div>
                <div className="sm:col-span-3">
                    <div className="mb-1 flex items-center justify-between">
                        <span className="lbl">Imagens ({images.length}/10)</span>
                        <FileButton label={busy === 'img' ? 'Enviando...' : '+ Imagem'} disabled={!!busy || images.length >= 10} onFile={file => void upload(file)} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {images.map((img, i) => (
                            <div key={img.key} className="relative">
                                <img src={img.url} alt="" className="h-24 w-24 rounded-md border border-line object-cover" />
                                <button className="btn btn-sm absolute right-1 top-1 !h-6 !px-1.5" onClick={() => setImages(x => x.filter((_, j) => j !== i))} aria-label="Remover">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}

function FeedInner() {
    const { data, loading, reload } = useData(() => API.admin.posts.list(), []);
    const [editing, setEditing] = useState<PostRow | 'new' | null>(null);
    const { busy, run } = useBusy();
    const pg = useClientPage(data, 20);

    const remove = async (p: PostRow) => {
        if (!confirmAction(`Excluir a publicação "${p.title}"?`)) return;
        const r = await run(`d${p.id}`, () => API.admin.posts.remove(p.id));
        if (r.success) { toast.success('Publicação excluída'); void reload(); }
    };
    const toggle = async (p: PostRow, k: 'pinned' | 'published') => {
        const r = await run(`t${p.id}`, () => API.admin.posts.update(p.id, { [k]: !p[k] }));
        if (r.success) { toast.success('Atualizado'); void reload(); }
    };

    return (
        <div>
            <PageHeader title="Feed" subtitle="Notícias e recados para a torcida e os sócios" actions={<button className="btn btn-primary" onClick={() => setEditing('new')}>+ Nova publicação</button>} />
            {loading && !data ? <Spinner /> : !data?.length ? <Empty>Nenhuma publicação.</Empty> : (
                <div className="space-y-3">
                    {pg.rows.map(p => (
                        <div key={p.id} className="panel flex flex-col gap-3 p-3 sm:flex-row">
                            {p.imageUrls[0] && <img src={p.imageUrls[0]} alt="" className="h-24 w-full shrink-0 rounded-md object-cover sm:w-36" />}
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-semibold">{p.title}</span>
                                    {p.pinned && <Badge tone="brand">Fixado</Badge>}
                                    {p.published ? <Badge tone="ok">Publicado</Badge> : <Badge tone="warn">Rascunho</Badge>}
                                    <Badge tone={p.visibility === 'PUBLIC' ? 'default' : 'info'}>{LABELS.postVisibility[p.visibility]}{p.visibility === 'MIN_TIER' ? ` ≥ ${p.minTierLevel}` : ''}</Badge>
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{p.body}</p>
                                <div className="mt-1 text-xs text-ink-faint">{p.author}{p.publishedAt ? ` · ${formatDateTime(p.publishedAt)}` : ''}{p.event ? ` · ${p.event.title}` : ''}{p.imageUrls.length > 1 ? ` · ${p.imageUrls.length} imagens` : ''}</div>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-start gap-1">
                                <button className="btn btn-sm" onClick={() => setEditing(p)}>Editar</button>
                                <button className="btn btn-sm" disabled={!!busy} onClick={() => void toggle(p, 'pinned')}>{p.pinned ? 'Desafixar' : 'Fixar'}</button>
                                <button className="btn btn-sm" disabled={!!busy} onClick={() => void toggle(p, 'published')}>{p.published ? 'Despublicar' : 'Publicar'}</button>
                                <button className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => void remove(p)}>Excluir</button>
                            </div>
                        </div>
                    ))}
                    {pg.pager}
                </div>
            )}
            <PostModal post={editing} onClose={() => setEditing(null)} onSaved={() => void reload()} />
        </div>
    );
}

export default function Feed() {
    return <RequirePerm perms={['feed.write']}><FeedInner /></RequirePerm>;
}
