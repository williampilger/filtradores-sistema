'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Cadastro do torcedor (CPF e telefone opcionais aqui; o CPF é pedido na compra/adesão)
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { formatCpf, isValidCpf, onlyDigits } from '@filt/shared';
import API from '@/api';
import { Field, Input } from '@/components/ui';
import { AuthShell } from '@/components/site/AuthShell';
import { safeNext } from '@/components/site/helpers';
import { useSession } from '@/hooks/useSession';

export function Register({ next }: { next?: string }) {
    const router = useRouter();
    const { refresh } = useSession();
    const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', cpf: '', phone: '' });
    const [busy, setBusy] = useState(false);
    const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }));
    const target = safeNext(next);

    return (
        <AuthShell title="Criar conta" subtitle="Seu lugar no Filtradores começa aqui!" wide>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={async e => {
                e.preventDefault();
                if (f.password.length < 8) return void toast.error('A senha deve ter ao menos 8 caracteres');
                if (f.password !== f.confirm) return void toast.error('As senhas não conferem');
                if (f.cpf && !isValidCpf(f.cpf)) return void toast.error('CPF inválido');
                const phone = onlyDigits(f.phone);
                if (phone && (phone.length < 10 || phone.length > 13)) return void toast.error('Telefone inválido (DDD + número)');
                setBusy(true);
                const r = await API.auth.register({ name: f.name.trim(), email: f.email.trim(), password: f.password, cpf: f.cpf ? onlyDigits(f.cpf) : undefined, phone: phone || undefined });
                if (!r.success) { setBusy(false); return; }
                await refresh();
                toast.success('Conta criada! Enviamos um e-mail para confirmar seu endereço.');
                router.replace(target);
            }}>
                <Field label="Nome completo" className="sm:col-span-2"><Input value={f.name} onChange={set('name')} required autoFocus autoComplete="name" className="!h-11 !text-base" /></Field>
                <Field label="E-mail" className="sm:col-span-2"><Input type="email" value={f.email} onChange={set('email')} required autoComplete="email" className="!h-11 !text-base" /></Field>
                <Field label="Senha (mín. 8 caracteres)"><Input type="password" value={f.password} onChange={set('password')} required minLength={8} autoComplete="new-password" className="!h-11 !text-base" /></Field>
                <Field label="Confirmar senha"><Input type="password" value={f.confirm} onChange={set('confirm')} required autoComplete="new-password" className="!h-11 !text-base" /></Field>
                <Field label="CPF (opcional)" hint={f.cpf && !isValidCpf(f.cpf) ? <span className="text-danger">CPF inválido</span> : 'Necessário para comprar e se associar'}>
                    <Input value={f.cpf} onChange={set('cpf')} onBlur={() => setF(s => ({ ...s, cpf: formatCpf(s.cpf) }))} inputMode="numeric" placeholder="000.000.000-00" className="!h-11 !text-base" />
                </Field>
                <Field label="Celular (opcional)"><Input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" placeholder="(51) 99999-9999" className="!h-11 !text-base" /></Field>
                <button className="btn btn-accent btn-lg w-full sm:col-span-2" disabled={busy}>{busy ? 'Criando...' : 'Criar minha conta'}</button>
                <p className="text-center text-sm sm:col-span-2">
                    Já tem conta? <Link href={`/login${next ? `?next=${encodeURIComponent(target)}` : ''}`} className="font-semibold text-brand hover:underline">Entrar</Link>
                </p>
            </form>
        </AuthShell>
    );
}
