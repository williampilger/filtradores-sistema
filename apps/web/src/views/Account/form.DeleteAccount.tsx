'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Exclusão da conta pelo próprio usuário (LGPD / exigência das lojas de apps)
 */
import { useState } from 'react';
import { toast } from 'react-toastify';
import API from '@/api';
import { Card, Checkbox, Field, Input } from '@/components/ui';
import { useSession } from '@/hooks/useSession';

export function DeleteAccountTab() {
    const { session } = useSession();
    const [password, setPassword] = useState('');
    const [agree, setAgree] = useState(false);
    const [busy, setBusy] = useState(false);

    if (session?.user.isMaster) return <Card title="Excluir conta"><p className="text-sm">A conta master não pode ser excluída.</p></Card>;

    return (
        <Card title="Excluir minha conta" className="max-w-2xl !border-danger">
            <div className="flex flex-col gap-3 text-sm">
                <p>Ao excluir sua conta:</p>
                <ul className="list-disc pl-5 text-ink-muted">
                    <li>seus dados pessoais (nome, e-mail, CPF, telefone e foto) são <b>anonimizados</b> e você não consegue mais entrar;</li>
                    <li>sua associação de sócio é encerrada e a carteirinha deixa de valer;</li>
                    <li>você perde o acesso aos seus ingressos e pedidos pela conta (guarde antes o que precisar);</li>
                    <li>o histórico financeiro (pedidos e pagamentos) é mantido de forma anônima, por obrigação legal.</li>
                </ul>
                <p className="font-semibold">Esta ação não pode ser desfeita.</p>
                <form className="mt-2 flex flex-col gap-3" onSubmit={async e => {
                    e.preventDefault();
                    setBusy(true);
                    const r = await API.me.deleteAccount(password);
                    setBusy(false);
                    if (!r.success) return;
                    toast.info('Sua conta foi excluída. Obrigado por torcer com a gente!');
                    setTimeout(() => { window.location.href = '/'; }, 1200);
                }}>
                    <Field label="Confirme sua senha"><Input type="password" value={password} onChange={setPassword} required autoComplete="current-password" /></Field>
                    <Checkbox checked={agree} onChange={setAgree} label="Entendo que a exclusão é definitiva" />
                    <button className="btn btn-danger self-start" disabled={!agree || !password || busy}>{busy ? 'Excluindo...' : 'Excluir minha conta'}</button>
                </form>
            </div>
        </Card>
    );
}
