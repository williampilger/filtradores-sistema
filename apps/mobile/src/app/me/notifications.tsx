/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Notificações (marca todas como lidas ao abrir)
 */
import { useEffect, useRef } from 'react';
import { FlatList, Linking, RefreshControl, View } from 'react-native';
import { formatDateTime, type NotificationDTO } from '@filt/shared';
import { apiPost } from '@/api';
import { siteUrl } from '@/config';
import { useApi } from '@/hooks/useApi';
import { useSession } from '@/session';
import { Card, Empty, ErrorState, Loading, Row, Txt } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function NotificationsScreen() {
    const { refresh: refreshSession } = useSession();
    const { data, loading, error, refreshing, refresh } = useApi<NotificationDTO[]>('me/notifications');
    const marked = useRef(false);

    useEffect(() => {
        if (!data || marked.current || !data.some(n => !n.readAt)) return;
        marked.current = true;
        void apiPost('me/notifications').then(() => refreshSession());
    }, [data, refreshSession]);

    if (loading) return <Loading />;
    if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
    return (
        <FlatList
            style={{ backgroundColor: colors.app }}
            data={data ?? []}
            keyExtractor={n => String(n.id)}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
            renderItem={({ item: n }) => (
                <Card onPress={n.link ? () => void Linking.openURL(/^https?:/.test(n.link!) ? n.link! : siteUrl(n.link!)) : undefined}>
                    <Row style={{ alignItems: 'flex-start' }}>
                        {!n.readAt ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.clubRed, marginTop: 7 }} /> : null}
                        <View style={{ flex: 1, gap: 2 }}>
                            <Txt weight="bold">{n.title}</Txt>
                            {n.body ? <Txt color="inkMuted">{n.body}</Txt> : null}
                            <Txt size={12} color="inkFaint">{formatDateTime(n.createdAt)}</Txt>
                        </View>
                    </Row>
                </Card>
            )}
            ListEmptyComponent={<Empty icon="notifications-outline" text="Nenhuma notificação." />}
        />
    );
}
