'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Câmera com leitura contínua de QR (@zxing/browser), câmera traseira no celular.
 *              ⚠️ Navegadores só liberam a câmera em HTTPS (ou localhost).
 */
import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { FaCamera, FaRotate } from 'react-icons/fa6';

export function CameraScanner({ onCode, active }: { onCode: (text: string) => void, active: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const cb = useRef(onCode);
    cb.current = onCode;
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(true);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!active) return;
        let controls: IScannerControls | null = null;
        let cancelled = false;
        setError(null);
        setStarting(true);
        (async () => {
            if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
                setError('Este navegador não liberou a câmera (o site precisa estar em HTTPS). Use a digitação do código abaixo ou a busca por nome.');
                setStarting(false);
                return;
            }
            try {
                const { BrowserQRCodeReader } = await import('@zxing/browser');
                const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 500 });
                const c = await reader.decodeFromConstraints(
                    { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
                    videoRef.current ?? undefined,
                    result => { if (result) cb.current(result.getText()); },
                );
                if (cancelled) c.stop();
                else controls = c;
            } catch (e) {
                const name = (e as Error)?.name;
                if (!cancelled) setError(
                    name === 'NotAllowedError' ? 'Permissão da câmera negada. Libere o acesso à câmera nas configurações do navegador e tente de novo.'
                        : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'Nenhuma câmera encontrada neste aparelho.'
                            : name === 'NotReadableError' ? 'A câmera está em uso por outro app. Feche-o e tente de novo.'
                                : 'Não foi possível abrir a câmera.',
                );
            } finally {
                if (!cancelled) setStarting(false);
            }
        })();
        return () => { cancelled = true; controls?.stop(); };
    }, [active, attempt]);

    return (
        <div className="relative flex-1 overflow-hidden bg-ink">
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline autoPlay />
            {/* moldura de mira */}
            {!error && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="aspect-square w-[68%] max-w-80 rounded-3xl border-4 border-surface/80 shadow-[0_0_0_9999px_color-mix(in_oklab,var(--color-ink)_45%,transparent)]" />
                </div>
            )}
            {starting && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-inverse">
                    <FaCamera size={32} className="animate-pulse" />
                    <span className="text-sm">Abrindo a câmera...</span>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-ink-inverse">
                    <FaCamera size={36} className="opacity-60" />
                    <p className="max-w-sm text-sm">{error}</p>
                    <button type="button" className="btn btn-accent" onClick={() => setAttempt(a => a + 1)}><FaRotate /> Tentar de novo</button>
                </div>
            )}
        </div>
    );
}
