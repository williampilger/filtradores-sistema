'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Elenco (futsal): atletas e comissão técnica, com foto
 */
import { useState } from 'react';
import { toast } from 'react-toastify';
import { LABELS, PLAYER_POSITIONS, type PlayerDTO, type PlayerPosition } from '@filt/shared';
import API from '@/api';
import type { PlayerInput } from '@/api/types';
import { Badge, Checkbox, confirmAction, Empty, Field, FileButton, Input, Modal, PageHeader, Select, Spinner, TextArea } from '@/components/ui';
import { dateInputToIso, optionsOf, orNull, RequirePerm, Thumb, toInt, useBusy, useData } from '@/components/admin/common';

const EMPTY: PlayerInput = { name: '', nickname: '', number: null, position: 'MF', birthDate: null, bio: '', active: true };

function PlayerModal({ player, onClose, onSaved }: { player: PlayerDTO | 'new' | null, onClose: () => void, onSaved: () => void }) {
    const [f, setF] = useState<PlayerInput>(EMPTY);
    const [birth, setBirth] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    /** id do cadastro (existente ou recém-criado nesta janela, para permitir enviar a foto em seguida) */
    const [savedId, setSavedId] = useState<number | null>(null);
    const [loadedFor, setLoadedFor] = useState<PlayerDTO | 'new' | null>(null);
    const { busy, run } = useBusy();
    const existing = player && player !== 'new' ? player : null;

    if (player !== loadedFor) {
        setLoadedFor(player);
        setF(existing ? { name: existing.name, nickname: existing.nickname ?? '', number: existing.number, position: existing.position, bio: existing.bio ?? '', active: existing.active } : EMPTY);
        setBirth(''); setPhoto(existing?.photoUrl ?? null); setSavedId(existing?.id ?? null);
    }
    const set = <K extends keyof PlayerInput>(k: K, v: PlayerInput[K]) => setF(p => ({ ...p, [k]: v }));

    const save = async () => {
        // data de nascimento só é enviada se preenchida (a API não a devolve; enviar vazio apagaria o valor salvo)
        const body: PlayerInput = { ...f, name: f.name.trim(), nickname: orNull(f.nickname), bio: orNull(f.bio) };
        if (birth) body.birthDate = dateInputToIso(birth);
        const r = savedId ? await run('s', () => API.admin.players.update(savedId, body)) : await run('s', () => API.admin.players.create(body));
        if (!r.success) return;
        toast.success('Cadastro salvo');
        onSaved();
        if (savedId) onClose();
        else { setSavedId(r.data.id); toast.info('Agora você pode enviar a foto.'); }
    };
    const upload = async (file: File) => {
        if (!savedId) return;
        const r = await run('img', () => API.admin.players.uploadPhoto(savedId, file));
        if (r.success) { setPhoto(r.data.photoUrl); toast.success('Foto atualizada'); onSaved(); }
    };

    return (
        <Modal open={!!player} title={existing ? `Editar: ${existing.nickname || existing.name}` : 'Novo atleta / membro da comissão'} onClose={onClose}
            footer={<><button className="btn" onClick={onClose}>Fechar</button><button className="btn btn-primary" disabled={!!busy || f.name.trim().length < 2} onClick={() => void save()}>{busy === 's' ? 'Salvando...' : 'Salvar'}</button></>}>
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex items-center gap-3">
                    <Thumb url={photo} size={72} round />
                    {savedId ? <FileButton label={busy === 'img' ? 'Enviando...' : 'Enviar foto'} disabled={!!busy} onFile={file => void upload(file)} /> : <span className="text-xs text-ink-muted">Salve o cadastro para enviar a foto.</span>}
                </div>
                <Field label="Nome completo *" className="col-span-2"><Input value={f.name} onChange={v => set('name', v)} /></Field>
                <Field label="Apelido (nome na camisa)"><Input value={f.nickname} onChange={v => set('nickname', v)} /></Field>
                <Field label="Número"><Input type="number" min={0} max={99} value={f.number ?? ''} onChange={v => set('number', toInt(v))} /></Field>
                <Field label="Posição"><Select<PlayerPosition> value={f.position} onChange={v => set('position', v)} options={optionsOf(LABELS.playerPosition)} /></Field>
                <Field label="Nascimento" hint={existing ? 'Preencha só para alterar' : undefined}><input type="date" className="inp" value={birth} onChange={e => setBirth(e.target.value)} /></Field>
                <Field label="Biografia" className="col-span-2"><TextArea value={f.bio} onChange={v => set('bio', v)} rows={3} /></Field>
                <div className="col-span-2"><Checkbox checked={f.active} onChange={v => set('active', v)} label="Ativo no elenco" /></div>
            </div>
        </Modal>
    );
}

function SquadInner() {
    const { data, loading, reload } = useData(() => API.admin.players.list(), []);
    const [editing, setEditing] = useState<PlayerDTO | 'new' | null>(null);
    const { busy, run } = useBusy();

    const remove = async (p: PlayerDTO) => {
        if (!confirmAction(`Remover ${p.nickname || p.name}? Se já constar em escalações, apenas será desativado.`)) return;
        const r = await run(`d${p.id}`, () => API.admin.players.remove(p.id));
        if (r.success) { toast.success('Removido'); void reload(); }
    };

    return (
        <div>
            <PageHeader title="Elenco" subtitle="Futsal: goleiros, fixos, alas, pivôs e comissão técnica" actions={<button className="btn btn-primary" onClick={() => setEditing('new')}>+ Novo</button>} />
            {loading && !data ? <Spinner /> : !data?.length ? <Empty>Nenhum atleta cadastrado.</Empty> : (
                <div className="space-y-5">
                    {PLAYER_POSITIONS.map(pos => {
                        const list = data.filter(p => p.position === pos);
                        if (!list.length) return null;
                        return (
                            <section key={pos}>
                                <h2 className="display mb-2 text-lg text-brand-deep">{LABELS.playerPosition[pos]}{pos !== 'STAFF' ? 's' : ''}</h2>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {list.map(p => (
                                        <div key={p.id} className={`panel flex items-center gap-3 p-3 ${p.active ? '' : 'opacity-60'}`}>
                                            <Thumb url={p.photoUrl} size={56} round />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    {p.number != null && <span className="display text-xl text-brand">{p.number}</span>}
                                                    <span className="truncate font-semibold">{p.nickname || p.name}</span>
                                                </div>
                                                {p.nickname && <div className="truncate text-xs text-ink-muted">{p.name}</div>}
                                                {!p.active && <Badge>Inativo</Badge>}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <button className="btn btn-sm" onClick={() => setEditing(p)}>Editar</button>
                                                <button className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => void remove(p)}>Remover</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
            <PlayerModal player={editing} onClose={() => setEditing(null)} onSaved={() => void reload()} />
        </div>
    );
}

export default function Squad() {
    return <RequirePerm perms={['squad.write']}><SquadInner /></RequirePerm>;
}
