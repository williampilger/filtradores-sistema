'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Cadastro do 2FA: QR para o app autenticador -> confirma o código -> códigos de recuperação (exibidos UMA vez)
 */
import { useEffect, useRef, useState } from 'react';
import { FaCopy, FaDownload } from 'react-icons/fa6';
import API from '@/api';
import { Checkbox, Field, Input, Spinner } from '@/components/ui';
import { copyText, downloadText } from '@/components/site/helpers';

export function SetupForm({ onDone, email }: { onDone: () => void, email: string }) {
    const [setup, setSetup] = useState<{ secret: string, qrDataUrl: string } | null>(null);
    const [failed, setFailed] = useState(false);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [codes, setCodes] = useState<string[] | null>(null);
    const [saved, setSaved] = useState(false);
    const started = useRef(false);

    const start = async () => {
        setFailed(false);
        const r = await API.auth.mfaSetup();
        if (r.success && r.data.qrDataUrl) setSetup(r.data);
        else setFailed(true);
    };

    // StrictMode executa o efeito 2x em dev: o ref evita gerar dois segredos diferentes
    useEffect(() => {
        if (started.current) return;
        started.current = true;
        void start();
    }, []);

    if (codes) {
        const txt = `ACE Filtradores - códigos de recuperação do 2FA\nConta: ${email}\nGerados em: ${new Date().toLocaleString('pt-BR')}\n\n${codes.join('\n')}\n\nCada código pode ser usado uma única vez.\n`;
        return (
            <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-warn bg-warn-soft p-3 text-sm">
                    <b>Guarde estes códigos em local seguro.</b> Se perder o celular, eles são a única forma de entrar sem a ajuda da diretoria. Eles <b>não serão exibidos novamente</b>.
                </div>
                <ul className="grid grid-cols-2 gap-2 rounded-lg bg-surface-alt p-4 font-mono text-sm">
                    {codes.map(c => <li key={c} className="text-center">{c}</li>)}
                </ul>
                <div className="flex gap-2">
                    <button type="button" className="btn flex-1" onClick={() => void copyText(codes.join('\n'), 'Códigos copiados')}><FaCopy /> Copiar</button>
                    <button type="button" className="btn flex-1" onClick={() => downloadText('filtradores-codigos-recuperacao.txt', txt)}><FaDownload /> Baixar .txt</button>
                </div>
                <Checkbox checked={saved} onChange={setSaved} label="Guardei os códigos em local seguro" />
                <button type="button" className="btn btn-primary btn-lg w-full" disabled={!saved} onClick={onDone}>Continuar</button>
            </div>
        );
    }

    if (failed) return (
        <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-muted">Não foi possível iniciar o cadastro do 2FA.</p>
            <button type="button" className="btn btn-primary" onClick={() => void start()}>Tentar novamente</button>
        </div>
    );
    if (!setup) return <Spinner label="Gerando QR..." />;

    return (
        <form className="flex flex-col gap-4" onSubmit={async e => {
            e.preventDefault();
            setBusy(true);
            const r = await API.auth.mfaEnable(code);
            setBusy(false);
            if (r.success) setCodes(r.data.recoveryCodes);
            else setCode('');
        }}>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-ink-muted">
                <li>Instale um app autenticador no celular (Google Authenticator, Authy, Microsoft Authenticator...).</li>
                <li>No app, adicione uma conta escaneando o QR abaixo.</li>
                <li>Digite o código de 6 dígitos que aparecer no app.</li>
            </ol>
            <div className="flex justify-center">
                <img src={setup.qrDataUrl} alt="QR para o app autenticador" className="h-52 w-52 rounded-lg border border-line bg-surface p-1" />
            </div>
            <details className="text-sm">
                <summary className="cursor-pointer text-brand">Não consegue escanear? Digite a chave manualmente</summary>
                <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 break-all rounded bg-surface-alt px-2 py-1 font-mono text-xs">{setup.secret}</code>
                    <button type="button" className="btn btn-sm" onClick={() => void copyText(setup.secret, 'Chave copiada')}><FaCopy /></button>
                </div>
            </details>
            <Field label="Código de 6 dígitos">
                <Input value={code} onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))} required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" placeholder="000000" className="!h-14 text-center font-mono !text-3xl tracking-[.4em]" />
            </Field>
            <button className="btn btn-primary btn-lg w-full" disabled={busy || code.length !== 6}>{busy ? 'Ativando...' : 'Ativar verificação em duas etapas'}</button>
        </form>
    );
}
