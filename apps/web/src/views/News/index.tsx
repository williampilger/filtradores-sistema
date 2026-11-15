'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Feed de notícias (paginação "carregar mais"; posts exclusivos aparecem bloqueados)
 */
import { useCallback, useEffect, useState } from 'react';
import type { PostDTO } from '@filt/shared';
import API from '@/api';
import { Empty, Spinner } from '@/components/ui';
import { PostCard } from '@/components/site/PostCard';
import { Container, PageHero } from '@/components/site/Section';
import { useSession } from '@/hooks/useSession';

const PAGE_SIZE = 50; // padrão do servidor (paging)

export default function News() {
    const { session } = useSession();
    const [posts, setPosts] = useState<PostDTO[] | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [busy, setBusy] = useState(false);
    const userId = session?.user.id;

    const loadPage = useCallback(async (p: number) => {
        setBusy(true);
        const r = await API.public.feed(p);
        setBusy(false);
        const rows = r.success ? r.data : [];
        setPosts(prev => (p === 1 ? rows : [...(prev ?? []), ...rows.filter(x => !(prev ?? []).some(y => y.id === x.id))]));
        setHasMore(rows.length >= PAGE_SIZE);
        setPage(p);
    }, []);

    // recarrega ao entrar/sair: posts exclusivos dependem do usuário
    useEffect(() => { void loadPage(1); }, [loadPage, userId]);

    return (
        <>
            <PageHero kicker="Bastidores" title="Notícias" subtitle="Convocações, resultados, bastidores e tudo o que rola no Filtradores." />
            <Container className="max-w-3xl py-10">
                {posts === null ? <Spinner /> : posts.length === 0 ? <Empty>Nenhuma notícia publicada ainda.</Empty> : (
                    <div className="flex flex-col gap-6">
                        {posts.map(p => <PostCard key={p.id} post={p} />)}
                    </div>
                )}
                {hasMore && (
                    <div className="mt-8 text-center">
                        <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => void loadPage(page + 1)}>{busy ? 'Carregando...' : 'Carregar mais'}</button>
                    </div>
                )}
            </Container>
        </>
    );
}
