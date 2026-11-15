'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Sócio (wrapper)
 */
import { use } from 'react';
import MemberDetail from '@/views/Admin/MemberDetail';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <MemberDetail id={Number(id)} />;
}
