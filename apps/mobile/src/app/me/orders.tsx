/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Meus pedidos
 */
import { FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { formatDateTime, formatMoney, LABELS, type OrderDTO } from '@filt/shared';
import { useApi } from '@/hooks/useApi';
import { ORDER_TONE } from '@/lib/payments';
import { Badge, Card, Empty, ErrorState, Loading, Row, Txt } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function MyOrdersScreen() {
    const { data, loading, error, refreshing, refresh } = useApi<OrderDTO[]>('me/orders');
    if (loading) return <Loading />;
    if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
    return (
        <FlatList
            style={{ backgroundColor: colors.app }}
            data={data ?? []}
            keyExtractor={o => String(o.id)}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
            renderItem={({ item: o }) => (
                <Card onPress={() => router.push({ pathname: '/order/[code]', params: { code: o.code } })}>
                    <Row style={{ justifyContent: 'space-between' }}>
                        <Txt weight="bold">{o.code}</Txt>
                        <Badge label={LABELS.orderStatus[o.status]} tone={ORDER_TONE[o.status]} />
                    </Row>
                    <Txt size={13} color="inkMuted" numberOfLines={2}>{o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}</Txt>
                    <Row style={{ justifyContent: 'space-between' }}>
                        <Txt size={12} color="inkMuted">{formatDateTime(o.createdAt)} · {LABELS.orderChannel[o.channel]}</Txt>
                        <Txt weight="bold" color="brand">{formatMoney(o.totalCents)}</Txt>
                    </Row>
                </Card>
            )}
            ListEmptyComponent={<Empty icon="receipt-outline" text="Você ainda não fez pedidos." />}
        />
    );
}
