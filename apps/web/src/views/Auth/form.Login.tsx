'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Login (e-mail e senha). Com 2FA pendente/obrigatório segue para /2fa.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import API from '@/api';
import { Field, Input } from '@/components/ui';
import { AuthShell } from '@/components/site/AuthShell';
import { safeNext } from '@/components/site/helpers';
import { useSession } from '@/hooks/useSession';

export function Login({ next }: { next?: string }) {
    const router = useRouter();
    const { session, refresh } = useSession();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const target = safeNext(next);
    const qsNext = next ? `?next=${encodeURIComponent(target)}` : '';

    // já logado: segue direto
    useEffect(() => {
        if (!session || busy) return;
        router.replace(session.mfaPending || session.mfaSetupRequired ? `/2fa?next=${encodeURIComponent(target)}` : target);
    }, [session, busy, router, target]);

    return (
        <AuthShell title="Entrar" subtitle="Acesse seus ingressos, a carteirinha de sócio e seus pedidos.">
            <form className="flex flex-col gap-4" onSubmit={async e => {
                e.preventDefault();
                setBusy(true);
                const r = await API.auth.login(email.trim(), password);
                if (!r.success) { setBusy(false); return; }
                await refresh();
                if (r.data.mfaPending || r.data.mfaSetupRequired) router.replace(`/2fa?next=${encodeURIComponent(target)}`);
                else router.replace(target);
            }}>
                <Field label="E-mail"><Input type="email" value={email} onChange={setEmail} required autoFocus autoComplete="email" className="!h-11 text-base" /></Field>
                <Field label="Senha"><Input type="password" value={password} onChange={setPassword} required autoComplete="current-password" className="!h-11 text-base" /></Field>
                <button className="btn btn-primary btn-lg w-full" disabled={busy}>{busy ? 'Entrando...' : 'Entrar'}</button>
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <Link href={`/cadastro${qsNext}`} className="font-semibold text-brand hover:underline">Criar conta</Link>
                    <Link href="/recuperar-senha" className="text-ink-muted hover:underline">Esqueci minha senha</Link>
                </div>
            </form>
        </AuthShell>
    );
}
