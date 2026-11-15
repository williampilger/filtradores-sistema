'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Minhas entradas na lista de espera deste produto (posição, chamada com prazo de compra)
 */
import { FaHourglassHalf } from 'react-icons/fa6';
import { formatDateTime, LABELS, type WaitlistEntryDTO } from '@filt/shared';
import { Badge, statusTone } from '@/components/ui';
import { Countdown } from '@/components/site/Countdown';

export function MyWaitlist({ entries, onBuy, buyingId }: { entries: WaitlistEntryDTO[], onBuy: (e: WaitlistEntryDTO) => void, buyingId: number | null }) {
    if (!entries.length) return null;
    return (
        <section className="rounded-xl border border-info bg-info-soft p-4">
            <h3 className="mb-2 flex items-center gap-2 font-bold text-ink"><FaHourglassHalf className="text-info" /> Você está na lista de espera</h3>
            <ul className="flex flex-col gap-2">
                {entries.map(e => {
                    const notified = e.status === 'NOTIFIED' && (!e.reservationExpiresAt || new Date(e.reservationExpiresAt).getTime() > Date.now());
                    return (
                        <li key={e.id} className="flex flex-col gap-2 rounded-lg bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm">
                                <div className="font-semibold">{e.variant.name} · {e.quantity} un.</div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                                    <Badge tone={statusTone(e.status)}>{LABELS.waitlistStatus[e.status]}</Badge>
                                    {e.position != null && <span>Posição na fila: <b className="text-ink">{e.position}º</b></span>}
                                    {e.batch && <span>Lote: {e.batch.name} ({LABELS.batchStatus[e.batch.status]})</span>}
                                </div>
                            </div>
                            {notified && (
                                <div className="flex flex-col items-stretch gap-1 sm:items-end">
                                    <button type="button" className="btn btn-accent" disabled={buyingId === e.id} onClick={() => onBuy(e)}>
                                        Comprar agora{e.reservationExpiresAt ? ` (reservado até ${formatDateTime(e.reservationExpiresAt)})` : ''}
                                    </button>
                                    {e.reservationExpiresAt && <span className="text-center text-xs text-ink-muted">Expira em <Countdown until={e.reservationExpiresAt} /></span>}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
