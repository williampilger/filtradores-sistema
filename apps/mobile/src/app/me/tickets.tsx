/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Meus ingressos (próximos com QR grande / todos)
 */
import { useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import type { TicketDTO } from '@filt/shared';
import { useApi } from '@/hooks/useApi';
import { TicketCard } from '@/components/TicketCard';
import { Chip, Empty, ErrorState, Loading, Row } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function MyTicketsScreen() {
    const [all, setAll] = useState(false);
    const { data, loading, error, refreshing, refresh } = useApi<TicketDTO[]>(all ? 'me/tickets?scope=all' : 'me/tickets');
    return (
        <FlatList
            style={{ backgroundColor: colors.app }}
            data={loading ? [] : (data ?? [])}
            keyExtractor={t => String(t.id)}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            ListHeaderComponent={
                <Row>
                    <Chip label="Próximos" selected={!all} onPress={() => setAll(false)} />
                    <Chip label="Todos" selected={all} onPress={() => setAll(true)} />
                </Row>
            }
            renderItem={({ item }) => <TicketCard ticket={item} compact={all && item.status !== 'VALID'} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
            ListEmptyComponent={loading ? <Loading /> : error ? <ErrorState message={error} onRetry={refresh} /> : <Empty icon="ticket-outline" text="Você não tem ingressos para os próximos jogos." />}
        />
    );
}
