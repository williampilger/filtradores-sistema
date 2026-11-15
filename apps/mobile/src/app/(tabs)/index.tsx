/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Início: chamada de sócio, próximo jogo e feed (fixados primeiro)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import type { PostDTO, PublicHome } from '@filt/shared';
import { apiGet } from '@/api';
import { useSession } from '@/session';
import { NextMatch } from '@/components/EventCard';
import { PostCard } from '@/components/PostCard';
import { Button, ClubStripes, Display, Empty, ErrorState, HeroBlue, Loading, SectionTitle, Txt } from '@/components/ui';
import { colors, spacing } from '@/theme';

const PAGE_SIZE = 10;

export default function HomeScreen() {
    const { session } = useSession();
    const [home, setHome] = useState<PublicHome | null>(null);
    const [posts, setPosts] = useState<PostDTO[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const busy = useRef(false);

    const load = useCallback(async () => {
        const [h, f] = await Promise.all([apiGet<PublicHome>('public/home'), apiGet<PostDTO[]>(`feed?page=1&pageSize=${PAGE_SIZE}`)]);
        if (h.success) setHome(h.data);
        if (f.success) { setPosts(f.data); setPage(1); setHasMore(f.data.length === PAGE_SIZE); }
        setError(!h.success && !f.success ? h.msg : null);
        setLoading(false);
        setRefreshing(false);
    }, []);

    // recarrega quando muda o login (posts exclusivos)
    useEffect(() => { void load(); }, [load, session?.user.id, session?.membership?.status]);

    async function more() {
        if (!hasMore || busy.current) return;
        busy.current = true;
        setLoadingMore(true);
        const next = page + 1;
        const r = await apiGet<PostDTO[]>(`feed?page=${next}&pageSize=${PAGE_SIZE}`);
        if (r.success) {
            setPosts(p => [...p, ...r.data.filter(x => !p.some(y => y.id === x.id))]);
            setPage(next);
            setHasMore(r.data.length === PAGE_SIZE);
        }
        setLoadingMore(false);
        busy.current = false;
    }

    if (loading) return <Loading />;
    if (error && !home) return <ErrorState message={error} onRetry={() => { setLoading(true); void load(); }} />;

    const next = home?.events[0] ?? null;
    const isMember = session?.membership?.status === 'ACTIVE';

    return (
        <FlatList
            style={{ backgroundColor: colors.app }}
            data={posts}
            keyExtractor={p => String(p.id)}
            renderItem={({ item }) => <View style={{ paddingHorizontal: spacing.lg }}><PostCard post={item} /></View>}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            onEndReached={more}
            onEndReachedThreshold={0.4}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.brand} colors={[colors.brand]} />}
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            ListHeaderComponent={
                <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
                    {!isMember ? (
                        <HeroBlue style={{ padding: spacing.xl, gap: spacing.sm }}>
                            <Display size={34} color="brandInk">Seja sócio</Display>
                            <Txt color="brandInk">Descontos em ingressos e na loja, entrada com a carteirinha e conteúdo exclusivo.</Txt>
                            <Button title="Conheça os planos" variant="accent" onPress={() => router.push('/plans')} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
                        </HeroBlue>
                    ) : (
                        <HeroBlue style={{ padding: spacing.lg }}>
                            <Display size={22} color="brandInk">Olá, {session?.user.name.split(' ')[0]}!</Display>
                            <Txt color="sidebarInk">Sócio {session?.membership?.plan.name} · Bora, Filtradores!</Txt>
                        </HeroBlue>
                    )}
                    <ClubStripes height={8} />
                    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
                        {next ? <NextMatch event={next} /> : null}
                        <SectionTitle>Notícias</SectionTitle>
                    </View>
                </View>
            }
            ListEmptyComponent={<Empty icon="newspaper-outline" text="Nenhuma publicação ainda." />}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brand} style={{ margin: spacing.lg }} /> : undefined}
        />
    );
}
