/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Escudo do clube (arquivo enviado nas configurações) ou o escudo provisório padrão (DEFAULT_LOGO_URL).
 *              Sobre fundo azul o escudo fica dentro de um círculo branco (como no avatar do Instagram).
 */
import { DEFAULT_LOGO_URL, initials } from './helpers';

const SIZES = { sm: 'h-9 w-9 text-sm', md: 'h-14 w-14 text-lg', lg: 'h-24 w-24 text-3xl', xl: 'h-36 w-36 text-5xl', hero: 'h-48 w-48 text-6xl lg:h-64 lg:w-64 lg:text-7xl' } as const;

export function ClubLogo({ logoUrl, size = 'md', className = '' }: { logoUrl?: string | null, size?: keyof typeof SIZES, className?: string }) {
    return (
        <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface ring-2 ring-club-gold ${SIZES[size]} ${className}`}>
            <img src={logoUrl || DEFAULT_LOGO_URL} alt="Escudo do ACE Filtradores" className="h-[86%] w-[86%] object-contain" />
        </span>
    );
}

/** "Escudo" genérico do adversário (iniciais) */
export function OpponentCrest({ name, size = 'md' }: { name: string | null, size?: keyof typeof SIZES }) {
    return (
        <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-soft ring-2 ring-line ${SIZES[size]}`}>
            <span className="display text-brand-strong">{initials(name)}</span>
        </span>
    );
}

/** Marca textual do cabeçalho */
export function Wordmark({ logoUrl }: { logoUrl?: string | null }) {
    return (
        <span className="inline-flex items-center gap-2">
            <ClubLogo logoUrl={logoUrl} size="sm" />
            <span className="leading-none">
                <span className="display block text-xl text-brand-ink">Filtradores</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[.2em] text-club-gold">ACE · Futsal</span>
            </span>
        </span>
    );
}
