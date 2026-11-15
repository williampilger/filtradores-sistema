/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Minha lista de espera
 */
import { Alert, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { formatDateTime, LABELS, type WaitlistEntryDTO, type WaitlistStatus } from '@filt/shared';
import { apiDelete } from '@/api';
import { useApi } from '@/hooks/useApi';
import { Badge, Button, Card, Empty, ErrorState, Loading, Row, Txt } from '@/components/ui';
import { colors, spacing } from '@/theme';

const TONE: Record<WaitlistStatus, 'info' | 'ok' | 'neutral' | 'warn'> = { WAITING: 'info', NOTIFIED: 'ok', CONVERTED: 'neutral', EXPIRED: 'warn', CANCELED: 'neutral' };

export default function WaitlistScreen() {
    const { data, loading, error, refreshing, refresh, reload } = useApi<WaitlistEntryDTO[]>('me/waitlist');

    function cancel(e: WaitlistEntryDTO) {
        Alert.alert('Sair da lista de espera', `Deseja sair da lista de ${e.product.name} (${e.variant.name})?`, [
            { text: 'Não', style: 'cancel' },
            {
                text: 'Sair da lista', style: 'destructive', onPress: async () => {
                    const r = await apiDelete(`me/waitlist/${e.id}`);
                    if (!r.success) Alert.alert('Erro', r.msg);
                    void reload();
                },
            },
        ]);
    }

    if (loading) return <Loading />;
    if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
    return (
        <FlatList
            style={{ backgroundColor: colors.app }}
            data={data ?? []}
            keyExtractor={e => String(e.id)}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
            renderItem={({ item: e }) => (
                <Card>
                    <Row style={{ justifyContent: 'space-between' }}>
                        <Txt weight="bold" style={{ flex: 1 }}>{e.product.name}</Txt>
                        <Badge label={LABELS.waitlistStatus[e.status]} tone={TONE[e.status]} />
                    </Row>
                    <Txt color="inkMuted">{e.variant.name} · {e.quantity} un.{e.position ? ` · posição ${e.position}` : ''}</Txt>
                    {e.batch ? <Txt size={13} color="inkMuted">Lote: {e.batch.name} ({LABELS.batchStatus[e.batch.status]})</Txt> : null}
                    {e.status === 'NOTIFIED' && e.reservationExpiresAt ? <Txt size={13} color="ok" weight="semibold">Reservado para você até {formatDateTime(e.reservationExpiresAt)}</Txt> : null}
                    <Row>
                        {e.status === 'NOTIFIED' ? <Button small title="Comprar agora" variant="accent" onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: e.product.slug } })} /> : null}
                        {e.status === 'WAITING' || e.status === 'NOTIFIED' ? <Button small title="Sair da lista" variant="danger" onPress={() => cancel(e)} /> : null}
                    </Row>
                </Card>
            )}
            ListEmptyComponent={<Empty icon="hourglass-outline" text="Você não está em nenhuma lista de espera." />}
        />
    );
}
