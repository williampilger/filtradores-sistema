'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Segurança: verificação em duas etapas e sessões abertas
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FaShieldHalved } from 'react-icons/fa6';
import { formatDateTime } from '@filt/shared';
import API from '@/api';
import type { SessionRow } from '@/api/types';
import { Badge, Card, confirmAction, Field, Input, Spinner } from '@/components/ui';
import { useSession } from '@/hooks/useSession';

function deviceLabel(s: SessionRow) {
    const ua = s.userAgent ?? '';
    const os = /iPhone|iPad/.test(ua) ? 'iPhone/iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Dispositivo';
    const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return `${s.client === 'app' ? 'App' : 'Navegador'} · ${os}${br ? ` · ${br}` : ''}`;
}

export function SecurityTab() {
    const { session, refresh, logout } = useSession();
    const u = session!.user;
    const [code, setCode] = useState('');
    const [sessions, setSessions] = useState<SessionRow[] | null>(null);
    const load = useCallback(() => API.me.sessions().then(r => setSessions(r.success ? r.data : [])), []);
    useEffect(() => { void load(); }, [load]);

    return (
        <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Verificação em duas etapas (2FA)">
                <div className="flex items-start gap-3">
                    <FaShieldHalved className={u.totpEnabled ? 'text-ok' : 'text-ink-faint'} size={28} />
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Status:</span>
                            {u.totpEnabled ? <Badge tone="ok">Ativa</Badge> : <Badge>Desativada</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-ink-muted">Além da senha, pede um código do app autenticador do seu celular ao entrar.</p>
                    </div>
                </div>
                {!u.totpEnabled ? (
                    <Link href={`/2fa?setup=1&next=${encodeURIComponent('/minha-conta?aba=seguranca')}`} className="btn btn-primary mt-4">Ativar 2FA</Link>
                ) : u.isMaster ? (
                    <p className="mt-4 rounded-lg bg-info-soft p-3 text-sm">O 2FA é obrigatório para a conta master e não pode ser desativado.</p>
                ) : (
                    <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={async e => {
                        e.preventDefault();
                        if (!confirmAction('Desativar a verificação em duas etapas? Sua conta fica menos protegida.')) return;
                        const r = await API.auth.mfaDisable(code);
                        if (r.success) { setCode(''); void refresh(); }
                    }}>
                        <Field label="Código atual do app para desativar" className="flex-1">
                            <Input value={code} onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" required pattern="\d{6}" />
                        </Field>
                        <button className="btn btn-danger" disabled={code.length !== 6}>Desativar</button>
                    </form>
                )}
            </Card>

            <Card title="Sessões abertas" actions={<button type="button" className="btn btn-sm" onClick={() => void logout()}>Sair desta</button>}>
                {sessions === null ? <Spinner /> : (
                    <ul className="flex flex-col divide-y divide-line">
                        {sessions.map(s => (
                            <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold">{deviceLabel(s)} {s.current && <Badge tone="ok">Esta sessão</Badge>}</div>
                                    <div className="text-xs text-ink-muted">Último acesso {formatDateTime(s.lastSeenAt)}{s.ip ? ` · IP ${s.ip}` : ''}</div>
                                </div>
                                {!s.current && (
                                    <button type="button" className="btn btn-sm btn-danger" onClick={async () => {
                                        const r = await API.me.endSession(s.id);
                                        if (r.success) void load();
                                    }}>Encerrar</button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
