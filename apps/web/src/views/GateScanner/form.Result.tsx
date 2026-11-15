'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Resultado da validação em TELA CHEIA (verde liberado / vermelho negado): legibilidade acima da marca
 */
import { useEffect } from 'react';
import { FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import { formatDateTime, LABELS, type CheckInResponse } from '@filt/shared';
import { Avatar } from '@/components/site/Avatar';

export type GateResult = Pick<CheckInResponse, 'result' | 'message' | 'ticket' | 'member'>;

export function ResultOverlay({ result, onDismiss }: { result: GateResult, onDismiss: () => void }) {
    const ok = result.result === 'OK';

    // liberado some sozinho; negado exige toque (o porteiro precisa ver)
    useEffect(() => {
        if (!ok) return;
        const t = setTimeout(onDismiss, 2500);
        return () => clearTimeout(t);
    }, [ok, onDismiss]);

    const t = result.ticket, m = result.member;
    const label = LABELS.checkInResult[result.result];

    return (
        <button type="button" onClick={onDismiss} aria-live="assertive"
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 text-center text-ink-inverse ${ok ? 'bg-ok' : 'bg-danger'}`}>
            {ok ? <FaCircleCheck size={88} /> : <FaCircleXmark size={88} />}
            <div className="display text-7xl sm:text-8xl">{ok ? 'Liberado' : 'Negado'}</div>
            {!ok && <div className="text-2xl font-bold">{label}</div>}
            {result.message && result.message !== label && <div className="max-w-md text-lg opacity-95">{result.message}</div>}

            {m && (
                <div className="mt-2 flex flex-col items-center gap-2">
                    <Avatar name={m.name} photoUrl={m.photoUrl} size={140} className="ring-4 ring-surface" />
                    <div className="text-3xl font-bold">{m.name}</div>
                    <div className="display text-3xl">{m.planName}</div>
                    <div className="text-base opacity-90">
                        {m.memberNumber != null && <>Sócio nº {m.memberNumber} · </>}{m.cpfMasked} · {LABELS.membershipStatus[m.status]}
                    </div>
                </div>
            )}
            {t && !m && (
                <div className="mt-2 flex flex-col items-center gap-1">
                    <div className="text-3xl font-bold">{t.holderName}</div>
                    <div className="display text-3xl">{t.ticketTypeName || LABELS.ticketOrigin[t.origin]}</div>
                    <div className="text-base opacity-90">{LABELS.ticketOrigin[t.origin]}</div>
                </div>
            )}
            {!ok && t?.usedAt && <div className="rounded-lg bg-ink/25 px-4 py-2 text-lg font-semibold">Utilizado em {formatDateTime(t.usedAt)}</div>}

            <div className="absolute inset-x-0 bottom-6 text-sm opacity-80">{ok ? 'Próximo!' : 'Toque para continuar'}</div>
        </button>
    );
}
