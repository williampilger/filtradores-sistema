'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Usuário: dados, papéis, exceções de permissão, convite/sessões/2FA, situação de sócio e escalas em eventos
 */
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { formatCpf, formatDate, formatDateTime, LABELS } from '@filt/shared';
import API from '@/api';
import type { UserDetail as UserDetailT } from '@/api/types';
import { Badge, Card, Checkbox, confirmAction, Empty, Field, Input, PageHeader, Select, Spinner, statusTone } from '@/components/ui';
import { CopyField, dateInputToIso, isoToDateInput, orNull, RequirePerm, Thumb, useBusy, useData } from '@/components/admin/common';
import { OverrideMatrix, type Override } from '@/components/admin/PermissionMatrix';
import { useSession } from '@/hooks/useSession';

function ProfileCard({ u, canEdit, self, onSaved }: { u: UserDetailT, canEdit: boolean, self: boolean, onSaved: () => void }) {
    const [f, setF] = useState({ name: u.name, cpf: u.cpf ?? '', phone: u.phone ?? '', status: u.status });
    const { busy, run } = useBusy();
    useEffect(() => { setF({ name: u.name, cpf: u.cpf ?? '', phone: u.phone ?? '', status: u.status }); }, [u]);
    const save = async () => {
        const r = await run('save', () => API.admin.users.update(u.id, { name: f.name.trim(), cpf: orNull(f.cpf), phone: orNull(f.phone), ...(self ? {} : { status: f.status }) }));
        if (r.success) { toast.success('Dados salvos'); onSaved(); }
    };
    return (
        <Card title="Dados" actions={canEdit && <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar'}</button>}>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome" className="sm:col-span-2"><Input value={f.name} onChange={v => setF({ ...f, name: v })} disabled={!canEdit} /></Field>
                <Field label="E-mail" hint="O e-mail é o login e não pode ser alterado aqui."><Input value={u.email} onChange={() => undefined} disabled /></Field>
                <Field label="CPF"><Input value={f.cpf} onChange={v => setF({ ...f, cpf: v })} disabled={!canEdit} /></Field>
                <Field label="Telefone"><Input value={f.phone} onChange={v => setF({ ...f, phone: v })} disabled={!canEdit} /></Field>
                <Field label="Situação" hint={self ? 'Você não pode alterar a sua própria situação.' : 'Bloquear encerra todas as sessões.'}>
                    <Select value={f.status} disabled={!canEdit || self || u.isMaster} onChange={v => setF({ ...f, status: v })}
                        options={[{ value: 'ACTIVE', label: 'Ativo' }, { value: 'BLOCKED', label: 'Bloqueado' }]} />
                </Field>
            </div>
        </Card>
    );
}

function AccessCard({ u, self, onSaved }: { u: UserDetailT, self: boolean, onSaved: () => void }) {
    const roles = useData(() => API.admin.roles.list(), []);
    const [roleIds, setRoleIds] = useState<number[]>(u.roleIds);
    const [overrides, setOverrides] = useState<Override[]>(u.overrides);
    const { busy, run } = useBusy();
    useEffect(() => { setRoleIds(u.roleIds); setOverrides(u.overrides); }, [u]);

    const inherited = useMemo(() => new Set((roles.data ?? []).filter(r => roleIds.includes(r.id)).flatMap(r => r.permissions)), [roles.data, roleIds]);
    const save = async () => {
        const r = await run('save', () => API.admin.users.update(u.id, { roleIds, overrides }));
        if (r.success) { toast.success('Acesso atualizado. O usuário recebe as novas permissões na próxima requisição.'); onSaved(); }
    };
    const disabled = self || u.isMaster;

    return (
        <Card title="Acesso ao painel" actions={!disabled && <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar acesso'}</button>}>
            {u.isMaster && <p className="mb-3 rounded-md bg-brand-soft p-2 text-sm text-brand-deep">Usuário <b>master</b>: possui todas as permissões, independentemente de papéis.</p>}
            {self && <p className="mb-3 rounded-md bg-warn-soft p-2 text-sm text-warn">Você não pode alterar os seus próprios papéis ou permissões.</p>}
            {roles.loading && !roles.data ? <Spinner /> : (
                <>
                    <span className="lbl">Papéis</span>
                    <div className="mb-4 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                        {(roles.data ?? []).map(r => (
                            <Checkbox key={r.id} disabled={disabled} checked={roleIds.includes(r.id)}
                                onChange={v => setRoleIds(v ? [...roleIds, r.id] : roleIds.filter(x => x !== r.id))}
                                label={<span>{r.name}{r.require2fa && <span className="ml-1 text-xs text-warn">(exige 2FA)</span>}</span>} />
                        ))}
                    </div>
                    <details>
                        <summary className="cursor-pointer text-sm font-semibold text-brand">Exceções individuais de permissão ({overrides.length})</summary>
                        <p className="my-2 text-xs text-ink-muted">Regra: <b>Negar</b> individual &gt; <b>Conceder</b> individual &gt; permissões dos papéis.</p>
                        <OverrideMatrix inherited={inherited} value={overrides} onChange={setOverrides} disabled={disabled} />
                    </details>
                </>
            )}
        </Card>
    );
}

function SecurityCard({ u, onDone }: { u: UserDetailT, onDone: () => void }) {
    const { can } = useSession();
    const { busy, run } = useBusy();
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);

    const resend = async () => {
        const r = await run('invite', () => API.admin.users.resendInvite(u.id));
        if (r.success) { setInviteUrl(r.data.url); toast.success(u.invitePending ? 'Convite reenviado' : 'Link de redefinição de senha enviado'); }
    };
    const revoke = async () => {
        if (!confirmAction(`Encerrar todas as sessões de ${u.name}? Ele precisará entrar novamente em todos os aparelhos.`)) return;
        const r = await run('revoke', () => API.admin.users.revokeSessions(u.id));
        if (r.success) { toast.success('Sessões encerradas'); onDone(); }
    };
    const reset2fa = async () => {
        if (!confirmAction(`Desativar o 2FA de ${u.name}? As sessões dele serão encerradas.`)) return;
        const r = await run('2fa', () => API.admin.users.reset2fa(u.id));
        if (r.success) onDone();
    };

    return (
        <Card title="Acesso e segurança">
            <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <dt className="text-ink-muted">Cadastro</dt><dd>{formatDateTime(u.createdAt)}</dd>
                <dt className="text-ink-muted">Último acesso</dt><dd>{formatDateTime(u.lastLoginAt) || '-'}</dd>
                <dt className="text-ink-muted">Sessões ativas</dt><dd>{u.activeSessions}</dd>
                <dt className="text-ink-muted">E-mail confirmado</dt><dd>{u.emailVerified ? 'Sim' : 'Não'}</dd>
                <dt className="text-ink-muted">2FA</dt><dd>{u.totpEnabled ? 'Ativado' : 'Desativado'}</dd>
            </dl>
            <div className="flex flex-wrap gap-2">
                {can('users.write') && <button className="btn btn-sm" disabled={!!busy} onClick={() => void resend()}>{u.invitePending ? 'Reenviar convite' : 'Enviar redefinição de senha'}</button>}
                {can('users.write') && <button className="btn btn-sm" disabled={!!busy} onClick={() => void revoke()}>Encerrar sessões</button>}
                {can('roles.manage') && u.totpEnabled && !u.isMaster && <button className="btn btn-danger btn-sm" disabled={!!busy} onClick={() => void reset2fa()}>Resetar 2FA</button>}
            </div>
            {inviteUrl && <div className="mt-3"><CopyField label="Link enviado (copie caso o e-mail não chegue)" value={inviteUrl} /></div>}
        </Card>
    );
}

function MembershipCard({ u, onSaved }: { u: UserDetailT, onSaved: () => void }) {
    const { can } = useSession();
    const canWrite = can('members.write');
    const plans = useData(() => API.admin.plans.list(), [], canWrite);
    const [f, setF] = useState({ planId: u.membership?.planId ?? 0, status: 'ACTIVE' as 'ACTIVE' | 'PENDING', end: isoToDateInput(u.membership?.currentPeriodEnd) });
    const { busy, run } = useBusy();
    const m = u.membership;

    const save = async () => {
        if (!f.planId) return toast.error('Escolha o plano');
        if (!confirmAction(m ? 'Alterar manualmente a associação deste usuário?' : 'Cadastrar este usuário como sócio manualmente?')) return;
        const r = await run('save', () => API.admin.users.setMembership(u.id, { planId: f.planId, status: f.status, currentPeriodEnd: dateInputToIso(f.end) }));
        if (r.success) { toast.success('Associação salva'); onSaved(); }
    };

    return (
        <Card title="Sócio" actions={m && can('members.read') && <Link href={`/admin/socios/${m.id}`} className="btn btn-sm">Abrir ficha do sócio</Link>}>
            {m ? (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                    <Badge tone={statusTone(m.status)}>{LABELS.membershipStatus[m.status]}</Badge>
                    <span className="font-medium">{m.planName}</span>
                    {m.memberNumber && <span className="text-ink-muted">nº {m.memberNumber}</span>}
                    {m.currentPeriodEnd && <span className="text-ink-muted">· válido até {formatDate(m.currentPeriodEnd)}</span>}
                </div>
            ) : <p className="mb-3 text-sm text-ink-muted">Não é sócio.</p>}
            {canWrite && (
                <div className="rounded-lg border border-line p-3">
                    <div className="mb-2 text-sm font-semibold">{m ? 'Alterar manualmente' : 'Cadastrar como sócio (manual)'}</div>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Plano">
                            <Select value={f.planId || ''} placeholder="Selecione..." onChange={v => setF({ ...f, planId: Number(v) })}
                                options={(plans.data ?? []).map(p => ({ value: p.id, label: `${p.name}${p.active ? '' : ' (inativo)'}` }))} />
                        </Field>
                        <Field label="Situação">
                            <Select value={f.status} onChange={v => setF({ ...f, status: v })}
                                options={[{ value: 'ACTIVE', label: 'Ativo (já pago)' }, { value: 'PENDING', label: 'Aguardando pagamento' }]} />
                        </Field>
                        <Field label="Validade"><input type="date" className="inp" value={f.end} onChange={e => setF({ ...f, end: e.target.value })} /></Field>
                    </div>
                    <div className="mt-3 flex justify-end">
                        <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar associação'}</button>
                    </div>
                </div>
            )}
        </Card>
    );
}

function UserDetailInner({ id }: { id: number }) {
    const { can, session } = useSession();
    const { data: u, loading, reload } = useData(() => API.admin.users.get(id), [id]);
    if (loading && !u) return <Spinner />;
    if (!u) return <Empty>Usuário não encontrado.</Empty>;
    const self = session?.user.id === u.id;
    const refresh = () => void reload();

    return (
        <div className="space-y-4">
            <PageHeader
                title={<span className="flex items-center gap-3"><Thumb url={u.photoUrl} size={44} round />{u.name}</span>}
                subtitle={<span>{u.email}{u.cpf ? ` · CPF ${formatCpf(u.cpf)}` : ''}</span>}
                actions={<Link href="/admin/usuarios" className="btn">‹ Usuários</Link>} />
            <div className="flex flex-wrap gap-1">
                {u.isMaster && <Badge tone="brand">Master</Badge>}
                {u.status === 'BLOCKED' ? <Badge tone="danger">Bloqueado</Badge> : <Badge tone="ok">Ativo</Badge>}
                {u.invitePending && <Badge tone="warn">Convite pendente</Badge>}
                {u.totpEnabled && <Badge tone="brand">2FA ativo</Badge>}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <ProfileCard u={u} canEdit={can('users.write') && (!u.isMaster || !!session?.user.isMaster)} self={self} onSaved={refresh} />
                <SecurityCard u={u} onDone={refresh} />
            </div>

            {can('roles.manage') && <AccessCard u={u} self={self} onSaved={refresh} />}

            <div className="grid gap-4 lg:grid-cols-2">
                <MembershipCard u={u} onSaved={refresh} />
                <Card title="Escalado em eventos">
                    <p className="mb-2 text-xs text-ink-muted">Quando o usuário está escalado, as permissões de evento dele (portaria, painel, venda) valem somente para estes eventos.</p>
                    {u.eventStaff.length === 0 ? <p className="text-sm text-ink-faint">Sem restrição: vale para todos os eventos.</p> : (
                        <ul className="space-y-1 text-sm">
                            {u.eventStaff.map(e => (
                                <li key={e.id}><Link href={`/admin/eventos/${e.id}`} className="text-brand hover:underline">{e.title}</Link> <span className="text-ink-muted">· {formatDateTime(e.startsAt)}</span></li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
}

export default function UserDetail({ id }: { id: number }) {
    return <RequirePerm perms={['users.read', 'members.read']}><UserDetailInner id={id} /></RequirePerm>;
}
