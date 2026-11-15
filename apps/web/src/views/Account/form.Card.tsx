'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Carteirinha digital (QR rotativo)
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MemberCard as MemberCardDTO } from '@filt/shared';
import API from '@/api';
import { Spinner } from '@/components/ui';
import { MemberCard } from '@/components/site/MemberCard';
import { useSiteData } from '@/components/site/SiteData';

export function CardTab() {
    const { home } = useSiteData();
    const [card, setCard] = useState<MemberCardDTO | null | undefined>(undefined);

    useEffect(() => { API.me.card().then(r => setCard(r.success ? r.data : null)); }, []);

    if (card === undefined) return <Spinner />;
    if (card === null) return (
        <div className="hero-blue flex flex-col items-center gap-4 rounded-2xl p-8 text-center">
            <h2 className="display text-4xl">Sem carteirinha ativa</h2>
            <p className="max-w-md opacity-90">A carteirinha digital é liberada para sócios com o pagamento em dia. Se você acabou de pagar, aguarde a confirmação.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/socio" className="btn btn-accent btn-lg">Seja sócio</Link>
                <Link href="/minha-conta?aba=socio" className="btn btn-lg">Minha associação</Link>
            </div>
        </div>
    );

    return (
        <div className="py-2">
            <MemberCard card={card} logoUrl={home?.club.logoUrl} />
            <p className="mx-auto mt-4 max-w-sm text-center text-xs text-ink-muted">
                Funciona sem internet depois de aberta. Na portaria, mostre o QR com o brilho da tela no máximo.
            </p>
        </div>
    );
}
