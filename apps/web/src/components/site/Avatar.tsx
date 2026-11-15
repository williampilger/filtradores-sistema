/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Avatar (foto ou iniciais)
 */
import { initials } from './helpers';

export function Avatar({ name, photoUrl, size = 36, className = '' }: { name: string, photoUrl?: string | null, size?: number, className?: string }) {
    const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
    if (photoUrl) return <img src={photoUrl} alt={name} style={style} className={`shrink-0 rounded-full object-cover ${className}`} />;
    return (
        <span style={style} className={`inline-flex shrink-0 items-center justify-center rounded-full bg-club-gold font-bold text-brand-deep ${className}`}>
            {initials(name)}
        </span>
    );
}
