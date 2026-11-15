'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Confirmação do e-mail (token do link)
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import API, { cleanMsg } from '@/api';
import { Spinner } from '@/components/ui';
import { AuthShell } from '@/components/site/AuthShell';
import { useSession } from '@/hooks/useSession';

export function ConfirmEmail({ token }: { token?: string }) {
    const { refresh } = useSession();
    const [state, setState] = useState<{ ok: boolean, msg: string } | null>(token ? null : { ok: false, msg: 'Link inválido ou incompleto.' });
    const started = useRef(false);

    useEffect(() => {
        if (!token || started.current) return;
        started.current = true;
        API.auth.confirmEmail(token).then(r => {
            setState({ ok: r.success, msg: cleanMsg(r.msg) || (r.success ? 'E-mail confirmado!' : 'Link inválido ou expirado.') });
            if (r.success) void refresh();
        });
    }, [token, refresh]);

    return (
        <AuthShell title="Confirmar e-mail">
            {!state ? <Spinner label="Confirmando..." /> : (
                <div className="flex flex-col items-center gap-3 text-center">
                    {state.ok ? <FaCircleCheck className="text-ok" size={44} /> : <FaCircleXmark className="text-danger" size={44} />}
                    <p className="font-semibold">{state.msg}</p>
                    {!state.ok && <p className="text-sm text-ink-muted">Você pode pedir um novo link em Minha conta → Perfil.</p>}
                    <Link href="/minha-conta" className="btn btn-primary btn-lg w-full">Ir para minha conta</Link>
                </div>
            )}
        </AuthShell>
    );
}
