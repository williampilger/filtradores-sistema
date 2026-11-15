/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Convite
 */
import type { Metadata } from 'next';
import { AcceptInvite } from '@/views/Auth';

export const metadata: Metadata = { title: 'Convite' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Page({ searchParams }: Props) {
    const sp = await searchParams;
    return <AcceptInvite token={str(sp.token)} />;
}
