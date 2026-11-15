'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Senha: recuperar (envia link), redefinir (token do e-mail) e definir pelo convite da diretoria
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { FaEnvelope } from 'react-icons/fa6';
import API from '@/api';
import { Field, Input } from '@/components/ui';
import { AuthShell } from '@/components/site/AuthShell';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    return (
        <AuthShell title="Recuperar senha" subtitle="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.">
            {sent ? (
                <div className="flex flex-col items-center gap-3 text-center">
                    <FaEnvelope className="text-brand" size={40} />
                    <p>Se o e-mail <b>{email}</b> estiver cadastrado, você vai receber o link em instantes. Confira também a caixa de spam.</p>
                    <Link href="/login" className="btn btn-primary btn-lg w-full">Voltar ao login</Link>
                </div>
            ) : (
                <form className="flex flex-col gap-4" onSubmit={async e => {
                    e.preventDefault();
                    setBusy(true);
                    const r = await API.auth.forgot(email.trim());
                    setBusy(false);
                    if (r.success) setSent(true);
                }}>
                    <Field label="E-mail"><Input type="email" value={email} onChange={setEmail} required autoFocus autoComplete="email" className="!h-11 !text-base" /></Field>
                    <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? 'Enviando...' : 'Enviar link'}</button>
                    <Link href="/login" className="text-center text-sm text-ink-muted hover:underline">Lembrei a senha</Link>
                </form>
            )}
        </AuthShell>
    );
}

function NewPasswordForm({ submitLabel, onSubmit }: { submitLabel: string, onSubmit: (password: string) => Promise<boolean> }) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    return (
        <form className="flex flex-col gap-4" onSubmit={async e => {
            e.preventDefault();
            if (password.length < 8) return void toast.error('A senha deve ter ao menos 8 caracteres');
            if (password !== confirm) return void toast.error('As senhas não conferem');
            setBusy(true);
            const ok = await onSubmit(password);
            if (!ok) setBusy(false);
        }}>
            <Field label="Nova senha (mín. 8 caracteres)"><Input type="password" value={password} onChange={setPassword} required minLength={8} autoFocus autoComplete="new-password" className="!h-11 !text-base" /></Field>
            <Field label="Confirmar senha"><Input type="password" value={confirm} onChange={setConfirm} required autoComplete="new-password" className="!h-11 !text-base" /></Field>
            <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? 'Salvando...' : submitLabel}</button>
        </form>
    );
}

function MissingToken({ title }: { title: string }) {
    return (
        <AuthShell title={title}>
            <p className="text-sm">Link inválido ou incompleto. Abra novamente o link recebido por e-mail ou solicite um novo.</p>
            <Link href="/recuperar-senha" className="btn btn-primary btn-lg mt-4 w-full">Solicitar novo link</Link>
        </AuthShell>
    );
}

export function ResetPassword({ token }: { token?: string }) {
    const router = useRouter();
    if (!token) return <MissingToken title="Redefinir senha" />;
    return (
        <AuthShell title="Nova senha" subtitle="Crie uma nova senha para a sua conta.">
            <NewPasswordForm submitLabel="Salvar nova senha" onSubmit={async pw => {
                const r = await API.auth.reset(token, pw);
                if (r.success) router.replace('/login');
                return r.success;
            }} />
        </AuthShell>
    );
}

export function AcceptInvite({ token }: { token?: string }) {
    const router = useRouter();
    if (!token) return <MissingToken title="Convite" />;
    return (
        <AuthShell title="Bem-vindo à equipe" subtitle="Você foi convidado pela diretoria do Filtradores. Defina sua senha para acessar o sistema.">
            <NewPasswordForm submitLabel="Definir senha" onSubmit={async pw => {
                const r = await API.auth.acceptInvite(token, pw);
                if (r.success) router.replace('/login?next=/admin');
                return r.success;
            }} />
            <p className="mt-4 text-xs text-ink-muted">Dependendo da sua função, será necessário ativar a verificação em duas etapas (2FA) no primeiro acesso.</p>
        </AuthShell>
    );
}
