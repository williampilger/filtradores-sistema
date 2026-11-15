'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Contagem regressiva (reserva do pedido, chamada da lista de espera)
 */
import { useEffect, useRef, useState } from 'react';

export function useNow(intervalMs = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(t);
    }, [intervalMs]);
    return now;
}

export function formatRemaining(ms: number) {
    if (ms <= 0) return '00:00';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function Countdown({ until, onExpire }: { until: string, onExpire?: () => void }) {
    const now = useNow();
    const left = new Date(until).getTime() - now;
    const expired = left <= 0;
    const cb = useRef(onExpire);
    cb.current = onExpire;
    useEffect(() => { if (expired) cb.current?.(); }, [expired]);
    return <span className="tabular-nums">{formatRemaining(left)}</span>;
}
