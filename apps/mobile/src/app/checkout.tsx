/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Checkout (ingressos e produtos): resumo, CPF (se faltar no cadastro), meio de pagamento -> cria o pedido
 */
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { formatCpf, formatMoney, isValidCpf, onlyDigits, type OrderDTO, type PaymentMethod } from '@filt/shared';
import { apiPost } from '@/api';
import { useApi } from '@/hooks/useApi';
import { useSession } from '@/session';
import { clearCheckoutDraft, draftTotal, getCheckoutDraft } from '@/lib/cart';
import { MethodPicker } from '@/components/MethodPicker';
import { Button, Card, Display, Empty, Input, Loading, Notice, Row, Screen, SectionTitle, Txt } from '@/components/ui';

export default function CheckoutScreen() {
    const { session } = useSession();
    const [draft] = useState(getCheckoutDraft);
    const { data: methods, loading } = useApi<PaymentMethod[]>('payment-methods', { refetchOnFocus: false });
    const [method, setMethod] = useState<PaymentMethod | null>(null);
    const [cpf, setCpf] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { if (methods?.length && !method) setMethod(methods.includes('PIX') ? 'PIX' : methods[0]); }, [methods, method]);

    if (!draft || !draft.lines.length) {
        return <Empty icon="cart-outline" text="Nada para pagar."><Button title="Voltar" variant="outline" onPress={() => router.back()} /></Empty>;
    }
    if (loading) return <Loading />;

    const needCpf = !session?.user.cpf;

    async function submit() {
        setError(null);
        if (!method) { setError('Escolha a forma de pagamento'); return; }
        if (needCpf && !isValidCpf(cpf)) { setError('Informe um CPF válido (obrigatório para emitir a cobrança)'); return; }
        if (!session) { setError('Sem conexão com o servidor'); return; }
        setBusy(true);
        const r = await apiPost<{ order: OrderDTO, paymentError: string | null }>('checkout', {
            items: draft!.lines.map(l => l.item),
            method,
            channel: 'APP',
            customer: needCpf ? { name: session.user.name, email: session.user.email, cpf: onlyDigits(cpf), phone: session.user.phone ?? undefined } : undefined,
        });
        setBusy(false);
        if (!r.success) { setError(r.msg); return; }
        clearCheckoutDraft();
        router.replace({ pathname: '/order/[code]', params: { code: r.data.order.code, paymentError: r.data.paymentError ?? '' } });
    }

    return (
        <Screen>
            <Display size={22}>{draft.title}</Display>
            <Card>
                {draft.lines.map((l, i) => (
                    <Row key={i} style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Txt style={{ flex: 1 }}>{l.item.quantity}x {l.label}</Txt>
                        <Txt weight="semibold">{formatMoney(l.unitCents * l.item.quantity)}</Txt>
                    </Row>
                ))}
                <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
                    <Txt weight="bold">Total estimado</Txt>
                    <Display size={22} color="brand">{formatMoney(draftTotal(draft))}</Display>
                </Row>
                <Txt size={12} color="inkMuted">O valor final (com descontos de sócio) é confirmado no pedido.</Txt>
            </Card>

            {needCpf ? (
                <>
                    <SectionTitle>Seus dados</SectionTitle>
                    <Input label="CPF do comprador" value={cpf} onChangeText={v => setCpf(formatCpf(v))} keyboardType="number-pad" maxLength={14} />
                </>
            ) : null}

            <SectionTitle>Pagamento</SectionTitle>
            {methods?.length ? <MethodPicker methods={methods} value={method} onChange={setMethod} />
                : <Notice tone="warn" icon="alert-circle-outline" text="Nenhuma forma de pagamento disponível no momento. Tente mais tarde." />}

            {error ? <Notice tone="danger" icon="alert-circle-outline" text={error} /> : null}
            <Button title="Finalizar compra" variant="accent" icon="lock-closed-outline" loading={busy} disabled={!methods?.length} onPress={submit} />
            <Txt size={12} color="inkMuted" center>Os itens ficam reservados por alguns minutos aguardando o pagamento.</Txt>
        </Screen>
    );
}
