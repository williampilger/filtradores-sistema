'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Validação do 2FA no login (código de 6 dígitos do app ou código de recuperação)
 */
import { useState } from 'react';
import API from '@/api';
import { Field, Input } from '@/components/ui';

export function VerifyForm({ onDone }: { onDone: () => void }) {
    const [code, setCode] = useState('');
    const [recovery, setRecovery] = useState(false);
    const [busy, setBusy] = useState(false);
    return (
        <form className="flex flex-col gap-4" onSubmit={async e => {
            e.preventDefault();
            setBusy(true);
            const r = await API.auth.mfaVerify(code.trim());
            setBusy(false);
            if (r.success) onDone();
            else setCode('');
        }}>
            <p className="text-sm text-ink-muted">
                {recovery ? 'Digite um dos códigos de recuperação que você guardou ao ativar o 2FA. Cada código só pode ser usado uma vez.' : 'Abra o app autenticador (Google Authenticator, Authy, Microsoft Authenticator...) e digite o código de 6 dígitos.'}
            </p>
            <Field label={recovery ? 'Código de recuperação' : 'Código de 6 dígitos'}>
                {recovery
                    ? <Input value={code} onChange={setCode} required autoFocus autoComplete="off" className="!h-12 font-mono text-lg" />
                    : <Input value={code} onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))} required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" placeholder="000000" className="!h-14 text-center font-mono text-3xl tracking-[.4em]" />}
            </Field>
            <button className="btn btn-primary btn-lg w-full" disabled={busy || (!recovery && code.length !== 6) || (recovery && code.trim().length < 6)}>{busy ? 'Verificando...' : 'Verificar'}</button>
            <button type="button" className="text-sm text-brand hover:underline" onClick={() => { setRecovery(r => !r); setCode(''); }}>
                {recovery ? 'Usar o código do app autenticador' : 'Perdeu o celular? Usar código de recuperação'}
            </button>
        </form>
    );
}
