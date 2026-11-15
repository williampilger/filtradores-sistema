'use client';
/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Moldura das telas de autenticação (fundo azul do clube + cartão branco)
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ClubLogo } from './ClubLogo';
import { DemoBanner } from './DemoBanner';

export function AuthShell({ title, subtitle, children, wide }: { title: ReactNode, subtitle?: ReactNode, children: ReactNode, wide?: boolean }) {
    return (
        <main className="hero-blue relative flex min-h-dvh flex-col">
            <DemoBanner />
            <div className="club-stripes h-2" aria-hidden />
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
                <Link href="/" className="mb-5 flex flex-col items-center gap-2" aria-label="Voltar para o site">
                    <ClubLogo size="lg" />
                    <span className="display text-2xl">ACE Filtradores</span>
                </Link>
                <div className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'} rounded-2xl bg-surface p-6 text-ink shadow-2xl sm:p-8`}>
                    <h1 className="display text-3xl text-brand-deep">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
                    <div className="mt-5">{children}</div>
                </div>
                <Link href="/" className="mt-6 text-sm opacity-80 hover:opacity-100 hover:underline">← Voltar para o site</Link>
            </div>
        </main>
    );
}
