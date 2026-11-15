'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - QR code renderizado no navegador (pacote `qrcode`)
 */
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function QrImage({ value, size = 240, className = '', alt = 'QR code' }: { value: string, size?: number, className?: string, alt?: string }) {
    const [src, setSrc] = useState<string | null>(null);
    useEffect(() => {
        let alive = true;
        QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, width: size * 2 })
            .then(url => { if (alive) setSrc(url); })
            .catch(() => { if (alive) setSrc(null); });
        return () => { alive = false; };
    }, [value, size]);
    return (
        <div style={{ width: size, height: size }} className={`flex items-center justify-center bg-surface ${className}`}>
            {src ? <img src={src} alt={alt} width={size} height={size} className="h-full w-full [image-rendering:pixelated]" /> : <span className="text-xs text-ink-faint">Gerando QR...</span>}
        </div>
    );
}
