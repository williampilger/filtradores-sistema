'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Portaria: escolhe o evento -> leitor de QR em tela cheia (câmera traseira), digitação manual,
 *              busca por nome/CPF e histórico. Resultado em tela cheia com vibração.
 *  - mesmo código ignorado por 3 s (a câmera lê o mesmo QR várias vezes por segundo)
 *  - deviceId aleatório persistido no aparelho (identifica a portaria nos relatórios)
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaArrowLeft, FaCamera, FaClockRotateLeft, FaKeyboard, FaMagnifyingGlass, FaQrcode } from 'react-icons/fa6';
import { formatDateTime, LABELS, type EventCounters, type StaffEventDTO } from '@filt/shared';
import API, { cleanMsg } from '@/api';
import { Empty, Spinner } from '@/components/ui';
import { DEMO_MODE } from '@/components/site/DemoBanner';
import { useRequireSession } from '@/components/site/useRequireSession';
import { useSession } from '@/hooks/useSession';
import { CameraScanner } from './form.Camera';
import { LogPanel } from './form.Log';
import { type GateResult, ResultOverlay } from './form.Result';
import { SearchPanel } from './form.Search';

const DEVICE_KEY = 'filt.gate.deviceId';
const LAST_EVENT_KEY = 'filt.gate.eventId';
const SAME_CODE_MS = 3000;

function getDeviceId(): string {
    try {
        let id = localStorage.getItem(DEVICE_KEY);
        if (!id) {
            id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem(DEVICE_KEY, id);
        }
        return id.slice(0, 64);
    } catch {
        return 'sem-storage';
    }
}

const vibrate = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* sem suporte */ } };

export default function GateScanner() {
    const { session } = useRequireSession();
    const { can } = useSession();
    const [events, setEvents] = useState<StaffEventDTO[] | null>(null);
    const [event, setEvent] = useState<StaffEventDTO | null>(null);
    const [lastEventId, setLastEventId] = useState<number | null>(null);
    const allowed = !!session && can('checkin.validate');

    useEffect(() => {
        if (!allowed) return;
        API.staff.events().then(r => setEvents(r.success ? r.data : []));
        try { setLastEventId(Number(localStorage.getItem(LAST_EVENT_KEY)) || null); } catch { /* */ }
    }, [allowed]);

    if (!session) return <div className="min-h-dvh bg-brand-deep"><Spinner /></div>;
    if (!allowed) return (
        <main className="hero-blue flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
            <FaQrcode size={48} className="opacity-60" />
            <h1 className="display text-4xl">Sem acesso</h1>
            <p className="max-w-sm opacity-90">Seu usuário não tem permissão para validar entradas. Peça à diretoria para liberar o acesso de portaria.</p>
            <Link href="/" className="btn btn-accent btn-lg">Voltar ao site</Link>
        </main>
    );

    if (event) return <Scanner event={event} onExit={() => { setEvent(null); API.staff.events().then(r => r.success && setEvents(r.data)); }} />;

    return (
        <main className="min-h-dvh bg-app">
            <header className="hero-blue">
                <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
                    <Link href="/" className="rounded p-2" aria-label="Voltar"><FaArrowLeft /></Link>
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-[.2em] text-club-gold">Portaria</div>
                        <h1 className="display text-3xl">Validar entradas</h1>
                    </div>
                </div>
                <div className="club-stripes h-1.5" aria-hidden />
            </header>
            <div className="mx-auto max-w-2xl p-4">
                <p className="mb-3 text-sm text-ink-muted">Escolha o evento:</p>
                {events === null ? <Spinner /> : events.length === 0 ? <Empty>Nenhum evento disponível para validação agora (são listados os eventos a partir de 36 h atrás).</Empty> : (
                    <ul className="flex flex-col gap-3">
                        {events.map(e => (
                            <li key={e.id}>
                                <button type="button" onClick={() => { try { localStorage.setItem(LAST_EVENT_KEY, String(e.id)); } catch { /* */ } setEvent(e); }}
                                    className={`panel w-full p-4 text-left transition-shadow hover:shadow-md ${lastEventId === e.id ? '!border-brand ring-1 ring-brand' : ''}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="display truncate text-2xl text-brand-deep">{e.title}</div>
                                            <div className="text-sm text-ink-muted">{formatDateTime(e.startsAt)}{e.venue ? ` · ${e.venue}` : ''}</div>
                                        </div>
                                        {lastEventId === e.id && <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">último usado</span>}
                                    </div>
                                    <CountersRow c={e.counters} light={false} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </main>
    );
}

function CountersRow({ c, light = true }: { c: EventCounters, light?: boolean }) {
    const items = [
        { l: 'Vendidos', v: c.ticketsSold },
        { l: 'Entraram', v: c.ticketsUsed },
        { l: 'Sócios', v: c.memberEntries },
        { l: 'Capacidade', v: c.capacity ?? '∞' },
    ];
    return (
        <div className="mt-2 grid grid-cols-4 gap-1 text-center">
            {items.map(i => (
                <div key={i.l} className={`rounded-md px-1 py-1 ${light ? 'bg-brand-ink/10' : 'bg-surface-alt'}`}>
                    <div className="text-lg font-bold tabular-nums leading-tight">{i.v}</div>
                    <div className={`text-[10px] uppercase tracking-wide ${light ? 'opacity-80' : 'text-ink-muted'}`}>{i.l}</div>
                </div>
            ))}
        </div>
    );
}

type Tab = 'camera' | 'busca' | 'historico';

function Scanner({ event, onExit }: { event: StaffEventDTO, onExit: () => void }) {
    const [tab, setTab] = useState<Tab>('camera');
    const [counters, setCounters] = useState<EventCounters>(event.counters);
    const [result, setResult] = useState<GateResult | null>(null);
    const [manual, setManual] = useState('');
    const [showManual, setShowManual] = useState(false);
    const [deviceId] = useState(getDeviceId);
    const busy = useRef(false);
    const overlayOpen = useRef(false);
    const last = useRef<{ code: string, at: number }>({ code: '', at: 0 });

    // mantém a tela acesa durante a portaria
    useEffect(() => {
        let lock: { release: () => Promise<void> } | null = null;
        const req = async () => {
            try {
                if ('wakeLock' in navigator) lock = await (navigator as Navigator & { wakeLock: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen');
            } catch { /* sem suporte / sem permissão */ }
        };
        void req();
        const onVis = () => { if (document.visibilityState === 'visible') void req(); };
        document.addEventListener('visibilitychange', onVis);
        return () => { document.removeEventListener('visibilitychange', onVis); void lock?.release().catch(() => undefined); };
    }, []);

    // contadores atualizados ao abrir
    useEffect(() => { API.staff.event(event.id).then(r => { if (r.success) setCounters(r.data.counters); }); }, [event.id]);

    const show = useCallback((r: GateResult) => {
        overlayOpen.current = true;
        setResult(r);
        vibrate(r.result === 'OK' ? 120 : [250, 100, 250]);
    }, []);

    const checkin = useCallback(async (b: { qr?: string, ticketId?: number, membershipId?: number }) => {
        if (busy.current) return;
        busy.current = true;
        const r = await API.staff.checkin(event.id, { ...b, deviceId });
        busy.current = false;
        if (r.success && r.data?.result) {
            if (r.data.counters) setCounters(r.data.counters);
            show(r.data);
        } else {
            show({ result: 'INVALID', message: !r.conex ? 'Sem conexão com o servidor. Verifique a internet e leia de novo.' : cleanMsg(r.msg) || 'Falha ao validar' });
        }
    }, [event.id, deviceId, show]);

    const onCode = useCallback((text: string) => {
        const code = text.trim();
        if (!code || overlayOpen.current || busy.current) return;
        const now = Date.now();
        if (code === last.current.code && now - last.current.at < SAME_CODE_MS) return;
        last.current = { code, at: now };
        void checkin({ qr: code });
    }, [checkin]);

    const dismiss = useCallback(() => {
        overlayOpen.current = false;
        last.current = { ...last.current, at: Date.now() }; // o QR ainda está na frente da câmera
        setResult(null);
    }, []);

    const submitManual = (e: React.FormEvent) => {
        e.preventDefault();
        let code = manual.trim();
        if (!code) return;
        if (!/^F[TM]1\./.test(code)) code = `FT1.${code}`; // código impresso sob o QR do ingresso
        last.current = { code: '', at: 0 };
        void checkin({ qr: code });
        setManual('');
    };

    return (
        <div className={`fixed inset-x-0 bottom-0 flex flex-col bg-ink text-ink-inverse ${DEMO_MODE ? 'top-6' : 'top-0'}`}>
            <header className="hero-blue shrink-0 px-3 pb-2 pt-2">
                <div className="flex items-center gap-2">
                    <button type="button" className="rounded p-2" onClick={onExit} aria-label="Trocar evento"><FaArrowLeft /></button>
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-bold uppercase tracking-[.2em] text-club-gold">Portaria · {LABELS.eventStatus[event.status]}</div>
                        <div className="display truncate text-xl">{event.title}</div>
                    </div>
                </div>
                <CountersRow c={counters} />
            </header>

            {tab === 'camera' && (
                <>
                    <CameraScanner onCode={onCode} active={tab === 'camera'} />
                    <div className="shrink-0 bg-brand-deep p-3">
                        {showManual ? (
                            <form className="flex gap-2" onSubmit={submitManual}>
                                <input className="inp !h-12 font-mono !text-base text-ink" value={manual} onChange={e => setManual(e.target.value)} placeholder="Código do ingresso" autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                                <button className="btn btn-accent !h-12 shrink-0" disabled={!manual.trim()}>Validar</button>
                            </form>
                        ) : (
                            <button type="button" className="flex w-full items-center justify-center gap-2 py-2 text-sm opacity-90" onClick={() => setShowManual(true)}>
                                <FaKeyboard /> Digitar o código manualmente
                            </button>
                        )}
                    </div>
                </>
            )}
            {tab === 'busca' && <SearchPanel eventId={event.id} onCheckin={b => checkin(b)} />}
            {tab === 'historico' && <LogPanel eventId={event.id} deviceId={deviceId} />}

            <nav className="grid shrink-0 grid-cols-3 border-t border-brand-strong bg-brand-deep pb-[env(safe-area-inset-bottom)]">
                {([
                    { k: 'camera', l: 'Câmera', i: <FaCamera /> },
                    { k: 'busca', l: 'Buscar', i: <FaMagnifyingGlass /> },
                    { k: 'historico', l: 'Histórico', i: <FaClockRotateLeft /> },
                ] as const).map(t => (
                    <button key={t.k} type="button" onClick={() => setTab(t.k)}
                        className={`flex flex-col items-center gap-1 py-3 text-xs font-semibold ${tab === t.k ? 'text-club-gold' : 'text-brand-ink opacity-80'}`}>
                        <span className="text-lg">{t.i}</span>{t.l}
                    </button>
                ))}
            </nav>

            {result && <ResultOverlay result={result} onDismiss={dismiss} />}
        </div>
    );
}
