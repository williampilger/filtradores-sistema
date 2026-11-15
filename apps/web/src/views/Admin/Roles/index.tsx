'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Papéis: lista e editor (matriz de permissões do catálogo, exigência de 2FA)
 */
import { useState } from 'react';
import { toast } from 'react-toastify';
import { PERMISSIONS } from '@filt/shared';
import API from '@/api';
import type { RoleInput, RoleRow } from '@/api/types';
import { Badge, Checkbox, confirmAction, Empty, Field, Input, Modal, PageHeader, Spinner, TextArea } from '@/components/ui';
import { RequirePerm, TableBox, useBusy, useData } from '@/components/admin/common';
import { PermissionMatrix } from '@/components/admin/PermissionMatrix';

const EMPTY: RoleInput = { name: '', description: '', require2fa: false, permissions: [] };

function RoleModal({ role, onClose, onSaved }: { role: RoleRow | 'new' | null, onClose: () => void, onSaved: () => void }) {
    const [f, setF] = useState<RoleInput>(EMPTY);
    const [loadedFor, setLoadedFor] = useState<RoleRow | 'new' | null>(null);
    const { busy, run } = useBusy();

    // carrega o formulário quando abre (sem efeito: compara com o último papel carregado)
    if (role !== loadedFor) {
        setLoadedFor(role);
        setF(role && role !== 'new' ? { name: role.name, description: role.description ?? '', require2fa: role.require2fa, permissions: role.permissions } : EMPTY);
    }

    const save = async () => {
        const body = { ...f, name: f.name.trim(), description: f.description?.trim() || null };
        const r = role && role !== 'new' ? await run('save', () => API.admin.roles.update(role.id, body)) : await run('save', () => API.admin.roles.create(body));
        if (r.success) { toast.success('Papel salvo'); onSaved(); onClose(); }
    };

    return (
        <Modal wide open={!!role} title={role === 'new' ? 'Novo papel' : `Editar papel: ${role?.name ?? ''}`} onClose={onClose}
            footer={<>
                <button className="btn" onClick={onClose}>Cancelar</button>
                <button className="btn btn-primary" disabled={!!busy || f.name.trim().length < 2} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar'}</button>
            </>}>
            <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nome *"><Input value={f.name} onChange={v => setF({ ...f, name: v })} /></Field>
                    <div className="flex items-end pb-2">
                        <Checkbox checked={f.require2fa} onChange={v => setF({ ...f, require2fa: v })} label="Exigir 2FA (autenticação em dois fatores)" />
                    </div>
                </div>
                <Field label="Descrição"><TextArea value={f.description} onChange={v => setF({ ...f, description: v })} rows={2} /></Field>
                <div className="flex items-center justify-between">
                    <span className="lbl">Permissões ({f.permissions.length} de {PERMISSIONS.length})</span>
                </div>
                <PermissionMatrix value={f.permissions} onChange={p => setF({ ...f, permissions: p })} />
            </div>
        </Modal>
    );
}

function RolesInner() {
    const { data, loading, reload } = useData(() => API.admin.roles.list(), []);
    const [editing, setEditing] = useState<RoleRow | 'new' | null>(null);
    const { busy, run } = useBusy();

    const remove = async (r: RoleRow) => {
        if (!confirmAction(`Excluir o papel "${r.name}"?`)) return;
        const res = await run(`del${r.id}`, () => API.admin.roles.remove(r.id));
        if (res.success) { toast.success('Papel excluído'); void reload(); }
    };

    return (
        <div>
            <PageHeader title="Papéis e permissões" subtitle="Cada papel reúne permissões do catálogo. Um usuário pode ter vários papéis; exceções individuais ficam no cadastro do usuário."
                actions={<button className="btn btn-primary" onClick={() => setEditing('new')}>+ Novo papel</button>} />
            {loading && !data ? <Spinner /> : !data?.length ? <Empty>Nenhum papel cadastrado.</Empty> : (
                <TableBox>
                    <thead><tr><th>Papel</th><th>Descrição</th><th className="num">Permissões</th><th className="num">Usuários</th><th>2FA</th><th /></tr></thead>
                    <tbody>
                        {data.map(r => (
                            <tr key={r.id}>
                                <td className="font-medium">{r.name}{r.key && <span className="ml-1 font-mono text-xs text-ink-faint">{r.key}</span>}</td>
                                <td className="text-ink-muted">{r.description}</td>
                                <td className="num">{r.permissions.length}</td>
                                <td className="num">{r.users}</td>
                                <td>{r.require2fa ? <Badge tone="warn">Obrigatório</Badge> : <span className="text-ink-faint">-</span>}</td>
                                <td className="whitespace-nowrap text-right">
                                    <button className="btn btn-sm" onClick={() => setEditing(r)}>Editar</button>{' '}
                                    <button className="btn btn-danger btn-sm" disabled={!!busy || r.users > 0} title={r.users > 0 ? 'Remova o papel dos usuários antes de excluir' : ''} onClick={() => void remove(r)}>Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </TableBox>
            )}
            <RoleModal role={editing} onClose={() => setEditing(null)} onSaved={() => void reload()} />
        </div>
    );
}

export default function Roles() {
    return <RequirePerm perms={['roles.manage']}><RolesInner /></RequirePerm>;
}
