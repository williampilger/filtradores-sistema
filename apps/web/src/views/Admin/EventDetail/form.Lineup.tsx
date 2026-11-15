'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Evento > Escalação (futsal): 5 titulares com posição em quadra, reservas, capitão, esquema tático, observações e publicação
 */
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { formatDateTime, LABELS, type PlayerPosition } from '@filt/shared';
import API from '@/api';
import { Badge, Card, Checkbox, Empty, Field, Input, Spinner, TextArea } from '@/components/ui';
import { TableBox, Thumb, useBusy, useData } from '@/components/admin/common';

const SLOTS = ['GOL', 'FIXO', 'ALA-D', 'ALA-E', 'PIVÔ'] as const;
const FORMATIONS = ['3-1', '2-2', '4-0', '1-2-1'];
const DEFAULT_SLOT: Record<PlayerPosition, string | null> = { GK: 'GOL', DF: 'FIXO', MF: 'ALA-D', FW: 'PIVÔ', STAFF: null };
const STARTERS = 5;

type Role = 'out' | 'starter' | 'reserve';
type Entry = { role: Role, slot: string | null };

export default function LineupTab({ eventId }: { eventId: number }) {
    const players = useData(() => API.admin.players.list(), []);
    const lineup = useData(() => API.admin.events.lineup(eventId), [eventId]);
    const [entries, setEntries] = useState<Record<number, Entry>>({});
    const [captain, setCaptain] = useState<number | null>(null);
    const [formation, setFormation] = useState('');
    const [notes, setNotes] = useState('');
    const [publish, setPublish] = useState(false);
    const { busy, run } = useBusy();

    useEffect(() => {
        const l = lineup.data;
        if (!l) return;
        setEntries(Object.fromEntries(l.entries.map(e => [e.playerId, { role: e.starter ? 'starter' : 'reserve', slot: e.slot }])));
        setCaptain(l.entries.find(e => e.isCaptain)?.playerId ?? null);
        setFormation(l.formation ?? ''); setNotes(l.notes ?? ''); setPublish(!!l.publishedAt);
    }, [lineup.data]);

    if ((players.loading && !players.data) || lineup.loading) return <Spinner />;
    const all = (players.data ?? []).filter(p => p.active || entries[p.id]);
    if (!all.length) return <Empty>Cadastre os atletas em Elenco antes de montar a escalação.</Empty>;

    const starters = Object.values(entries).filter(e => e.role === 'starter').length;
    const reserves = Object.values(entries).filter(e => e.role === 'reserve').length;
    const setRole = (id: number, pos: PlayerPosition, role: Role) => {
        if (role === 'out' && captain === id) setCaptain(null);
        setEntries(p => {
            const next = { ...p };
            if (role === 'out') delete next[id];
            else next[id] = { role, slot: p[id]?.slot ?? (role === 'starter' ? DEFAULT_SLOT[pos] : null) };
            return next;
        });
    };
    const setSlot = (id: number, slot: string) => setEntries(p => ({ ...p, [id]: { ...p[id], slot: slot || null } }));

    const save = async () => {
        if (starters !== STARTERS && publish && !window.confirm(`A escalação tem ${starters} titular(es) (o normal no futsal são ${STARTERS}). Publicar mesmo assim?`)) return;
        const slotOrder = (s: string | null) => { const i = SLOTS.indexOf(s as typeof SLOTS[number]); return i < 0 ? 99 : i; };
        const list = Object.entries(entries)
            .map(([id, e]) => ({ playerId: Number(id), starter: e.role === 'starter', slot: e.slot, isCaptain: captain === Number(id) }))
            .sort((a, b) => Number(b.starter) - Number(a.starter) || slotOrder(a.slot) - slotOrder(b.slot));
        const r = await run('save', () => API.admin.events.saveLineup(eventId, { formation: formation.trim() || null, notes: notes.trim() || null, publish, entries: list }));
        if (r.success) { toast.success(publish ? 'Escalação salva e publicada' : 'Escalação salva (não publicada)'); void lineup.reload(); }
    };

    return (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card title={`Atletas · ${starters}/${STARTERS} titulares · ${reserves} reservas`}>
                <TableBox>
                    <thead><tr><th className="num">Nº</th><th>Atleta</th><th>Posição</th><th>Convocação</th><th>Em quadra</th><th>Capitão</th></tr></thead>
                    <tbody>
                        {all.map(p => {
                            const e = entries[p.id];
                            const role: Role = e?.role ?? 'out';
                            return (
                                <tr key={p.id} className={role === 'out' ? 'opacity-60' : ''}>
                                    <td className="num">{p.number ?? '-'}</td>
                                    <td><div className="flex items-center gap-2"><Thumb url={p.photoUrl} size={28} round /><span className="font-medium">{p.nickname || p.name}</span>{!p.active && <Badge>Inativo</Badge>}</div></td>
                                    <td className="text-ink-muted">{LABELS.playerPosition[p.position]}</td>
                                    <td>
                                        <div className="inline-flex overflow-hidden rounded-md border border-line-strong text-xs">
                                            {([['out', 'Fora'], ['starter', 'Titular'], ['reserve', 'Reserva']] as const).map(([k, label]) => (
                                                <button key={k} type="button" onClick={() => setRole(p.id, p.position, k)}
                                                    className={`px-2 py-1 ${role === k ? (k === 'starter' ? 'bg-brand text-brand-ink' : k === 'reserve' ? 'bg-brand-soft text-brand' : 'bg-surface-alt font-semibold') : 'bg-surface hover:bg-surface-hover'}`}>{label}</button>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        {role !== 'out' && (
                                            <select className="inp !h-[28px] !w-28 text-xs" value={e?.slot ?? ''} onChange={ev => setSlot(p.id, ev.target.value)}>
                                                <option value="">-</option>
                                                {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                                                {e?.slot && !SLOTS.includes(e.slot as typeof SLOTS[number]) && <option value={e.slot}>{e.slot}</option>}
                                            </select>
                                        )}
                                    </td>
                                    <td>{role !== 'out' && <input type="radio" name="captain" className="h-4 w-4 accent-brand" checked={captain === p.id} onChange={() => setCaptain(p.id)} />}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </TableBox>
            </Card>
            <Card title="Esquema e publicação">
                <div className="space-y-3">
                    <Field label="Esquema tático (futsal)">
                        <Input value={formation} onChange={setFormation} list="futsal-formations" placeholder="Ex.: 3-1" maxLength={16} />
                        <datalist id="futsal-formations">{FORMATIONS.map(f => <option key={f} value={f} />)}</datalist>
                    </Field>
                    <div className="flex flex-wrap gap-1">{FORMATIONS.map(f => <button key={f} type="button" className={`btn btn-sm ${formation === f ? 'btn-primary' : ''}`} onClick={() => setFormation(f)}>{f}</button>)}</div>
                    <Field label="Observações"><TextArea value={notes} onChange={setNotes} rows={4} placeholder="Desfalques, suspensos, recados à torcida..." /></Field>
                    <Checkbox checked={publish} onChange={setPublish} label="Publicar (aparece na página do jogo e no app)" />
                    {lineup.data?.publishedAt && <p className="text-xs text-ink-muted">Publicada em {formatDateTime(lineup.data.publishedAt)}</p>}
                    <button className="btn btn-primary w-full" disabled={!!busy} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar escalação'}</button>
                    {captain === null && Object.keys(entries).length > 0 && <p className="text-xs text-warn">Nenhum capitão marcado.</p>}
                </div>
            </Card>
        </div>
    );
}
