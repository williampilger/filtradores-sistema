'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Carteirinha digital do sócio com QR ROTATIVO (muda a cada 30 s; gerado no aparelho com a cardKey)
 */
import { useMemo } from 'react';
import { FaTriangleExclamation } from 'react-icons/fa6';
import { buildMemberQr, formatDate, LABELS, QR_WINDOW_SECONDS, qrWindow, type MemberCard as MemberCardDTO } from '@filt/shared';
import { Badge, statusTone } from '@/components/ui';
import { Avatar } from './Avatar';
import { ClubLogo } from './ClubLogo';
import { useNow } from './Countdown';
import { QrImage } from './QrImage';

export function MemberCard({ card, logoUrl }: { card: MemberCardDTO, logoUrl?: string | null }) {
    const now = useNow(250);
    const win = qrWindow(now);
    // o conteúdo só muda na virada da janela de 30 s
    const qr = useMemo(() => buildMemberQr(card.cardKey, card.membershipId, win * QR_WINDOW_SECONDS * 1000), [card.cardKey, card.membershipId, win]);
    const elapsed = (now / 1000) % QR_WINDOW_SECONDS;
    const left = Math.ceil(QR_WINDOW_SECONDS - elapsed);
    const active = card.status === 'ACTIVE';

    return (
        <div className="mx-auto w-full max-w-sm">
            <div className="hero-blue overflow-hidden rounded-3xl shadow-2xl">
                <div className="club-stripes h-4" aria-hidden />
                <div className="flex items-center justify-between px-5 pt-4">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-[.25em] text-club-gold">Sócio-torcedor</div>
                        <div className="display text-xl">ACE Filtradores</div>
                    </div>
                    <ClubLogo logoUrl={logoUrl} size="md" />
                </div>
                <div className="flex items-center gap-4 px-5 pt-4">
                    <Avatar name={card.name} photoUrl={card.photoUrl} size={72} className="ring-2 ring-surface" />
                    <div className="min-w-0">
                        <div className="truncate text-lg font-bold">{card.name}</div>
                        <div className="display text-3xl text-club-gold">{card.planName}</div>
                        <div className="text-xs opacity-90">
                            {card.memberNumber != null && <>Nº <b className="tabular-nums">{String(card.memberNumber).padStart(5, '0')}</b> · </>}
                            {card.validUntil ? <>Válida até {formatDate(card.validUntil)}</> : 'Validade indeterminada'}
                        </div>
                    </div>
                </div>

                <div className="px-5 pb-5 pt-4">
                    {active ? (
                        <div className="rounded-2xl bg-surface p-4 text-ink">
                            <div className="flex justify-center">
                                <QrImage value={qr} size={230} alt="QR da carteirinha" />
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-soft" aria-hidden>
                                <div className="h-full bg-brand transition-[width] duration-300 ease-linear" style={{ width: `${(1 - elapsed / QR_WINDOW_SECONDS) * 100}%` }} />
                            </div>
                            <div className="mt-1.5 text-center text-xs text-ink-muted">O código muda em <b className="tabular-nums">{left}s</b> · prints não valem</div>
                        </div>
                    ) : (
                        <div className="rounded-2xl bg-surface p-5 text-center text-ink">
                            <FaTriangleExclamation className="mx-auto text-warn" size={32} />
                            <div className="mt-2 font-bold">Carteirinha {LABELS.membershipStatus[card.status].toLowerCase()}</div>
                            <p className="mt-1 text-sm text-ink-muted">
                                {card.status === 'PENDING' ? 'Assim que o pagamento da adesão for confirmado, o QR de entrada aparece aqui.'
                                    : card.status === 'OVERDUE' ? 'Há mensalidade em aberto. Regularize na aba "Sócio" para liberar a entrada.'
                                        : 'Sua associação não está ativa. Fale com a diretoria ou escolha um novo plano.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-3 flex justify-center"><Badge tone={statusTone(card.status)}>{LABELS.membershipStatus[card.status]}</Badge></div>
        </div>
    );
}
