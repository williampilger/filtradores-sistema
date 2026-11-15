/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Entrar
 */
import type { Metadata } from 'next';
import { Login } from '@/views/Auth';

export const metadata: Metadata = { title: 'Entrar' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Page({ searchParams }: Props) {
    const sp = await searchParams;
    return <Login next={str(sp.next)} />;
}
