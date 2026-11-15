/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Verificação em duas etapas (validar no login / cadastrar)
 */
import type { Metadata } from 'next';
import TwoFactor from '@/views/TwoFactor';

export const metadata: Metadata = { title: 'Verificação em duas etapas' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Page({ searchParams }: Props) {
    const sp = await searchParams;
    return <TwoFactor next={str(sp.next)} setup={str(sp.setup) === '1'} />;
}
