/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Pedido: pagamento (PIX na tela / cartão, boleto e checkout no navegador), acompanhamento e ingressos
 *  - consulta o pedido a cada 5 s enquanto aguarda pagamento (o webhook do gateway confirma no servidor)
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { formatDateTime, formatMoney, LABELS, type OrderDTO, type PaymentDTO, type PaymentMethod } from '@filt/shared';
import { apiPost } from '@/api';
import { useApi } from '@/hooks/useApi';
import { currentPayment, externalPayUrl, openPaymentUrl, ORDER_TONE, pixImageUri } from '@/lib/payments';
import { MethodPicker } from '@/components/MethodPicker';
import { QrCode } from '@/components/QrCode';
import { TicketCard } from '@/components/TicketCard';
import { Badge, Button, Card, Display, ErrorState, HeroBlue, Loading, Notice, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export default function OrderScreen() {
    const params = useLocalSearchParams<{ code: string, paymentError?: string }>();
    const code = String(params.code).toUpperCase();
    const [polling, setPolling] = useState(true);
    const { data: order, loading, error, refresh, refreshing, reload } = useApi<OrderDTO>(`orders/${encodeURIComponent(code)}`, { pollMs: polling ? 5000 : undefined });
    const { data: methods } = useApi<PaymentMethod[]>('payment-methods', { refetchOnFocus: false });
    const [changing, setChanging] = useState(false);
    const [method, setMethod] = useState<PaymentMethod | null>(null);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [payError, setPayError] = useState<string | null>(params.paymentError || null);
    const autoOpened = useRef(false);

    const pending = order?.status === 'PENDING_PAYMENT';
    useEffect(() => { if (order) setPolling(order.status === 'PENDING_PAYMENT'); }, [order]);

    const pay: PaymentDTO | null = order ? currentPayment(order) : null;
    const extUrl = pay ? externalPayUrl(pay) : null;

    // cartão/checkout/boleto: abre a página de pagamento automaticamente uma vez
    useEffect(() => {
        if (!pending || !extUrl || autoOpened.current || pay?.method === 'PIX') return;
        autoOpened.current = true;
        void openPaymentUrl(extUrl).then(() => reload());
    }, [pending, extUrl, pay?.method, reload]);

    if (loading) return <Loading />;
    if (!order) return <ErrorState message={error ?? 'Pedido não encontrado'} onRetry={refresh} />;

    async function startPayment(m: PaymentMethod) {
        setBusy(true);
        setPayError(null);
        const r = await apiPost<PaymentDTO>(`orders/${encodeURIComponent(code)}/pay`, { method: m });
        setBusy(false);
        if (!r.success) { setPayError(r.msg); return; }
        setChanging(false);
        autoOpened.current = false;
        await reload();
    }

    function cancel() {
        Alert.alert('Cancelar pedido', 'Os itens reservados serão liberados. Deseja cancelar?', [
            { text: 'Não', style: 'cancel' },
            {
                text: 'Cancelar pedido', style: 'destructive', onPress: async () => {
                    const r = await apiPost(`orders/${encodeURIComponent(code)}/cancel`);
                    if (!r.success) Alert.alert('Não foi possível cancelar', r.msg);
                    void reload();
                },
            },
        ]);
    }

    async function copyPix(text: string) {
        await Clipboard.setStringAsync(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    }

    const pixImg = pay?.method === 'PIX' ? pixImageUri(pay.pixQrBase64) : null;
    const hasMembership = order.items.some(i => i.kind === 'MEMBERSHIP');
    const showPicker = pending && (changing || !pay);

    return (
        <>
            <Stack.Screen options={{ title: `Pedido ${order.code}` }} />
            <Screen onRefresh={refresh} refreshing={refreshing}>
                {order.status === 'PAID' ? (
                    <HeroBlue style={{ borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
                        <Display size={32} color="clubGold" center>Pagamento confirmado!</Display>
                        <Txt color="brandInk" center>{hasMembership ? 'Bem-vindo(a) ao quadro de sócios do Filtradores!' : order.tickets.length ? 'Seus ingressos estão logo abaixo.' : 'Obrigado pela compra!'}</Txt>
                        {hasMembership ? <Button title="Ver minha carteirinha" variant="accent" onPress={() => router.navigate('/card')} /> : null}
                    </HeroBlue>
                ) : null}

                <Card>
                    <Row style={{ justifyContent: 'space-between' }}>
                        <Txt weight="bold">Pedido {order.code}</Txt>
                        <Badge label={LABELS.orderStatus[order.status]} tone={ORDER_TONE[order.status]} />
                    </Row>
                    <Txt size={12} color="inkMuted">{formatDateTime(order.createdAt)}</Txt>
                    {order.items.map(i => (
                        <Row key={i.id} style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Txt style={{ flex: 1 }}>{i.quantity}x {i.name}</Txt>
                            <Txt weight="semibold">{formatMoney(i.totalCents)}</Txt>
                        </Row>
                    ))}
                    {order.discountCents > 0 ? (
                        <Row style={{ justifyContent: 'space-between' }}><Txt color="ok">Desconto</Txt><Txt color="ok">- {formatMoney(order.discountCents)}</Txt></Row>
                    ) : null}
                    <Row style={{ justifyContent: 'space-between' }}>
                        <Txt weight="bold">Total</Txt>
                        <Display size={22} color="brand">{formatMoney(order.totalCents)}</Display>
                    </Row>
                    {pending && order.expiresAt ? <Txt size={12} color="warn">Reservado até {formatDateTime(order.expiresAt)}</Txt> : null}
                </Card>

                {payError ? <Notice tone="danger" icon="alert-circle-outline" text={`Não foi possível iniciar o pagamento: ${payError}. Tente outra forma de pagamento.`} /> : null}

                {pending && pay && !changing ? (
                    <Card>
                        <SectionTitle>{LABELS.paymentMethod[pay.method]}</SectionTitle>
                        {pay.method === 'PIX' ? (
                            <View style={{ gap: spacing.md, alignItems: 'center' }}>
                                {pixImg ? (
                                    <View style={{ backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radius.md }}>
                                        <Image source={{ uri: pixImg }} style={{ width: 230, height: 230 }} contentFit="contain" />
                                    </View>
                                ) : pay.pixCopiaECola ? <QrCode value={pay.pixCopiaECola} size={230} /> : null}
                                {pay.pixCopiaECola ? (
                                    <>
                                        <Txt size={12} color="inkMuted" numberOfLines={2} selectable>{pay.pixCopiaECola}</Txt>
                                        <Button title={copied ? 'Código copiado!' : 'Copiar código PIX'} icon="copy-outline" onPress={() => copyPix(pay.pixCopiaECola!)} style={{ alignSelf: 'stretch' }} />
                                    </>
                                ) : null}
                                <Txt size={13} color="inkMuted" center>Abra o app do seu banco, escolha PIX › Copia e Cola (ou leia o QR) e confirme. Esta tela atualiza sozinha.</Txt>
                                {!pay.pixCopiaECola && !pixImg && extUrl ? <Button title="Abrir página do PIX" icon="open-outline" onPress={() => openPaymentUrl(extUrl).then(() => reload())} /> : null}
                            </View>
                        ) : extUrl ? (
                            <>
                                <Txt color="inkMuted">{pay.method === 'BOLETO' ? 'Abra o boleto para pagar no app do banco ou na lotérica.' : 'Conclua o pagamento na página segura. Ao voltar, esta tela atualiza sozinha.'}</Txt>
                                <Button title={pay.method === 'BOLETO' ? 'Abrir boleto' : 'Ir para o pagamento'} variant="accent" icon="open-outline" onPress={() => openPaymentUrl(extUrl).then(() => reload())} />
                            </>
                        ) : <Txt color="inkMuted">Aguardando a confirmação do pagamento...</Txt>}
                        {pay.expiresAt ? <Txt size={12} color="inkMuted">Válido até {formatDateTime(pay.expiresAt)}</Txt> : null}
                        <Row style={{ justifyContent: 'center', marginTop: 4 }}><Txt size={12} color="inkFaint">Verificando o pagamento automaticamente...</Txt></Row>
                    </Card>
                ) : null}

                {showPicker ? (
                    <Card>
                        <SectionTitle>{pay ? 'Trocar forma de pagamento' : 'Como você quer pagar?'}</SectionTitle>
                        {methods?.length ? <MethodPicker methods={methods} value={method} onChange={setMethod} /> : <Txt color="inkMuted">Nenhuma forma de pagamento disponível.</Txt>}
                        <Button title="Pagar" variant="accent" loading={busy} disabled={!method} onPress={() => method && startPayment(method)} />
                        {changing ? <Button title="Voltar" variant="ghost" onPress={() => setChanging(false)} /> : null}
                    </Card>
                ) : null}

                {pending ? (
                    <>
                        {pay && !changing ? <Button title="Trocar forma de pagamento" variant="outline" onPress={() => { setChanging(true); setMethod(null); }} /> : null}
                        <Button title="Cancelar pedido" variant="danger" onPress={cancel} />
                    </>
                ) : null}

                {order.tickets.length ? (
                    <>
                        <SectionTitle>Ingressos</SectionTitle>
                        {order.tickets.map(t => <TicketCard key={t.id} ticket={t} />)}
                    </>
                ) : null}
            </Screen>
        </>
    );
}
