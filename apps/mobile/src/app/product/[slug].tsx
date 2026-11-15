/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Detalhe do produto: variações, preço de sócio, compra, encomenda (lote aberto) e lista de espera
 *  - Chamado na lista de espera (NOTIFIED): compra com `waitlistEntryId` (estoque reservado para o usuário)
 */
import { useEffect, useState } from 'react';
import { Alert, ScrollView, useWindowDimensions, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { formatDate, formatDateTime, formatMoney, LABELS, type ProductDetail, type VariantDTO } from '@filt/shared';
import { apiPost } from '@/api';
import { useApi } from '@/hooks/useApi';
import { useSession } from '@/session';
import { setCheckoutDraft } from '@/lib/cart';
import { RemoteImage } from '@/components/RemoteImage';
import { Badge, Button, Card, Chip, Display, ErrorState, Loading, Notice, Row, Screen, Stepper, Txt } from '@/components/ui';
import { spacing } from '@/theme';

export default function ProductScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const { hasToken, session } = useSession();
    const { width } = useWindowDimensions();
    const { data: p, loading, error, refresh, refreshing, reload } = useApi<ProductDetail>(`products/${encodeURIComponent(slug)}`);
    const [variantId, setVariantId] = useState<number | null>(null);
    const [qty, setQty] = useState(1);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (p && variantId === null) setVariantId((p.variants.find(v => v.active && v.available > 0) ?? p.variants.find(v => v.active))?.id ?? null);
    }, [p, variantId]);

    if (loading) return <Loading />;
    if (!p) return <ErrorState message={error ?? 'Produto não encontrado'} onRetry={refresh} />;

    const isMember = session?.membership?.status === 'ACTIVE';
    const v: VariantDTO | undefined = p.variants.find(x => x.id === variantId);
    const price = v ? (isMember && v.memberPriceCents !== null ? v.memberPriceCents : v.priceCents) : p.fromPriceCents;
    const entry = v ? p.myWaitlist.find(e => e.variant.id === v.id && (e.status === 'WAITING' || e.status === 'NOTIFIED')) : undefined;
    const onDemand = p.fulfillment === 'ON_DEMAND';
    // ON_DEMAND + UPFRONT: compra direta = encomenda paga | ON_DEMAND + ON_RELEASE: fila sem pagar (paga quando ficar pronto)
    const canPreorder = onDemand && !!p.openBatch && p.waitlistPayment === 'UPFRONT';
    const canQueue = onDemand && !!p.openBatch && p.waitlistPayment === 'ON_RELEASE' && p.waitlistEnabled;
    const inStock = !onDemand && !!v && v.active && v.available > 0;
    const maxQty = Math.max(1, Math.min(p.maxPerOrder, onDemand ? p.maxPerOrder : (v?.available ?? 1)));
    const images = p.imageUrls.length ? p.imageUrls : [p.imageUrl];

    function checkout(quantity: number, waitlistEntryId?: number) {
        if (!hasToken) { router.push('/login'); return; }
        if (!v) return;
        setCheckoutDraft({
            title: p!.name,
            lines: [{ item: { kind: 'PRODUCT', variantId: v.id, quantity, waitlistEntryId }, label: `${p!.name} - ${v.name}`, unitCents: price }],
        });
        router.push('/checkout');
    }

    async function joinWaitlist() {
        if (!hasToken) { router.push('/login'); return; }
        if (!v) return;
        setBusy(true);
        const r = await apiPost<{ id: number }>('waitlist', { variantId: v.id, quantity: qty });
        setBusy(false);
        Alert.alert(r.success ? 'Lista de espera' : 'Não foi possível entrar na lista', r.msg || (r.success ? 'Você entrou na lista de espera.' : ''));
        if (r.success) void reload();
    }

    let action: React.ReactNode;
    if (entry?.status === 'NOTIFIED') {
        action = (
            <>
                <Notice tone="ok" icon="notifications-outline" text={`Chegou a sua vez! ${entry.quantity} un. reservada(s) para você${entry.reservationExpiresAt ? ` até ${formatDateTime(entry.reservationExpiresAt)}` : ''}.`} />
                <Button title="Comprar agora" variant="accent" icon="bag-check-outline" onPress={() => checkout(entry.quantity, entry.id)} />
            </>
        );
    } else if (entry?.status === 'WAITING') {
        action = <Notice tone="info" icon="hourglass-outline" text={`Você está na lista de espera${entry.position ? ` (posição ${entry.position})` : ''}. Avisaremos quando chegar a sua vez.`} />;
    } else if (canPreorder || inStock) {
        action = (
            <>
                <Row style={{ justifyContent: 'space-between' }}>
                    <Txt weight="semibold">Quantidade</Txt>
                    <Stepper value={qty} min={1} max={maxQty} onChange={setQty} />
                </Row>
                <Button title={hasToken ? (canPreorder ? 'Encomendar' : 'Comprar') : 'Entrar para comprar'} variant="accent" icon="bag-handle-outline" disabled={!v} onPress={() => checkout(qty)} />
            </>
        );
    } else if (canQueue || (!onDemand && p.waitlistEnabled)) {
        action = (
            <>
                <Notice tone="neutral" icon="alert-circle-outline" text={canQueue
                    ? 'Item sob encomenda: entre na fila agora e pague só quando ficar pronto. Avisaremos você!'
                    : 'Esgotado no momento. Entre na lista de espera e avisaremos quando houver disponibilidade.'} />
                <Row style={{ justifyContent: 'space-between' }}>
                    <Txt weight="semibold">Quantidade</Txt>
                    <Stepper value={qty} min={1} max={Math.min(20, p.maxPerOrder)} onChange={setQty} />
                </Row>
                <Button title={canQueue ? 'Entrar na fila da encomenda' : 'Entrar na lista de espera'} variant="primary" icon="hourglass-outline" loading={busy} disabled={!v} onPress={joinWaitlist} />
            </>
        );
    } else {
        action = <Notice tone="neutral" icon="close-circle-outline" text={onDemand ? 'Encomendas fechadas no momento.' : 'Esgotado.'} />;
    }

    return (
        <>
            <Stack.Screen options={{ title: p.name }} />
            <Screen padded={false} onRefresh={refresh} refreshing={refreshing}>
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                    {images.map((url, i) => <RemoteImage key={`${url}-${i}`} url={url} style={{ width, height: width }} placeholderIcon="shirt-outline" />)}
                </ScrollView>
                <View style={{ padding: spacing.lg, gap: spacing.md }}>
                    <Row gap={6}>
                        {p.category ? <Badge label={p.category} tone="brand" /> : null}
                        {onDemand ? <Badge label={LABELS.fulfillment.ON_DEMAND} tone="gold" /> : null}
                    </Row>
                    <Display size={26}>{p.name}</Display>
                    <Row gap={8} style={{ alignItems: 'baseline' }}>
                        <Display size={28} color="brand">{formatMoney(price)}</Display>
                        {v && v.memberPriceCents !== null && v.memberPriceCents < v.priceCents && !isMember ? <Txt color="ok" weight="semibold">{formatMoney(v.memberPriceCents)} para sócios</Txt> : null}
                        {v && isMember && v.memberPriceCents !== null && v.memberPriceCents < v.priceCents ? <Txt color="inkMuted" style={{ textDecorationLine: 'line-through' }}>{formatMoney(v.priceCents)}</Txt> : null}
                    </Row>
                    {p.variants.length > 1 || (p.variants[0] && p.variants[0].name) ? (
                        <View style={{ gap: spacing.sm }}>
                            <Txt weight="semibold">Opções</Txt>
                            <Row style={{ flexWrap: 'wrap' }}>
                                {p.variants.filter(x => x.active).map(x => (
                                    <Chip key={x.id} label={x.name} selected={x.id === variantId} onPress={() => { setVariantId(x.id); setQty(1); }} />
                                ))}
                            </Row>
                            {v && !onDemand ? <Txt size={12} color="inkMuted">{v.available > 0 ? `${v.available} disponível(is)` : 'Sem estoque nesta opção'}</Txt> : null}
                        </View>
                    ) : null}
                    {(canPreorder || canQueue) && p.openBatch ? (
                        <Notice tone="info" icon="construct-outline" text={`Encomendas abertas: ${p.openBatch.name}${p.openBatch.closesAt ? ` (até ${formatDate(p.openBatch.closesAt)})` : ''}. ${LABELS.waitlistPayment[p.waitlistPayment]}.`} />
                    ) : null}
                    <Card>{action}</Card>
                    {p.description ? <Txt>{p.description}</Txt> : null}
                </View>
            </Screen>
        </>
    );
}
