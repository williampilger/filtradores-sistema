'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Instruções de pagamento (PIX com QR e copia-e-cola, link do checkout, boleto)
 */
import { FaArrowUpRightFromSquare, FaBarcode, FaCopy, FaCreditCard } from 'react-icons/fa6';
import { formatDateTime, formatMoney, LABELS, type PaymentDTO } from '@filt/shared';
import { Badge, statusTone } from '@/components/ui';
import { copyText } from './helpers';

export function PaymentPanel({ payment }: { payment: PaymentDTO }) {
    const pending = payment.status === 'PENDING' || payment.status === 'AUTHORIZED';
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-ink-muted">
                    {LABELS.paymentMethod[payment.method]} · <b className="text-ink">{formatMoney(payment.amountCents)}</b>
                </div>
                <Badge tone={statusTone(payment.status)}>{LABELS.paymentStatus[payment.status]}</Badge>
            </div>

            {pending && payment.pixQrBase64 && (
                <div className="flex flex-col items-center gap-2">
                    <img src={payment.pixQrBase64.startsWith('data:') ? payment.pixQrBase64 : `data:image/png;base64,${payment.pixQrBase64}`}
                        alt="QR code PIX" className="h-56 w-56 rounded-lg border border-line bg-surface p-1 [image-rendering:pixelated]" />
                    <span className="text-xs text-ink-muted">Abra o app do seu banco e escaneie o QR</span>
                </div>
            )}
            {pending && payment.pixCopiaECola && (
                <div>
                    <span className="lbl">PIX copia e cola</span>
                    <div className="flex gap-2">
                        <input className="inp font-mono text-xs" readOnly value={payment.pixCopiaECola} onFocus={e => e.currentTarget.select()} aria-label="Código PIX copia e cola" />
                        <button type="button" className="btn btn-primary shrink-0" onClick={() => void copyText(payment.pixCopiaECola!, 'Código PIX copiado!')}><FaCopy /> Copiar</button>
                    </div>
                </div>
            )}
            {pending && payment.checkoutUrl && (
                <a href={payment.checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-lg w-full">
                    <FaCreditCard /> Ir para o pagamento <FaArrowUpRightFromSquare size={12} />
                </a>
            )}
            {pending && payment.boletoUrl && (
                <a href={payment.boletoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-lg w-full">
                    <FaBarcode /> Abrir boleto <FaArrowUpRightFromSquare size={12} />
                </a>
            )}
            {pending && payment.expiresAt && <p className="text-xs text-ink-muted">Pague até {formatDateTime(payment.expiresAt)}. A confirmação aparece aqui automaticamente.</p>}
            {pending && !payment.pixQrBase64 && !payment.pixCopiaECola && !payment.checkoutUrl && !payment.boletoUrl && (
                <p className="text-sm text-ink-muted">Pagamento registrado. Aguardando a confirmação do meio de pagamento.</p>
            )}
            {payment.paidAt && <p className="text-sm text-ok">Pago em {formatDateTime(payment.paidAt)}</p>}
        </div>
    );
}
