'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Modal de estorno de pagamento (total ou parcial), usado em Pagamentos e no detalhe do pedido
 */
import { useState } from 'react';
import API from '@/api';
import { Field, Modal, Money, MoneyInput, TextArea } from '@/components/ui';

export type RefundTarget = { id: number, amountCents: number, refundedCents: number, label?: string };

export default function RefundModal({ target, onClose, onDone }: { target: RefundTarget | null, onClose: () => void, onDone: () => void }) {
    const [amount, setAmount] = useState<number | null>(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const remaining = target ? target.amountCents - target.refundedCents : 0;

    const close = () => { setAmount(null); setReason(''); onClose(); };
    const submit = async () => {
        if (!target) return;
        setBusy(true);
        // a API já mostra o toast de sucesso ("Estorno registrado")
        const r = await API.admin.payments.refund(target.id, { amountCents: amount && amount > 0 ? amount : undefined, reason: reason.trim() });
        setBusy(false);
        if (r.success) { close(); onDone(); }
    };

    return (
        <Modal open={!!target} title={`Estornar pagamento #${target?.id ?? ''}`} onClose={close}
            footer={<>
                <button className="btn" onClick={close}>Voltar</button>
                <button className="btn btn-danger" disabled={busy || reason.trim().length < 3 || (amount != null && amount > remaining)} onClick={() => void submit()}>
                    {busy ? 'Estornando...' : 'Confirmar estorno'}
                </button>
            </>}>
            {target && (
                <div className="space-y-3">
                    {target.label && <p className="text-sm text-ink-muted">{target.label}</p>}
                    <p className="text-sm">Valor pago: <Money cents={target.amountCents} /> · já estornado: <Money cents={target.refundedCents} /> · disponível: <b><Money cents={remaining} /></b></p>
                    <Field label="Valor a estornar" hint="Deixe em branco para estornar o saldo total disponível.">
                        <MoneyInput cents={amount} onChange={setAmount} />
                    </Field>
                    <Field label="Motivo *">
                        <TextArea value={reason} onChange={setReason} rows={3} placeholder="Ex.: pago após a expiração do pedido, desistência..." />
                    </Field>
                    <p className="text-xs text-ink-faint">Pagamentos via gateway são estornados no próprio gateway. Pagamentos em dinheiro/manual apenas registram o estorno (devolva o valor ao cliente).</p>
                </div>
            )}
        </Modal>
    );
}
