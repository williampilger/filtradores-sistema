'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Kit de componentes básicos (formulários, modal, abas, badges, tabela, paginação)
 *
 * ⚠️ Cores SOMENTE via tokens do tema (globals.css). Reutilize estes componentes nas telas.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { formatMoney, parseMoneyToCents } from '@filt/shared';

// ─── Layout ─────────────────────────────────────────────────────────────────

export function PageHeader({ title, subtitle, actions }: { title: ReactNode, subtitle?: ReactNode, actions?: ReactNode }) {
    return (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 className="text-xl font-bold text-ink">{title}</h1>
                {subtitle && <p className="text-sm text-ink-muted">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode, actions?: ReactNode, children: ReactNode, className?: string }) {
    return (
        <section className={`panel p-4 ${className}`}>
            {(title || actions) && (
                <div className="mb-3 flex items-center justify-between gap-2">
                    {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
                    {actions && <div className="flex gap-2">{actions}</div>}
                </div>
            )}
            {children}
        </section>
    );
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string, value: ReactNode, hint?: ReactNode, tone?: 'default' | 'ok' | 'warn' | 'danger' }) {
    const toneCls = { default: 'text-ink', ok: 'text-ok', warn: 'text-warn', danger: 'text-danger' }[tone];
    return (
        <div className="panel p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</div>
            <div className={`mt-1 text-2xl font-bold ${toneCls}`}>{value}</div>
            {hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>}
        </div>
    );
}

export function Empty({ children }: { children: ReactNode }) {
    return <div className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-ink-muted">{children}</div>;
}

export function Spinner({ label = 'Carregando...' }: { label?: string }) {
    return <div className="p-8 text-center text-sm text-ink-muted">{label}</div>;
}

// ─── Formulário ─────────────────────────────────────────────────────────────

export function Field({ label, children, hint, className = '' }: { label: ReactNode, children: ReactNode, hint?: ReactNode, className?: string }) {
    return (
        <label className={`block ${className}`}>
            <span className="lbl">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>}
        </label>
    );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & { value: string | number | null | undefined, onChange: (v: string) => void };
export function Input({ value, onChange, className = '', ...rest }: InputProps) {
    return <input className={`inp ${className}`} value={value ?? ''} onChange={e => onChange(e.target.value)} {...rest} />;
}

export function TextArea({ value, onChange, rows = 4, className = '', ...rest }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & { value: string | null | undefined, onChange: (v: string) => void }) {
    return <textarea className={`inp ${className}`} rows={rows} value={value ?? ''} onChange={e => onChange(e.target.value)} {...rest} />;
}

export function Select<V extends string | number>({ value, onChange, options, placeholder, className = '', disabled }: { value: V | null | undefined, onChange: (v: V) => void, options: { value: V, label: string }[], placeholder?: string, className?: string, disabled?: boolean }) {
    return (
        <select className={`inp ${className}`} disabled={disabled} value={value ?? ''} onChange={e => {
            const opt = options.find(o => String(o.value) === e.target.value);
            if (opt) onChange(opt.value);
        }}>
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {options.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </select>
    );
}

export function Checkbox({ checked, onChange, label, disabled }: { checked: boolean, onChange: (v: boolean) => void, label: ReactNode, disabled?: boolean }) {
    return (
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-brand" />
            <span>{label}</span>
        </label>
    );
}

/** Campo de dinheiro: edita em reais, devolve centavos */
export function MoneyInput({ cents, onChange, className = '', disabled }: { cents: number | null | undefined, onChange: (cents: number | null) => void, className?: string, disabled?: boolean }) {
    const [text, setText] = useState(cents == null ? '' : (cents / 100).toFixed(2).replace('.', ','));
    useEffect(() => { setText(cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',')); }, [cents]);
    return <input className={`inp num ${className}`} inputMode="decimal" disabled={disabled} value={text} onChange={e => setText(e.target.value)} onBlur={() => onChange(parseMoneyToCents(text))} placeholder="0,00" />;
}

/** "2026-11-15T19:30" <-> ISO (horário local do navegador) */
export function DateTimeInput({ value, onChange, className = '' }: { value: string | null | undefined, onChange: (iso: string | null) => void, className?: string }) {
    const local = value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '';
    return <input type="datetime-local" className={`inp ${className}`} value={local} onChange={e => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} />;
}

export function FileButton({ label, accept = 'image/*', onFile, disabled }: { label: ReactNode, accept?: string, onFile: (f: File) => void, disabled?: boolean }) {
    return (
        <label className={`btn ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
            {label}
            <input type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
        </label>
    );
}

// ─── Exibição ───────────────────────────────────────────────────────────────

const BADGE_TONES = {
    default: 'bg-surface-alt text-ink-muted border-line',
    ok: 'bg-ok-soft text-ok border-ok',
    warn: 'bg-warn-soft text-warn border-warn',
    danger: 'bg-danger-soft text-danger border-danger',
    info: 'bg-info-soft text-info border-info',
    brand: 'bg-brand-soft text-brand border-brand',
} as const;
export type Tone = keyof typeof BADGE_TONES;

export function Badge({ children, tone = 'default' }: { children: ReactNode, tone?: Tone }) {
    return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}>{children}</span>;
}

/** Tom padrão por status (pedidos, pagamentos, ingressos, sócios...) */
export function statusTone(s: string): Tone {
    if (['PAID', 'ACTIVE', 'VALID', 'OK', 'DELIVERED', 'CONVERTED', 'PUBLISHED', 'READY', 'READY_FOR_PICKUP'].includes(s)) return 'ok';
    if (['PENDING', 'PENDING_PAYMENT', 'OPEN', 'WAITING', 'NOTIFIED', 'DRAFT', 'IN_PRODUCTION', 'AUTHORIZED'].includes(s)) return 'warn';
    if (['CANCELED', 'FAILED', 'EXPIRED', 'REFUNDED', 'CHARGEBACK', 'OVERDUE', 'BLOCKED', 'INVALID', 'ALREADY_USED'].includes(s)) return 'danger';
    if (['USED', 'CLOSED', 'PARTIALLY_REFUNDED'].includes(s)) return 'info';
    return 'default';
}

export const Money = ({ cents }: { cents: number | null | undefined }) => <span className="num">{formatMoney(cents)}</span>;

export function Tabs<K extends string>({ tabs, value, onChange }: { tabs: { key: K, label: ReactNode, hidden?: boolean }[], value: K, onChange: (k: K) => void }) {
    return (
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
            {tabs.filter(t => !t.hidden).map(t => (
                <button key={t.key} type="button" onClick={() => onChange(t.key)}
                    className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${value === t.key ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink'}`}>
                    {t.label}
                </button>
            ))}
        </div>
    );
}

export function Modal({ open, title, onClose, children, footer, wide }: { open: boolean, title: ReactNode, onClose: () => void, children: ReactNode, footer?: ReactNode, wide?: boolean }) {
    useEffect(() => {
        if (!open) return;
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-[6vh]" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={`panel w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} shadow-xl`}>
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <h3 className="font-semibold">{title}</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fechar">✕</button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
                {footer && <div className="flex justify-end gap-2 border-t border-line px-4 py-3">{footer}</div>}
            </div>
        </div>
    );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number, pageSize: number, total: number, onPage: (p: number) => void }) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    if (pages <= 1) return <div className="mt-2 text-xs text-ink-faint">{total} registro(s)</div>;
    return (
        <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-ink-muted">{total} registro(s)</span>
            <div className="flex items-center gap-2">
                <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Anterior</button>
                <span>{page} / {pages}</span>
                <button className="btn btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Próxima ›</button>
            </div>
        </div>
    );
}

/** Confirmação simples (window.confirm) com texto padronizado */
export const confirmAction = (text: string) => typeof window !== 'undefined' && window.confirm(text);
