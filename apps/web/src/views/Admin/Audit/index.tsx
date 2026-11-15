'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Auditoria: registro de ações (filtros por ação, usuário e entidade; dados em JSON expansível)
 */
import { useState } from 'react';
import { formatDateTime } from '@filt/shared';
import API from '@/api';
import { Empty, Field, Input, PageHeader, Pagination, Spinner } from '@/components/ui';
import { FilterBar, RequirePerm, TableBox, useData } from '@/components/admin/common';

type Filters = { action: string, userId: string, entity: string, entityId: string };
const EMPTY: Filters = { action: '', userId: '', entity: '', entityId: '' };

function AuditInner() {
    const [form, setForm] = useState<Filters>(EMPTY);
    const [applied, setApplied] = useState<Filters>(EMPTY);
    const [page, setPage] = useState(1);
    const { data, loading } = useData(() => API.admin.audit({
        action: applied.action || undefined, userId: Number(applied.userId) || undefined, entity: applied.entity || undefined, entityId: applied.entityId || undefined, page,
    }), [applied, page]);

    return (
        <div>
            <PageHeader title="Auditoria" subtitle="Registro das ações administrativas e de segurança" />
            <form onSubmit={e => { e.preventDefault(); setPage(1); setApplied({ ...form }); }}>
                <FilterBar>
                    <Field label="Ação (prefixo)"><Input value={form.action} onChange={v => setForm({ ...form, action: v })} placeholder="ex.: user. / order." className="!w-44" /></Field>
                    <Field label="ID do usuário"><Input value={form.userId} onChange={v => setForm({ ...form, userId: v })} inputMode="numeric" className="!w-28" /></Field>
                    <Field label="Entidade"><Input value={form.entity} onChange={v => setForm({ ...form, entity: v })} placeholder="ex.: event" className="!w-36" /></Field>
                    <Field label="ID da entidade"><Input value={form.entityId} onChange={v => setForm({ ...form, entityId: v })} className="!w-28" disabled={!form.entity} /></Field>
                    <button className="btn">Filtrar</button>
                    <button type="button" className="btn btn-ghost" onClick={() => { setForm(EMPTY); setApplied(EMPTY); setPage(1); }}>Limpar</button>
                </FilterBar>
            </form>
            {loading && !data ? <Spinner /> : !data?.rows.length ? <Empty>Nenhum registro.</Empty> : (
                <>
                    <TableBox>
                        <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>IP</th><th>Dados</th></tr></thead>
                        <tbody>
                            {data.rows.map(r => (
                                <tr key={r.id} className="align-top">
                                    <td className="whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                                    <td>{r.user ?? <span className="text-ink-faint">sistema</span>}</td>
                                    <td className="font-mono text-xs">{r.action}</td>
                                    <td className="whitespace-nowrap font-mono text-xs">{r.entity ? `${r.entity}${r.entityId ? ` #${r.entityId}` : ''}` : '-'}</td>
                                    <td className="font-mono text-xs text-ink-muted">{r.ip ?? ''}</td>
                                    <td className="max-w-[420px]">
                                        {r.data != null && (
                                            <details>
                                                <summary className="cursor-pointer text-xs text-brand">ver dados</summary>
                                                <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-surface-alt p-2 text-xs">{JSON.stringify(r.data, null, 2)}</pre>
                                            </details>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </TableBox>
                    <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
                </>
            )}
        </div>
    );
}

export default function Audit() {
    return <RequirePerm perms={['audit.read']}><AuditInner /></RequirePerm>;
}
