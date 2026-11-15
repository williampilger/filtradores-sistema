'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Lotes de ingresso com seletor de quantidade (respeita maxPerOrder, disponibilidade, lote de sócio)
 */
import Link from 'next/link';
import { FaLock } from 'react-icons/fa6';
import { formatDateTime, formatMoney, type TicketTypeDTO } from '@filt/shared';
import { Badge } from '@/components/ui';
import { QtyStepper } from '@/components/site/QtyStepper';

export function unavailableReason(t: TicketTypeDTO, now = Date.now()): string | null {
    if (t.onSale) return null;
    if (t.available <= 0) return 'Esgotado';
    if (t.salesStartAt && new Date(t.salesStartAt).getTime() > now) return `Vendas a partir de ${formatDateTime(t.salesStartAt)}`;
    if (t.salesEndAt && new Date(t.salesEndAt).getTime() < now) return 'Vendas encerradas';
    return 'Indisponível';
}

export function TicketTypeRow({ t, qty, onQty, activeMember, saleOpen }: { t: TicketTypeDTO, qty: number, onQty: (n: number) => void, activeMember: boolean, saleOpen: boolean }) {
    const reason = !saleOpen ? 'Vendas encerradas' : unavailableReason(t);
    const locked = t.membersOnly && !activeMember;
    const max = Math.max(0, Math.min(t.maxPerOrder, t.available));
    const hasMember = t.memberPriceCents != null && t.memberPriceCents < t.priceCents;

    return (
        <div className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 sm:flex-row sm:items-center ${qty > 0 ? 'border-brand ring-1 ring-brand' : 'border-line'}`}>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-brand-deep">{t.name}</h3>
                    {t.membersOnly && <Badge tone="warn">Exclusivo sócios</Badge>}
                    {t.onSale && t.available <= 20 && <Badge tone="danger">Últimos {t.available}</Badge>}
                </div>
                {t.description && <p className="mt-0.5 text-sm text-ink-muted">{t.description}</p>}
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    {hasMember ? (
                        <>
                            <span className="text-xl font-bold text-ok">{formatMoney(t.memberPriceCents)}</span>
                            <span className="text-sm text-ink-faint line-through">{formatMoney(t.priceCents)}</span>
                            <span className="text-xs font-semibold text-ok">preço de sócio</span>
                        </>
                    ) : <span className="text-xl font-bold text-brand">{t.priceCents === 0 ? 'Gratuito' : formatMoney(t.priceCents)}</span>}
                </div>
                {t.onSale && saleOpen && t.salesEndAt && <div className="mt-0.5 text-xs text-ink-faint">Vendas até {formatDateTime(t.salesEndAt)}</div>}
            </div>
            <div className="shrink-0">
                {reason ? <Badge tone={reason === 'Esgotado' ? 'danger' : 'default'}>{reason}</Badge>
                    : locked ? (
                        <Link href="/socio" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"><FaLock /> Só para sócios em dia</Link>
                    ) : <QtyStepper value={qty} onChange={onQty} max={max} label={`Quantidade de ${t.name}`} />}
            </div>
        </div>
    );
}
