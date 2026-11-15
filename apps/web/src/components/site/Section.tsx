/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Blocos de layout das páginas públicas (título de seção, cabeçalho azul de página)
 */
import type { ReactNode } from 'react';

export function SectionTitle({ kicker, title, action, light }: { kicker?: ReactNode, title: ReactNode, action?: ReactNode, light?: boolean }) {
    return (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
                {kicker && <div className={`mb-1 text-xs font-bold uppercase tracking-[.2em] ${light ? 'text-club-gold' : 'text-club-red'}`}>{kicker}</div>}
                <h2 className={`display text-3xl sm:text-4xl ${light ? 'text-brand-ink' : 'text-brand-deep'}`}>{title}</h2>
            </div>
            {action}
        </div>
    );
}

/** Cabeçalho azul das páginas internas (com a faixa listrada embaixo) */
export function PageHero({ kicker, title, subtitle, children }: { kicker?: ReactNode, title: ReactNode, subtitle?: ReactNode, children?: ReactNode }) {
    return (
        <section className="hero-blue">
            <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
                {kicker && <div className="mb-2 text-xs font-bold uppercase tracking-[.25em] text-club-gold">{kicker}</div>}
                <h1 className="display text-5xl sm:text-6xl">{title}</h1>
                {subtitle && <p className="mt-3 max-w-2xl text-base opacity-90 sm:text-lg">{subtitle}</p>}
                {children}
            </div>
            <div className="club-stripes h-2" aria-hidden />
        </section>
    );
}

export const Container = ({ children, className = '' }: { children: ReactNode, className?: string }) => <div className={`mx-auto max-w-6xl px-4 ${className}`}>{children}</div>;
