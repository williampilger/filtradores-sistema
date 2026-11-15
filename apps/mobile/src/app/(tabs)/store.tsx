/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Loja: grade de produtos
 */
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { formatMoney, type ProductListItem } from '@filt/shared';
import { useApi } from '@/hooks/useApi';
import { RemoteImage } from '@/components/RemoteImage';
import { Badge, Empty, ErrorState, Loading, Txt } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

function ProductTile({ p }: { p: ProductListItem }) {
    return (
        <Pressable
            onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: p.slug } })}
            style={({ pressed }) => [{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }, pressed && { opacity: 0.85 }]}
        >
            <RemoteImage url={p.imageUrl} style={{ width: '100%', aspectRatio: 1 }} placeholderIcon="shirt-outline" />
            <View style={{ padding: spacing.sm, gap: 4 }}>
                {p.soldOut ? <Badge label={p.waitlistEnabled ? 'Lista de espera' : 'Esgotado'} tone={p.waitlistEnabled ? 'info' : 'neutral'} />
                    : p.fulfillment === 'ON_DEMAND' ? <Badge label="Encomenda" tone="gold" /> : null}
                <Txt weight="semibold" numberOfLines={2}>{p.name}</Txt>
                <Txt color="brand" weight="bold">{formatMoney(p.fromPriceCents)}</Txt>
            </View>
        </Pressable>
    );
}

export default function StoreScreen() {
    const { data, loading, error, refreshing, refresh } = useApi<ProductListItem[]>('products');
    if (loading) return <Loading />;
    if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
    // quantidade ímpar: célula vazia no fim para a última não esticar
    const items: (ProductListItem | null)[] = data && data.length % 2 ? [...data, null] : (data ?? []);
    return (
        <FlatList
            style={{ backgroundColor: colors.app }}
            data={items}
            numColumns={2}
            keyExtractor={(p, i) => (p ? String(p.id) : `vazio-${i}`)}
            columnWrapperStyle={{ gap: spacing.md }}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            renderItem={({ item }) => <View style={{ flex: 1 }}>{item ? <ProductTile p={item} /> : null}</View>}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}
            ListEmptyComponent={<Empty icon="bag-handle-outline" text="A loja ainda não tem produtos." />}
        />
    );
}
