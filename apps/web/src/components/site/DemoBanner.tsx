/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Faixa "ambiente de demonstração" (NEXT_PUBLIC_DEMO_MODE=true)
 *
 * Sem props e sem dependências: serve em server e client components (site, auth, portaria e painel).
 * Altura fixa de 24 px (h-6): telas em tela cheia (position: fixed) devem descontar com `DEMO_MODE ? 'top-6' : 'top-0'`.
 */

/** Variável pública: o Next a embute no bundle no build */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function DemoBanner() {
    if (!DEMO_MODE) return null;
    return (
        <div role="status" className="sticky top-0 z-[60] flex h-6 items-center justify-center bg-club-gold px-2 text-brand-deep">
            <span className="display truncate text-xs !tracking-wider">AMBIENTE DE DEMONSTRAÇÃO · dados fictícios</span>
        </div>
    );
}

export default DemoBanner;
