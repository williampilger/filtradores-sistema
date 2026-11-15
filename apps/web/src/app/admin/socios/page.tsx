'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Sócios (wrapper; useSearchParams exige Suspense)
 */
import { Suspense } from 'react';
import { Spinner } from '@/components/ui';
import Members from '@/views/Admin/Members';

export default function Page() {
    return <Suspense fallback={<Spinner />}><Members /></Suspense>;
}
