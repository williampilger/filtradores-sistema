'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Vitrine da loja (filtro por categoria)
 */
import { useEffect, useMemo, useState } from 'react';
import type { ProductListItem } from '@filt/shared';
import API from '@/api';
import { Empty, Spinner } from '@/components/ui';
import { ProductCard } from '@/components/site/ProductCard';
import { Container, PageHero } from '@/components/site/Section';

export default function Store() {
    const [products, setProducts] = useState<ProductListItem[] | null>(null);
    const [cat, setCat] = useState<string | null>(null);

    useEffect(() => { API.public.products().then(r => setProducts(r.success ? r.data : [])); }, []);

    const categories = useMemo(() => [...new Set((products ?? []).map(p => p.category).filter((c): c is string => !!c))], [products]);
    const shown = (products ?? []).filter(p => !cat || p.category === cat);

    return (
        <>
            <PageHero kicker="Loja oficial" title="Vista o manto" subtitle="Camisas, agasalhos e acessórios do Filtradores. Sócio em dia tem desconto!" />
            <Container className="py-10">
                {categories.length > 1 && (
                    <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Categorias">
                        {[null, ...categories].map(c => (
                            <button key={c ?? 'all'} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}
                                className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${cat === c ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface text-ink hover:bg-surface-hover'}`}>
                                {c ?? 'Todos'}
                            </button>
                        ))}
                    </div>
                )}
                {products === null ? <Spinner /> : shown.length === 0 ? <Empty>Nenhum produto disponível no momento. Volte em breve!</Empty> : (
                    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                        {shown.map(p => <ProductCard key={p.id} product={p} />)}
                    </div>
                )}
            </Container>
        </>
    );
}
