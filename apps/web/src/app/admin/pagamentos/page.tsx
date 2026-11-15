'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Pagamentos (wrapper; useSearchParams exige Suspense)
 */
import { Suspense } from 'react';
import { Spinner } from '@/components/ui';
import Payments from '@/views/Admin/Payments';

export default function Page() {
    return <Suspense fallback={<Spinner />}><Payments /></Suspense>;
}
