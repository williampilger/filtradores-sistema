'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Páginas que exigem login: redireciona para /login (ou /2fa) e devolve a sessão pronta
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { currentPath, loginHref } from './helpers';

export function useRequireSession() {
    const { session, loading } = useSession();
    const router = useRouter();
    const incomplete = !!session && (session.mfaPending || session.mfaSetupRequired);
    useEffect(() => {
        if (loading) return;
        if (!session) router.replace(loginHref(currentPath()));
        else if (incomplete) router.replace(`/2fa?next=${encodeURIComponent(currentPath())}`);
    }, [loading, session, incomplete, router]);
    return { session: session && !incomplete ? session : null, loading: loading || !session || incomplete };
}
