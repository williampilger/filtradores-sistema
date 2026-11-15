'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Tela do 2FA
 *  - sessão com 2FA pendente -> validar o código
 *  - cadastro obrigatório (master / papéis com require2fa) ou ?setup=1 vindo da conta -> cadastrar
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FaShieldHalved } from 'react-icons/fa6';
import { Spinner } from '@/components/ui';
import { AuthShell } from '@/components/site/AuthShell';
import { loginHref, safeNext } from '@/components/site/helpers';
import { useSession } from '@/hooks/useSession';
import { SetupForm } from './form.Setup';
import { VerifyForm } from './form.Verify';

export default function TwoFactor({ next, setup }: { next?: string, setup?: boolean }) {
    const router = useRouter();
    const { session, loading, refresh, logout } = useSession();
    const target = safeNext(next);

    useEffect(() => {
        if (!loading && !session) router.replace(loginHref(`/2fa${next ? `?next=${encodeURIComponent(target)}` : ''}`));
    }, [loading, session, router, next, target]);

    const finish = async () => {
        const s = await refresh();
        if (s && (s.mfaPending || s.mfaSetupRequired)) return; // continua nesta tela (ex.: validou e ainda precisa cadastrar)
        router.replace(target);
    };

    if (loading || !session) return <AuthShell title="Verificação em duas etapas"><Spinner /></AuthShell>;

    const footer = (
        <div className="mt-5 flex justify-between border-t border-line pt-4 text-sm">
            <button type="button" className="text-ink-muted hover:underline" onClick={() => void logout()}>Sair</button>
            {!session.mfaPending && !session.mfaSetupRequired && <Link href={target} className="text-brand hover:underline">Voltar</Link>}
        </div>
    );

    if (session.mfaPending) {
        return (
            <AuthShell title="Confirme que é você" subtitle={`Verificação em duas etapas de ${session.user.email}`}>
                <VerifyForm onDone={() => void finish()} />
                {footer}
            </AuthShell>
        );
    }

    if (session.mfaSetupRequired || (setup && !session.user.totpEnabled)) {
        return (
            <AuthShell title="Ative o 2FA" subtitle="Proteja sua conta com a verificação em duas etapas.">
                {session.mfaSetupRequired && (
                    <div className="mb-4 flex gap-3 rounded-lg border border-info bg-info-soft p-3 text-sm">
                        <FaShieldHalved className="mt-0.5 shrink-0 text-info" size={18} />
                        <span>
                            {session.user.isMaster
                                ? 'A conta master controla todo o sistema e, por segurança, só pode ser usada com a verificação em duas etapas ativa.'
                                : 'Sua função no clube dá acesso a dados de torcedores e pagamentos. Por segurança, ative a verificação em duas etapas para continuar.'}
                        </span>
                    </div>
                )}
                <SetupForm email={session.user.email} onDone={() => void finish()} />
                {footer}
            </AuthShell>
        );
    }

    return (
        <AuthShell title="Tudo certo!" subtitle="A verificação em duas etapas está ativa nesta conta.">
            <div className="flex flex-col items-center gap-4 text-center">
                <FaShieldHalved className="text-ok" size={44} />
                <p className="text-sm text-ink-muted">Para desativar ou gerenciar, acesse Minha conta → Segurança.</p>
                <Link href={target} className="btn btn-primary btn-lg w-full">Continuar</Link>
            </div>
        </AuthShell>
    );
}
