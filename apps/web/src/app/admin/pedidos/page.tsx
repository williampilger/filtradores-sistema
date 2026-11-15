'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Pedidos (wrapper; useSearchParams exige Suspense)
 */
import { Suspense } from 'react';
import { Spinner } from '@/components/ui';
import Orders from '@/views/Admin/Orders';

export default function Page() {
    return <Suspense fallback={<Spinner />}><Orders /></Suspense>;
}
