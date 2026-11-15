'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Perfil: dados pessoais, foto, confirmação de e-mail e troca de senha
 */
import { useState } from 'react';
import { toast } from 'react-toastify';
import { FaUpload } from 'react-icons/fa6';
import { formatCpf, isValidCpf, onlyDigits } from '@filt/shared';
import API from '@/api';
import { Badge, Card, Field, FileButton, Input } from '@/components/ui';
import { Avatar } from '@/components/site/Avatar';
import { useSession } from '@/hooks/useSession';

export function ProfileTab() {
    const { session, refresh } = useSession();
    const u = session!.user;
    const [f, setF] = useState({ name: u.name, phone: u.phone ?? '', cpf: formatCpf(u.cpf), birthDate: u.birthDate ?? '' });
    const [busy, setBusy] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
    const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (f.cpf && !isValidCpf(f.cpf)) return void toast.error('CPF inválido');
        const phone = onlyDigits(f.phone);
        if (phone && (phone.length < 10 || phone.length > 13)) return void toast.error('Telefone inválido (DDD + número)');
        setBusy(true);
        const r = await API.me.updateProfile({ name: f.name.trim(), phone: phone || null, cpf: f.cpf ? onlyDigits(f.cpf) : null, birthDate: f.birthDate || null });
        setBusy(false);
        if (r.success) { toast.success('Perfil atualizado'); void refresh(); }
    };

    return (
        <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Dados pessoais">
                <div className="mb-4 flex items-center gap-4">
                    <Avatar name={u.name} photoUrl={u.photoUrl} size={80} />
                    <div className="flex flex-col gap-1">
                        <FileButton disabled={uploading} label={<><FaUpload /> {uploading ? 'Enviando...' : 'Trocar foto'}</>} onFile={async file => {
                            setUploading(true);
                            const r = await API.me.uploadPhoto(file);
                            setUploading(false);
                            if (r.success) { toast.success('Foto atualizada'); void refresh(); }
                        }} />
                        <span className="text-xs text-ink-muted">A foto aparece na sua carteirinha de sócio.</span>
                    </div>
                </div>
                <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
                    <Field label="Nome completo" className="sm:col-span-2"><Input value={f.name} onChange={set('name')} required autoComplete="name" /></Field>
                    <Field label="CPF" hint={f.cpf && !isValidCpf(f.cpf) ? <span className="text-danger">CPF inválido</span> : undefined}>
                        <Input value={f.cpf} onChange={set('cpf')} onBlur={() => setF(s => ({ ...s, cpf: formatCpf(s.cpf) }))} inputMode="numeric" placeholder="000.000.000-00" />
                    </Field>
                    <Field label="Celular"><Input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="(51) 99999-9999" /></Field>
                    <Field label="Data de nascimento"><Input type="date" value={f.birthDate} onChange={set('birthDate')} /></Field>
                    <div className="flex items-end sm:col-span-2"><button className="btn btn-primary" disabled={busy}>{busy ? 'Salvando...' : 'Salvar'}</button></div>
                </form>
            </Card>

            <div className="flex flex-col gap-5">
                <Card title="E-mail">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{u.email}</span>
                        {u.emailVerified ? <Badge tone="ok">Confirmado</Badge> : <Badge tone="warn">Não confirmado</Badge>}
                    </div>
                    {!u.emailVerified && (
                        <div className="mt-3 flex flex-col items-start gap-2">
                            <p className="text-sm text-ink-muted">Confirme seu e-mail para receber ingressos, avisos da lista de espera e cobranças.</p>
                            <button type="button" className="btn btn-sm" onClick={() => void API.me.resendConfirmation()}>Reenviar e-mail de confirmação</button>
                        </div>
                    )}
                    <p className="mt-3 text-xs text-ink-faint">Para trocar o e-mail, fale com a diretoria.</p>
                </Card>

                <Card title="Alterar senha">
                    <form className="flex flex-col gap-3" onSubmit={async e => {
                        e.preventDefault();
                        if (pw.next.length < 8) return void toast.error('A nova senha deve ter ao menos 8 caracteres');
                        if (pw.next !== pw.confirm) return void toast.error('As senhas não conferem');
                        const r = await API.me.changePassword(pw.current, pw.next);
                        if (r.success) setPw({ current: '', next: '', confirm: '' });
                    }}>
                        <Field label="Senha atual"><Input type="password" value={pw.current} onChange={v => setPw(s => ({ ...s, current: v }))} required autoComplete="current-password" /></Field>
                        <Field label="Nova senha (mín. 8)"><Input type="password" value={pw.next} onChange={v => setPw(s => ({ ...s, next: v }))} required minLength={8} autoComplete="new-password" /></Field>
                        <Field label="Confirmar nova senha"><Input type="password" value={pw.confirm} onChange={v => setPw(s => ({ ...s, confirm: v }))} required autoComplete="new-password" /></Field>
                        <button className="btn btn-primary self-start">Alterar senha</button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
