'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Admin > Usuário (wrapper)
 */
import { use } from 'react';
import UserDetail from '@/views/Admin/UserDetail';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <UserDetail id={Number(id)} />;
}
