'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Matrizes de permissões: por papel (marcar/desmarcar) e por usuário (herdado / conceder / negar)
 */
import { PERMISSION_GROUPS } from '@filt/shared';
import { Checkbox } from '@/components/ui';

/** Matriz de permissões de um papel, agrupada pelo catálogo */
export function PermissionMatrix({ value, onChange, disabled }: { value: string[], onChange: (v: string[]) => void, disabled?: boolean }) {
    const set = new Set(value);
    const toggle = (p: string, on: boolean) => onChange(on ? [...new Set([...value, p])] : value.filter(x => x !== p));
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {PERMISSION_GROUPS.map(g => {
                const keys = Object.keys(g.perms);
                const all = keys.every(k => set.has(k));
                return (
                    <div key={g.key} className="rounded-lg border border-line p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{g.label}</span>
                            <button type="button" className="btn btn-ghost btn-sm" disabled={disabled}
                                onClick={() => onChange(all ? value.filter(x => !keys.includes(x)) : [...new Set([...value, ...keys])])}>
                                {all ? 'Desmarcar todas' : 'Marcar todas'}
                            </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {Object.entries(g.perms).map(([k, label]) => (
                                <Checkbox key={k} checked={set.has(k)} disabled={disabled} onChange={v => toggle(k, v)}
                                    label={<span>{label} <span className="font-mono text-xs text-ink-faint">{k}</span></span>} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export type Override = { permission: string, effect: 'GRANT' | 'DENY' };

/**
 * Exceções individuais de um usuário.
 * `inherited` = permissões que ele já recebe pelos papéis (mostradas como "herdado: sim/não").
 */
export function OverrideMatrix({ inherited, value, onChange, disabled }: { inherited: Set<string>, value: Override[], onChange: (v: Override[]) => void, disabled?: boolean }) {
    const map = new Map(value.map(o => [o.permission, o.effect]));
    const set = (p: string, eff: '' | 'GRANT' | 'DENY') => {
        const rest = value.filter(o => o.permission !== p);
        onChange(eff ? [...rest, { permission: p, effect: eff }] : rest);
    };
    return (
        <div className="overflow-x-auto">
            <table className="tbl">
                <thead><tr><th>Permissão</th><th>Pelos papéis</th><th>Exceção</th><th>Resultado</th></tr></thead>
                {PERMISSION_GROUPS.map(g => (
                    <tbody key={g.key}>
                        <tr><td colSpan={4} className="bg-surface-alt text-xs font-semibold uppercase tracking-wide text-ink-muted">{g.label}</td></tr>
                        {Object.entries(g.perms).map(([k, label]) => {
                            const eff = map.get(k) ?? '';
                            const has = eff === 'DENY' ? false : eff === 'GRANT' ? true : inherited.has(k);
                            return (
                                <tr key={k}>
                                    <td>{label} <span className="font-mono text-xs text-ink-faint">{k}</span></td>
                                    <td className="text-xs">{inherited.has(k) ? <span className="text-ok">Sim</span> : <span className="text-ink-faint">Não</span>}</td>
                                    <td>
                                        <select className="inp !h-[28px] !w-auto text-xs" disabled={disabled} value={eff} onChange={e => set(k, e.target.value as '' | 'GRANT' | 'DENY')}>
                                            <option value="">Herdado</option>
                                            <option value="GRANT">Conceder</option>
                                            <option value="DENY">Negar</option>
                                        </select>
                                    </td>
                                    <td className="text-xs font-medium">{has ? <span className="text-ok">Permitido</span> : <span className="text-danger">Bloqueado</span>}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                ))}
            </table>
        </div>
    );
}
