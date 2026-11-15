'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Produto (wrapper; useSearchParams exige Suspense)
 */
import { Suspense, use } from 'react';
import { Spinner } from '@/components/ui';
import ProductDetail from '@/views/Admin/ProductDetail';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <Suspense fallback={<Spinner />}><ProductDetail id={Number(id)} /></Suspense>;
}
