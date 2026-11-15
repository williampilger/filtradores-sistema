/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Seletor de quantidade (− n +), com alvos de toque grandes
 */
import { FaMinus, FaPlus } from 'react-icons/fa6';

export function QtyStepper({ value, onChange, min = 0, max, disabled, label = 'Quantidade' }: { value: number, onChange: (v: number) => void, min?: number, max: number, disabled?: boolean, label?: string }) {
    return (
        <div className="inline-flex items-center overflow-hidden rounded-lg border border-line-strong bg-surface" role="group" aria-label={label}>
            <button type="button" className="flex h-10 w-10 items-center justify-center text-brand hover:bg-surface-hover disabled:opacity-40"
                disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Diminuir">
                <FaMinus />
            </button>
            <span className="w-10 text-center text-base font-bold tabular-nums" aria-live="polite">{value}</span>
            <button type="button" className="flex h-10 w-10 items-center justify-center text-brand hover:bg-surface-hover disabled:opacity-40"
                disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label="Aumentar">
                <FaPlus />
            </button>
        </div>
    );
}
