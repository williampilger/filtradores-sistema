'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Modal de cadastro de usuário (envia convite por e-mail e mostra o link, pois o SMTP pode estar desligado)
 */
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import API from '@/api';
import type { RoleRow } from '@/api/types';
import { Checkbox, Field, Input, Modal } from '@/components/ui';
import { CopyField, orNull, useBusy } from '@/components/admin/common';

const EMPTY = { name: '', email: '', cpf: '', phone: '' };

export default function CreateUserModal({ open, roles, canRoles, onClose, onCreated }: { open: boolean, roles: RoleRow[], canRoles: boolean, onClose: () => void, onCreated: () => void }) {
    const [f, setF] = useState(EMPTY);
    const [roleIds, setRoleIds] = useState<number[]>([]);
    const [invite, setInvite] = useState<{ id: number, url: string } | null>(null);
    const { busy, run } = useBusy();

    const close = () => { setF(EMPTY); setRoleIds([]); setInvite(null); onClose(); };
    const submit = async () => {
        const r = await run('save', () => API.admin.users.create({ name: f.name.trim(), email: f.email.trim(), cpf: orNull(f.cpf), phone: orNull(f.phone), roleIds }));
        if (r.success) {
            toast.success('Usuário criado e convite enviado');
            setInvite({ id: r.data.id, url: r.data.inviteUrl });
            onCreated();
        }
    };

    return (
        <Modal open={open} title="Novo usuário" onClose={close}
            footer={invite
                ? <button className="btn btn-primary" onClick={close}>Concluir</button>
                : <>
                    <button className="btn" onClick={close}>Cancelar</button>
                    <button className="btn btn-primary" disabled={!!busy || !f.name.trim() || !f.email.trim()} onClick={() => void submit()}>{busy ? 'Salvando...' : 'Criar e convidar'}</button>
                </>}>
            {invite ? (
                <div className="space-y-3">
                    <p className="text-sm">Usuário criado. Um e-mail de convite foi enviado (se o envio de e-mails estiver configurado).</p>
                    <CopyField label="Link de convite (envie ao usuário caso o e-mail não chegue)" value={invite.url} />
                    <Link href={`/admin/usuarios/${invite.id}`} className="btn btn-sm">Abrir cadastro do usuário</Link>
                </div>
            ) : (
                <div className="space-y-3">
                    <Field label="Nome *"><Input value={f.name} onChange={v => setF({ ...f, name: v })} autoFocus /></Field>
                    <Field label="E-mail *"><Input type="email" value={f.email} onChange={v => setF({ ...f, email: v })} /></Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="CPF"><Input value={f.cpf} onChange={v => setF({ ...f, cpf: v })} inputMode="numeric" /></Field>
                        <Field label="Telefone"><Input value={f.phone} onChange={v => setF({ ...f, phone: v })} inputMode="tel" /></Field>
                    </div>
                    {canRoles && roles.length > 0 && (
                        <div>
                            <span className="lbl">Papéis (acesso ao painel)</span>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                                {roles.map(r => (
                                    <Checkbox key={r.id} label={r.name} checked={roleIds.includes(r.id)}
                                        onChange={v => setRoleIds(v ? [...roleIds, r.id] : roleIds.filter(x => x !== r.id))} />
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-ink-faint">Sem papel = conta comum de torcedor/sócio.</p>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
