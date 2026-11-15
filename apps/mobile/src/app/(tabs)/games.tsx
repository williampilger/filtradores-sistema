/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Jogos: próximos e anteriores (com placar)
 */
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import type { EventListItem } from '@filt/shared';
import { useApi } from '@/hooks/useApi';
import { EventCard } from '@/components/EventCard';
import { Chip, Empty, ErrorState, Loading, Row } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function GamesScreen() {
    const [past, setPast] = useState(false);
    const { data, loading, error, refreshing, refresh } = useApi<EventListItem[]>(past ? 'events?past=1' : 'events');

    return (
        <View style={{ flex: 1, backgroundColor: colors.app }}>
            <Row style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
                <Chip label="Próximos" selected={!past} onPress={() => setPast(false)} />
                <Chip label="Anteriores" selected={past} onPress={() => setPast(true)} />
            </Row>
            {loading ? <Loading /> : error && !data ? <ErrorState message={error} onRetry={refresh} /> : (
                <FlatList
                    data={data ?? []}
                    keyExtractor={e => String(e.id)}
                    renderItem={({ item }) => <EventCard event={item} />}
                    contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
                    ListEmptyComponent={<Empty icon="calendar-outline" text={past ? 'Nenhum jogo anterior.' : 'Nenhum jogo agendado no momento.'} />}
                />
            )}
        </View>
    );
}
