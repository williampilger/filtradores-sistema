/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Tema do app (identidade visual da ACE Filtradores - ver docs/identidade-visual.md)
 *
 * ⚠️ FONTE ÚNICA das cores do app. NÃO usar cores fora desta paleta nas telas.
 *    Os valores espelham 1:1 os tokens de apps/web/src/app/globals.css (`--color-<token>` -> `colors.<tokenEmCamelCase>`).
 *    Se precisar de uma cor nova, criar lá E aqui, com nome que remeta à função.
 */

export const colors = {
    // Marca - azul royal (cor dominante das artes do clube)
    brand: '#1b3fd1',         // --color-brand
    brandStrong: '#102c9e',   // --color-brand-strong
    brandDeep: '#0a1c66',     // --color-brand-deep
    brandSoft: '#e6ebfc',     // --color-brand-soft
    brandInk: '#ffffff',      // --color-brand-ink
    // Escudo / uniforme
    clubRed: '#d62631',       // --color-club-red
    clubRedDeep: '#8f1d22',   // --color-club-red-deep
    clubGold: '#f5b700',      // --color-club-gold
    clubOrange: '#e8891b',    // --color-club-orange
    brandAccent: '#f5b700',   // --color-brand-accent

    // Superfícies
    app: '#f2f4fa',           // --color-app
    surface: '#ffffff',       // --color-surface
    surfaceAlt: '#f6f8fb',    // --color-surface-alt
    surfaceHover: '#eaf1fb',  // --color-surface-hover
    header: '#0a1c66',        // --color-header
    headerInk: '#ffffff',     // --color-header-ink
    sidebar: '#102c9e',       // --color-sidebar
    sidebarInk: '#d3dcfa',    // --color-sidebar-ink
    sidebarActive: '#f5b700', // --color-sidebar-active

    // Linhas
    line: '#d9dee7',          // --color-line
    lineStrong: '#b6c0ce',    // --color-line-strong

    // Texto
    ink: '#17202e',           // --color-ink
    inkMuted: '#5b6878',      // --color-ink-muted
    inkFaint: '#93a0ae',      // --color-ink-faint
    inkInverse: '#ffffff',    // --color-ink-inverse

    // Estados (NÃO usar o vermelho do clube para erro)
    ok: '#1e9e5a',            // --color-ok
    okSoft: '#e2f5ea',        // --color-ok-soft
    warn: '#c98a00',          // --color-warn
    warnSoft: '#fff4d6',      // --color-warn-soft
    danger: '#d13b3b',        // --color-danger
    dangerSoft: '#fde6e6',    // --color-danger-soft
    info: '#6b5bd2',          // --color-info
    infoSoft: '#ece9fb',      // --color-info-soft

    transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;

/** Aplica transparência a um token (#rrggbb -> rgba). Ex.: alpha('brandDeep', .6) para véus sobre fotos. */
export function alpha(token: ColorToken, a: number): string {
    const hex = colors[token];
    if (!hex.startsWith('#')) return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Famílias carregadas em src/app/_layout.tsx (@expo-google-fonts) */
export const fonts = {
    display: 'Oswald_700Bold',
    displaySemi: 'Oswald_600SemiBold',
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
} as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/**
 * Estilo "display" (títulos condensados, pesados, itálicos e em caixa alta - `.display` no web).
 * O Oswald não tem itálico no Google Fonts: o web usa oblíquo sintético; aqui inclinamos com skewX
 * (o iOS não sintetiza itálico de fonte customizada).
 */
export const displayText = {
    fontFamily: fonts.display,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    transform: [{ skewX: '-8deg' }],
} as const;
