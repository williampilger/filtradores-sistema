'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Sócios: lista com filtros (situação, plano, busca), paginação e cobranças em aberto
 */
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { formatDate, LABELS, MEMBERSHIP_STATUS, type MembershipStatus } from '@filt/shared';
import API from '@/api';
import { Badge, Empty, Input, Money, PageHeader, Pagination, Select, Spinner, statusTone } from '@/components/ui';
import { FilterBar, optionsOf, RequirePerm, TableBox, useData } from '@/components/admin/common';

function MembersInner() {
    const sp = useSearchParams();
    const initialStatus = sp.get('status');
    const [status, setStatus] = useState<MembershipStatus | ''>((MEMBERSHIP_STATUS as readonly string[]).includes(initialStatus ?? '') ? initialStatus as MembershipStatus : '');
    const [planId, setPlanId] = useState<number | ''>('');
    const [q, setQ] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const plans = useData(() => API.admin.plans.list(), []);
    const { data, loading } = useData(() => API.admin.members.list({ status: status || undefined, planId: planId || undefined, q: search || undefined, page }), [status, planId, search, page]);

    return (
        <div>
            <PageHeader title="Sócios" subtitle="Para cadastrar um sócio manualmente, abra o usuário em Administração > Usuários." />
            <FilterBar>
                <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setPage(1); setSearch(q.trim()); }}>
                    <Input value={q} onChange={setQ} placeholder="Nome, e-mail, CPF ou nº de sócio" className="!w-72" />
                    <button className="btn">Buscar</button>
                </form>
                <Select<MembershipStatus | ''> value={status} className="!w-48" onChange={v => { setPage(1); setStatus(v); }}
                    options={[{ value: '', label: 'Todas as situações' }, ...optionsOf(LABELS.membershipStatus)]} />
                <Select<number | ''> value={planId} className="!w-48" onChange={v => { setPage(1); setPlanId(v); }}
                    options={[{ value: '', label: 'Todos os planos' }, ...(plans.data ?? []).map(p => ({ value: p.id, label: p.name }))]} />
            </FilterBar>

            {loading && !data ? <Spinner /> : !data?.rows.length ? <Empty>Nenhum sócio encontrado.</Empty> : (
                <>
                    <TableBox>
                        <thead><tr><th className="num">Nº</th><th>Nome</th><th>Contato</th><th>Plano</th><th>Situação</th><th>Desde</th><th>Validade</th><th className="num">Em aberto</th></tr></thead>
                        <tbody>
                            {data.rows.map(m => (
                                <tr key={m.id}>
                                    <td className="num">{m.memberNumber ?? '-'}</td>
                                    <td><Link href={`/admin/socios/${m.id}`} className="font-medium text-brand hover:underline">{m.name}</Link></td>
                                    <td className="text-xs text-ink-muted">{m.email}{m.phone ? <><br />{m.phone}</> : null}</td>
                                    <td>{m.plan}</td>
                                    <td><Badge tone={statusTone(m.status)}>{LABELS.membershipStatus[m.status]}</Badge></td>
                                    <td className="whitespace-nowrap">{formatDate(m.startedAt) || '-'}</td>
                                    <td className="whitespace-nowrap">{formatDate(m.currentPeriodEnd) || '-'}</td>
                                    <td className={`num ${m.openChargesCents ? 'font-semibold text-danger' : 'text-ink-faint'}`}><Money cents={m.openChargesCents} /></td>
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

export default function Members() {
    return <RequirePerm perms={['members.read']}><MembersInner /></RequirePerm>;
}
