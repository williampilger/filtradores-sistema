'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Evento (wrapper; useSearchParams exige Suspense)
 */
import { Suspense, use } from 'react';
import { Spinner } from '@/components/ui';
import EventDetail from '@/views/Admin/EventDetail';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <Suspense fallback={<Spinner />}><EventDetail id={Number(id)} /></Suspense>;
}
