'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Usuários: busca, filtro de equipe, paginação e cadastro (convite)
 */
import Link from 'next/link';
import { useState } from 'react';
import { formatCpf, formatDateTime } from '@filt/shared';
import API from '@/api';
import { Badge, Checkbox, Empty, Input, PageHeader, Pagination, Select, Spinner, statusTone } from '@/components/ui';
import { FilterBar, RequirePerm, TableBox, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';
import CreateUserModal from './form.CreateUser';

function UsersInner() {
    const { can } = useSession();
    const [q, setQ] = useState('');
    const [search, setSearch] = useState('');
    const [staff, setStaff] = useState(false);
    const [roleId, setRoleId] = useState<number | ''>('');
    const [page, setPage] = useState(1);
    const [creating, setCreating] = useState(false);

    const roles = useData(() => API.admin.roles.list(), [], can('roles.manage', 'users.read'));
    const { data, loading, reload } = useData(
        () => API.admin.users.list({ q: search || undefined, staff: staff ? 1 : undefined, roleId: roleId || undefined, page }),
        [search, staff, roleId, page],
    );

    return (
        <div>
            <PageHeader title="Usuários" subtitle="Contas de torcedores, sócios e equipe"
                actions={can('users.write') && <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Novo usuário</button>} />

            <FilterBar>
                <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}>
                    <Input value={q} onChange={setQ} placeholder="Nome, e-mail ou CPF" className="!w-64" />
                    <button className="btn">Buscar</button>
                </form>
                {roles.data && (
                    <Select<number | ''> value={roleId} className="!w-52"
                        options={[{ value: '', label: 'Todos os papéis' }, ...roles.data.map(r => ({ value: r.id, label: r.name }))]}
                        onChange={v => { setPage(1); setRoleId(v); }} />
                )}
                <div className="flex h-[34px] items-center">
                    <Checkbox checked={staff} onChange={v => { setPage(1); setStaff(v); }} label="Somente equipe" />
                </div>
            </FilterBar>

            {loading && !data ? <Spinner /> : !data?.rows.length ? <Empty>Nenhum usuário encontrado.</Empty> : (
                <>
                    <TableBox>
                        <thead><tr><th>Nome</th><th>E-mail</th><th>CPF</th><th>Papéis</th><th>Sócio</th><th>Situação</th><th>Último acesso</th></tr></thead>
                        <tbody>
                            {data.rows.map(u => (
                                <tr key={u.id}>
                                    <td>
                                        <Link href={`/admin/usuarios/${u.id}`} className="font-medium text-brand hover:underline">{u.name}</Link>
                                        {u.isMaster && <span className="ml-1"><Badge tone="brand">Master</Badge></span>}
                                    </td>
                                    <td>{u.email}</td>
                                    <td className="whitespace-nowrap">{formatCpf(u.cpf)}</td>
                                    <td><div className="flex flex-wrap gap-1">{u.roles.map(r => <Badge key={r.id} tone="info">{r.name}</Badge>)}</div></td>
                                    <td>{u.membership ? <Badge tone={statusTone(u.membership.status)}>{u.membership.plan}{u.membership.memberNumber ? ` #${u.membership.memberNumber}` : ''}</Badge> : <span className="text-ink-faint">-</span>}</td>
                                    <td>
                                        <div className="flex flex-wrap gap-1">
                                            {u.status === 'BLOCKED' ? <Badge tone="danger">Bloqueado</Badge> : <Badge tone="ok">Ativo</Badge>}
                                            {u.invitePending && <Badge tone="warn">Convite pendente</Badge>}
                                            {u.totpEnabled && <Badge tone="brand">2FA</Badge>}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap text-ink-muted">{formatDateTime(u.lastLoginAt) || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </TableBox>
                    <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
                </>
            )}

            <CreateUserModal open={creating} roles={roles.data ?? []} canRoles={can('roles.manage')} onClose={() => setCreating(false)} onCreated={() => void reload()} />
        </div>
    );
}

export default function Users() {
    return <RequirePerm perms={['users.read', 'members.read']}><UsersInner /></RequirePerm>;
}
