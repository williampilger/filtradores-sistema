/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Minha conta (ingressos, sócio, carteirinha, pedidos, lista de espera, notificações, perfil, segurança)
 */
import type { Metadata } from 'next';
import Account from '@/views/Account';

export const metadata: Metadata = { title: 'Minha conta' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
    const sp = await searchParams;
    return <Account tab={Array.isArray(sp.aba) ? sp.aba[0] : sp.aba} />;
}
