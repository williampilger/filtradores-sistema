'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Notificações (marcar como lida / todas)
 */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { FaBell } from 'react-icons/fa6';
import { formatDateTime, type NotificationDTO } from '@filt/shared';
import API from '@/api';
import { Empty, Spinner } from '@/components/ui';
import { useSession } from '@/hooks/useSession';

export function NotificationsTab() {
    const router = useRouter();
    const { refresh } = useSession();
    const [rows, setRows] = useState<NotificationDTO[] | null>(null);
    const load = useCallback(() => API.me.notifications().then(r => setRows(r.success ? r.data : [])), []);
    useEffect(() => { void load(); }, [load]);

    if (rows === null) return <Spinner />;
    const unread = rows.filter(n => !n.readAt).length;

    const open = async (n: NotificationDTO) => {
        if (!n.readAt) {
            setRows(rs => rs?.map(x => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) ?? null);
            await API.me.readNotification(n.id);
            void refresh();
        }
        if (n.link) {
            if (/^https?:\/\//.test(n.link)) window.open(n.link, '_blank', 'noopener');
            else router.push(n.link);
        }
    };

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-ink-muted">{unread ? `${unread} não lida(s)` : 'Tudo lido'}</span>
                {unread > 0 && (
                    <button type="button" className="btn btn-sm" onClick={async () => {
                        const r = await API.me.readAllNotifications();
                        if (r.success) { void load(); void refresh(); }
                    }}>Marcar todas como lidas</button>
                )}
            </div>
            {rows.length === 0 ? <Empty>Nenhuma notificação.</Empty> : (
                <ul className="flex flex-col gap-2">
                    {rows.map(n => (
                        <li key={n.id}>
                            <button type="button" onClick={() => void open(n)}
                                className={`flex w-full gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-surface-hover ${n.readAt ? 'border-line bg-surface' : 'border-brand bg-brand-soft'}`}>
                                <FaBell className={`mt-1 shrink-0 ${n.readAt ? 'text-ink-faint' : 'text-brand'}`} />
                                <span className="min-w-0 flex-1">
                                    <span className={`block ${n.readAt ? '' : 'font-bold'}`}>{n.title}</span>
                                    {n.body && <span className="block text-sm text-ink-muted">{n.body}</span>}
                                    <span className="block text-xs text-ink-faint">{formatDateTime(n.createdAt)}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
