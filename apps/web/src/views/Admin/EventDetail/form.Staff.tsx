'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Evento > Equipe: escala usuários da equipe neste evento (restringe as permissões de evento deles)
 */
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import API from '@/api';
import { Card, Checkbox, Input, Spinner } from '@/components/ui';
import { useBusy, useData } from '@/components/admin/common';
import { useSession } from '@/hooks/useSession';

export default function StaffTab({ eventId }: { eventId: number }) {
    const { can } = useSession();
    const current = useData(() => API.admin.events.staff(eventId), [eventId]);
    // lista de candidatos depende de poder ver usuários
    const users = useData(() => API.admin.users.list({ staff: 1, page: 1 }), [], can('users.read', 'members.read'));
    const [selected, setSelected] = useState<number[]>([]);
    const [filter, setFilter] = useState('');
    const { busy, run } = useBusy();
    useEffect(() => { if (current.data) setSelected(current.data.map(u => u.id)); }, [current.data]);

    const save = async () => {
        const r = await run('save', () => API.admin.events.setStaff(eventId, selected));
        if (r.success) { toast.success('Equipe do evento salva'); void current.reload(); }
    };

    if ((current.loading && !current.data) || (users.loading && !users.data)) return <Spinner />;
    // inclui escalados que não vieram na 1ª página da lista
    const all = [...(users.data?.rows ?? []).filter(u => !u.isMaster).map(u => ({ id: u.id, name: u.name, email: u.email, roles: u.roles.map(r => r.name).join(', ') }))];
    for (const u of current.data ?? []) if (!all.some(a => a.id === u.id)) all.push({ ...u, roles: '' });
    const f = filter.trim().toLowerCase();
    const shown = f ? all.filter(u => u.name.toLowerCase().includes(f) || u.email.toLowerCase().includes(f)) : all;

    return (
        <Card title="Equipe escalada" actions={<button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => void save()}>{busy ? 'Salvando...' : 'Salvar equipe'}</button>}>
            <div className="mb-3 rounded-md bg-warn-soft p-3 text-sm text-ink">
                <b>Como funciona:</b> um usuário escalado em um ou mais eventos passa a ter as permissões de evento
                (painel do evento, leitor de QR, relatórios de entrada e venda na portaria) <b>somente nos eventos em que está escalado</b>.
                Quem não está escalado em nenhum evento continua com acesso a todos. As demais permissões não mudam.
            </div>
            <Input value={filter} onChange={setFilter} placeholder="Filtrar por nome ou e-mail" className="mb-3 !w-72" />
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map(u => (
                    <div key={u.id} className="rounded-md border border-line px-3 py-2">
                        <Checkbox checked={selected.includes(u.id)} onChange={v => setSelected(s => (v ? [...s, u.id] : s.filter(x => x !== u.id)))}
                            label={<span><b>{u.name}</b><span className="block text-xs text-ink-muted">{u.email}{u.roles ? ` · ${u.roles}` : ''}</span></span>} />
                    </div>
                ))}
            </div>
            {all.length === 0 && <p className="text-sm text-ink-faint">Nenhum usuário com papel cadastrado.</p>}
            <p className="mt-3 text-xs text-ink-faint">{selected.length} usuário(s) selecionado(s). Usuários master não são afetados pela escala.</p>
        </Card>
    );
}
