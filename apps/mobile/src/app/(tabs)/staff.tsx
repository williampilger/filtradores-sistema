/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Portaria (staff): escolha do evento
 */
import { FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { formatDateTime, LABELS, type StaffEventDTO } from '@filt/shared';
import { useApi } from '@/hooks/useApi';
import { Counters } from '@/components/Counters';
import { Badge, Card, Display, Empty, ErrorState, Loading, Row, Txt } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function StaffScreen() {
    const { data, loading, error, refreshing, refresh } = useApi<StaffEventDTO[]>('staff/events', { pollMs: 30_000 });
    if (loading) return <Loading />;
    if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
    return (
        <FlatList
            style={{ backgroundColor: colors.app }}
            data={data ?? []}
            keyExtractor={e => String(e.id)}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
            ListHeaderComponent={<Txt color="inkMuted">Escolha o evento para validar entradas, vender ingressos ou acompanhar o público.</Txt>}
            renderItem={({ item }) => (
                <Card onPress={() => router.push({ pathname: '/gate/[eventId]', params: { eventId: String(item.id), title: item.title, slug: item.slug } })}>
                    <Row style={{ justifyContent: 'space-between' }}>
                        <Txt size={13} color="brand" weight="semibold">{formatDateTime(item.startsAt)}</Txt>
                        <Badge label={LABELS.eventStatus[item.status]} tone={item.status === 'PUBLISHED' ? 'ok' : 'neutral'} />
                    </Row>
                    <Display size={20}>{item.title}</Display>
                    {item.venue ? <Txt size={13} color="inkMuted">{item.venue}</Txt> : null}
                    <Counters c={item.counters} />
                </Card>
            )}
            ListEmptyComponent={<Empty icon="calendar-outline" text="Nenhum evento disponível para você nas próximas horas." />}
        />
    );
}
