/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Gerador de imagens ILUSTRATIVAS para os dados de demonstração (SVG -> WebP via sharp)
 *
 * - Nada é baixado da internet: retratos são silhuetas ilustradas (sem rostos/pessoas reais).
 * - TODAS as imagens levam a marca d'água "DADOS DE EXEMPLO".
 * - Cores seguem a identidade visual (docs/identidade-visual.md). Hex aqui é permitido: são imagens, não UI.
 */
import sharp from 'sharp';

const C = { blue: '#1b3fd1', strong: '#102c9e', deep: '#0a1c66', red: '#d62631', gold: '#f5b700', white: '#ffffff', ink: '#17202e' };
const FONT = `'Oswald', 'Liberation Sans Narrow', 'Nimbus Sans Narrow', 'DejaVu Sans Condensed', 'DejaVu Sans', sans-serif`;
const SKINS = ['#f1c7a5', '#e0ac85', '#c68a5e', '#8d5a3b', '#5e3b26', '#f5d5bc'];
const HAIRS = ['#2b1d14', '#4a3222', '#0f0f0f', '#7a5230', '#b88a4a', '#3b3b3b'];
const BG_TONES = ['#1b3fd1', '#102c9e', '#d62631', '#0a1c66', '#2c5be0', '#8f1d22'];

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));

/** PRNG determinístico (as imagens saem iguais a cada execução do seed) */
export function rng(seed: number) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 10_000) / 10_000; };
}

function watermark(w: number, h: number, dark = false): string {
    const fill = dark ? C.ink : C.white;
    const rows: string[] = [];
    for (let y = -h; y < h * 2; y += 170) {
        for (let x = -w; x < w * 2; x += 520) {
            rows.push(`<text x="${x}" y="${y}" font-family="${FONT}" font-size="34" font-weight="700" font-style="italic" fill="${fill}" fill-opacity="${dark ? 0.1 : 0.16}">DADOS DE EXEMPLO</text>`);
        }
    }
    return `<g transform="rotate(-24 ${w / 2} ${h / 2})">${rows.join('')}</g>
<rect x="0" y="${h - 34}" width="${w}" height="34" fill="${C.gold}" fill-opacity="0.92"/>
<text x="${w / 2}" y="${h - 11}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" font-style="italic" fill="${C.deep}">IMAGEM ILUSTRATIVA · DADOS DE EXEMPLO</text>`;
}

const heroBg = (w: number, h: number) => `
<defs><radialGradient id="hero" cx="0.85" cy="0" r="1.3"><stop offset="0" stop-color="${C.blue}"/><stop offset="0.55" stop-color="${C.strong}"/><stop offset="1" stop-color="${C.deep}"/></radialGradient></defs>
<rect width="${w}" height="${h}" fill="url(#hero)"/>`;

const stripes = (w: number, h: number, y: number) => `
<polygon points="0,${y + 60} ${w},${y - 40} ${w},${y - 10} 0,${y + 90}" fill="${C.white}"/>
<polygon points="0,${y + 90} ${w},${y - 10} ${w},${y + 22} 0,${y + 122}" fill="${C.red}"/>
<polygon points="0,${y + 122} ${w},${y + 22} ${w},${y + 34} 0,${y + 134}" fill="${C.white}"/>`;

async function toWebp(svg: string, w: number, h: number): Promise<Buffer> {
    return sharp(Buffer.from(svg)).resize(w, h).webp({ quality: 82 }).toBuffer();
}

/** silhueta ilustrada (cabeça + ombros com camisa listrada) */
function person(cx: number, top: number, scale: number, skin: string, hair: string, jersey: { base: string, stripe: string }, number?: number): string {
    const s = scale;
    return `<g transform="translate(${cx} ${top}) scale(${s})">
  <path d="M-190,420 C-180,300 -110,250 0,250 C110,250 180,300 190,420 L190,520 L-190,520 Z" fill="${jersey.base}"/>
  <path d="M-60,250 L-40,520 L-10,520 L-25,250 Z" fill="${jersey.stripe}"/>
  <path d="M60,250 L40,520 L10,520 L25,250 Z" fill="${jersey.stripe}"/>
  <path d="M-190,420 C-180,330 -150,290 -110,270 L-120,520 L-190,520 Z" fill="${C.blue}"/>
  <path d="M190,420 C180,330 150,290 110,270 L120,520 L190,520 Z" fill="${C.blue}"/>
  <path d="M-38,250 Q0,295 38,250 Z" fill="${skin}"/>
  <rect x="-34" y="190" width="68" height="70" rx="20" fill="${skin}"/>
  <ellipse cx="0" cy="130" rx="92" ry="108" fill="${skin}"/>
  <path d="M-94,120 C-96,40 -40,10 0,10 C50,10 98,40 94,120 C80,80 50,62 0,64 C-50,62 -80,80 -94,120 Z" fill="${hair}"/>
  ${number !== undefined ? `<text x="0" y="420" text-anchor="middle" font-family="${FONT}" font-size="110" font-weight="700" fill="${C.blue}" fill-opacity="0.85">${number}</text>` : ''}
</g>`;
}

export async function playerPortrait(i: number, name: string, number: number | null, positionLabel: string): Promise<Buffer> {
    const W = 600, H = 750;
    const r = rng(1000 + i);
    const skin = SKINS[Math.floor(r() * SKINS.length)], hair = HAIRS[Math.floor(r() * HAIRS.length)];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${heroBg(W, H)}
${stripes(W, H, 560)}
<text x="${W - 30}" y="230" text-anchor="end" font-family="${FONT}" font-size="260" font-weight="700" font-style="italic" fill="${C.white}" fill-opacity="0.12">${number ?? ''}</text>
${person(300, 150, 1.05, skin, hair, { base: C.white, stripe: C.red }, number ?? undefined)}
<rect x="0" y="${H - 170}" width="${W}" height="136" fill="${C.deep}" fill-opacity="0.82"/>
<text x="30" y="${H - 105}" font-family="${FONT}" font-size="48" font-weight="700" font-style="italic" fill="${C.white}">${esc(name.toUpperCase())}</text>
<text x="30" y="${H - 58}" font-family="${FONT}" font-size="30" font-weight="700" font-style="italic" fill="${C.gold}">${esc(positionLabel.toUpperCase())}${number != null ? ` · Nº ${number}` : ''}</text>
${watermark(W, H)}
</svg>`;
    return toWebp(svg, W, H);
}

/** foto de perfil ilustrada (sócios/staff) */
export async function memberAvatar(i: number, name: string): Promise<Buffer> {
    const W = 480, H = 480;
    const r = rng(5000 + i);
    const bg = BG_TONES[Math.floor(r() * BG_TONES.length)];
    const skin = SKINS[Math.floor(r() * SKINS.length)], hair = HAIRS[Math.floor(r() * HAIRS.length)];
    const shirt = [C.white, C.blue, C.red, C.gold, '#2d2d2d'][Math.floor(r() * 5)];
    const initials = name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${bg}"/>
<text x="${W - 20}" y="110" text-anchor="end" font-family="${FONT}" font-size="110" font-weight="700" fill="${C.white}" fill-opacity="0.18">${esc(initials)}</text>
${person(240, 60, 0.9, skin, hair, { base: shirt, stripe: shirt === C.white ? C.blue : C.white })}
<g transform="rotate(-24 ${W / 2} ${H / 2})"><text x="${W / 2}" y="${H / 2 + 10}" text-anchor="middle" font-family="${FONT}" font-size="46" font-weight="700" font-style="italic" fill="${C.white}" fill-opacity="0.35">EXEMPLO</text></g>
<rect x="0" y="${H - 30}" width="${W}" height="30" fill="${C.gold}" fill-opacity="0.92"/>
<text x="${W / 2}" y="${H - 9}" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="700" font-style="italic" fill="${C.deep}">FOTO ILUSTRATIVA · EXEMPLO</text>
</svg>`;
    return toWebp(svg, W, H);
}

const initialsOf = (s: string) => s.replace(/\(.*?\)/g, '').split(/\s+/).filter(w => w.length > 2 || /^[A-Z]{2,}$/.test(w)).slice(0, 3).map(w => w[0]).join('').toUpperCase();

function badge(cx: number, cy: number, r: number, label: string, fill: string, ring: string) {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.white}"/><circle cx="${cx}" cy="${cy}" r="${r - 10}" fill="${fill}" stroke="${ring}" stroke-width="8"/>
<text x="${cx}" y="${cy + r * 0.2}" text-anchor="middle" font-family="${FONT}" font-size="${r * 0.55}" font-weight="700" font-style="italic" fill="${C.white}">${esc(label)}</text>`;
}

export async function eventCover(opponent: string, dateLabel: string, venue: string, competition: string, score?: { home: number, away: number }): Promise<Buffer> {
    const W = 1200, H = 630;
    const opp = initialsOf(opponent) || 'ADV';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${heroBg(W, H)}
${stripes(W, H, 470)}
<text x="60" y="90" font-family="${FONT}" font-size="34" font-weight="700" font-style="italic" fill="${C.gold}">${esc(competition.toUpperCase())}</text>
<text x="60" y="${score ? 175 : 180}" font-family="${FONT}" font-size="${score ? 84 : 92}" font-weight="700" font-style="italic" fill="${C.white}">${score ? 'FIM DE JOGO' : 'DIA DE JOGO'}</text>
${badge(250, 330, 95, 'ACEF', C.blue, C.gold)}
${badge(950, 330, 95, opp, '#3a3a3a', C.white)}
${score
        ? `<text x="600" y="375" text-anchor="middle" font-family="${FONT}" font-size="150" font-weight="700" font-style="italic" fill="${C.white}">${score.home}  x  ${score.away}</text>`
        : `<text x="600" y="365" text-anchor="middle" font-family="${FONT}" font-size="120" font-weight="700" font-style="italic" fill="${C.white}">X</text>`}
<text x="600" y="445" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="700" font-style="italic" fill="${C.white}">${esc(`FILTRADORES  ×  ${opponent.toUpperCase()}`)}</text>
<text x="60" y="${H - 60}" font-family="${FONT}" font-size="30" font-weight="700" font-style="italic" fill="${C.deep}">${esc(`${dateLabel} · ${venue}`.toUpperCase())}</text>
${watermark(W, H)}
</svg>`;
    return toWebp(svg, W, H);
}

/** "foto" ilustrada de lance de futsal (quadra, gol, bola, jogadores, torcida) */
export async function gamePhoto(seed: number, caption: string, awayColor = '#3a3a3a'): Promise<Buffer> {
    const W = 1200, H = 800;
    const r = rng(9000 + seed);
    const crowd: string[] = [];
    for (let i = 0; i < 260; i++) {
        const x = r() * W, y = 20 + r() * 150;
        crowd.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(6 + r() * 7).toFixed(1)}" fill="${[C.blue, C.white, C.red, '#555', C.gold][Math.floor(r() * 5)]}" fill-opacity="0.85"/>`);
    }
    const players: string[] = [];
    for (let i = 0; i < 5; i++) {
        const home = i % 2 === 0;
        const x = 120 + r() * 960, y = 300 + r() * 260, s = 0.32 + r() * 0.18;
        const skin = SKINS[Math.floor(r() * SKINS.length)];
        players.push(`<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)}) rotate(${((r() - 0.5) * 20).toFixed(0)})">
  <rect x="-60" y="380" width="40" height="230" rx="18" fill="${skin}"/><rect x="20" y="380" width="40" height="230" rx="18" fill="${skin}" transform="rotate(${((r() - 0.5) * 40).toFixed(0)} 40 380)"/>
  <rect x="-80" y="330" width="160" height="90" rx="20" fill="${home ? C.blue : '#222'}"/>
  ${person(0, 0, 0.55, skin, HAIRS[Math.floor(r() * HAIRS.length)], { base: home ? C.white : awayColor, stripe: home ? C.red : '#999' })}
</g>`);
    }
    const bx = 200 + r() * 800, by = 520 + r() * 120;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8662f"/><stop offset="1" stop-color="#d68a4a"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="#2a2f3a"/>
${crowd.join('')}
<rect x="0" y="190" width="${W}" height="30" fill="${C.blue}"/>
<text x="40" y="212" font-family="${FONT}" font-size="22" font-weight="700" font-style="italic" fill="${C.white}">ACE FILTRADORES · GINÁSIO DO MORANGÃO · PATROCINADOR EXEMPLO · ACE FILTRADORES · GINÁSIO DO MORANGÃO</text>
<polygon points="0,220 ${W},220 ${W},${H} 0,${H}" fill="url(#floor)"/>
${Array.from({ length: 14 }, (_, i) => `<line x1="0" y1="${230 + i * 42}" x2="${W}" y2="${230 + i * 42}" stroke="#a65a28" stroke-width="2" stroke-opacity="0.5"/>`).join('')}
<line x1="600" y1="220" x2="600" y2="${H}" stroke="${C.white}" stroke-width="6"/>
<ellipse cx="600" cy="520" rx="170" ry="80" fill="none" stroke="${C.white}" stroke-width="6"/>
<path d="M0,330 Q180,360 160,520 Q150,650 0,690" fill="${C.blue}" fill-opacity="0.35" stroke="${C.white}" stroke-width="6"/>
<rect x="0" y="420" width="40" height="190" fill="none" stroke="${C.white}" stroke-width="10"/>
${players.join('')}
<circle cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" r="22" fill="${C.white}" stroke="${C.ink}" stroke-width="3"/><path d="M${(bx - 10).toFixed(0)},${(by - 8).toFixed(0)} l10,-6 l10,6 l-4,11 h-12 z" fill="${C.ink}"/>
<rect x="0" y="${H - 110}" width="${W}" height="76" fill="${C.deep}" fill-opacity="0.75"/>
<text x="40" y="${H - 60}" font-family="${FONT}" font-size="34" font-weight="700" font-style="italic" fill="${C.white}">${esc(caption.toUpperCase())}</text>
${watermark(W, H)}
</svg>`;
    return toWebp(svg, W, H);
}

export type ProductKind = 'shirt' | 'shirt-blue' | 'training' | 'cap' | 'mug' | 'jacket' | 'scarf' | 'bottle';

function productShape(kind: ProductKind): string {
    switch (kind) {
        case 'shirt': case 'shirt-blue': case 'training': {
            const base = kind === 'shirt' ? C.white : kind === 'shirt-blue' ? C.blue : '#2d2d2d';
            const stripe = kind === 'shirt' ? C.red : kind === 'shirt-blue' ? C.white : C.gold;
            return `<path d="M260,170 L340,140 Q400,190 460,140 L540,170 L650,260 L590,340 L540,300 L540,660 L260,660 L260,300 L210,340 L150,260 Z" fill="${base}" stroke="${C.deep}" stroke-width="6"/>
<path d="M330,150 L345,660 L375,660 L362,145 Z" fill="${stripe}"/><path d="M470,150 L455,660 L425,660 L438,145 Z" fill="${stripe}"/>
<path d="M340,140 Q400,200 460,140" fill="none" stroke="${C.deep}" stroke-width="10"/>
<circle cx="470" cy="250" r="26" fill="${C.gold}" stroke="${C.red}" stroke-width="5"/><text x="400" y="420" text-anchor="middle" font-family="${FONT}" font-size="90" font-weight="700" font-style="italic" fill="${kind === 'shirt' ? C.blue : C.white}">10</text>`;
        }
        case 'jacket':
            return `<path d="M250,170 L340,140 Q400,170 460,140 L550,170 L680,560 L610,590 L545,330 L545,670 L255,670 L255,330 L190,590 L120,560 Z" fill="${C.deep}" stroke="${C.ink}" stroke-width="6"/>
<line x1="400" y1="165" x2="400" y2="670" stroke="${C.gold}" stroke-width="8"/><path d="M255,300 L545,300" stroke="${C.red}" stroke-width="18"/><path d="M255,330 L545,330" stroke="${C.white}" stroke-width="10"/>
<text x="400" y="480" text-anchor="middle" font-family="${FONT}" font-size="80" font-weight="700" font-style="italic" fill="${C.white}">ACEF</text>`;
        case 'cap':
            return `<path d="M220,470 Q230,250 400,240 Q570,250 580,470 Z" fill="${C.blue}" stroke="${C.deep}" stroke-width="6"/>
<path d="M200,470 Q400,430 650,500 Q600,560 420,540 Q300,530 200,470 Z" fill="${C.deep}"/>
<circle cx="400" cy="245" r="14" fill="${C.red}"/><text x="400" y="400" text-anchor="middle" font-family="${FONT}" font-size="90" font-weight="700" font-style="italic" fill="${C.white}">ACEF</text>`;
        case 'mug':
            return `<rect x="230" y="240" width="300" height="360" rx="26" fill="${C.white}" stroke="${C.deep}" stroke-width="8"/>
<path d="M530,320 Q640,320 640,420 Q640,520 530,520" fill="none" stroke="${C.deep}" stroke-width="26"/>
<rect x="230" y="300" width="300" height="40" fill="${C.blue}"/><rect x="230" y="340" width="300" height="14" fill="${C.red}"/>
<text x="380" y="470" text-anchor="middle" font-family="${FONT}" font-size="54" font-weight="700" font-style="italic" fill="${C.blue}">SEU NOME</text>`;
        case 'scarf':
            return `<g transform="rotate(-18 400 400)">${Array.from({ length: 8 }, (_, i) => `<rect x="${110 + i * 75}" y="300" width="75" height="190" fill="${[C.blue, C.white, C.red, C.white][i % 4]}"/>`).join('')}
<rect x="110" y="300" width="600" height="190" fill="none" stroke="${C.deep}" stroke-width="6"/><text x="410" y="420" text-anchor="middle" font-family="${FONT}" font-size="80" font-weight="700" font-style="italic" fill="${C.deep}">FILTRADORES</text></g>`;
        case 'bottle':
            return `<rect x="330" y="160" width="140" height="70" rx="14" fill="${C.deep}"/><path d="M300,240 Q300,220 330,220 L470,220 Q500,220 500,240 L510,660 Q510,690 480,690 L320,690 Q290,690 290,660 Z" fill="${C.blue}" stroke="${C.deep}" stroke-width="6"/>
<rect x="296" y="400" width="210" height="30" fill="${C.red}"/><text x="400" y="560" text-anchor="middle" font-family="${FONT}" font-size="64" font-weight="700" font-style="italic" fill="${C.white}">ACEF</text>`;
    }
}

export async function productImage(kind: ProductKind, label: string, variant = 0): Promise<Buffer> {
    const W = 800, H = 800;
    const bgs = ['#eef2fb', '#f6f6f6', '#e6ebfc'];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${bgs[variant % bgs.length]}"/>
<circle cx="400" cy="420" r="320" fill="${C.blue}" fill-opacity="0.07"/>
<g transform="translate(0 ${variant === 1 ? 10 : 0}) ${variant === 2 ? 'rotate(-6 400 400)' : ''}">${productShape(kind)}</g>
<text x="40" y="80" font-family="${FONT}" font-size="40" font-weight="700" font-style="italic" fill="${C.deep}">${esc(label.toUpperCase())}</text>
${watermark(W, H, true)}
</svg>`;
    return toWebp(svg, W, H);
}

/** arte de post no estilo das artes do clube (1080x1080) */
export async function postArt(lines: string[], subtitle: string, accent?: string): Promise<Buffer> {
    const W = 1080, H = 1080;
    const big = lines.map((l, i) => `<text x="70" y="${330 + i * 150}" font-family="${FONT}" font-size="150" font-weight="700" font-style="italic" fill="${i === lines.length - 1 && accent ? accent : C.white}">${esc(l.toUpperCase())}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${heroBg(W, H)}
${stripes(W, H, 860)}
<text x="70" y="140" font-family="${FONT}" font-size="40" font-weight="700" font-style="italic" fill="${C.gold}">ACE FILTRADORES</text>
${big}
<text x="70" y="${330 + lines.length * 150 - 40}" font-family="${FONT}" font-size="40" font-weight="700" font-style="italic" fill="${C.white}" fill-opacity="0.9">${esc(subtitle)}</text>
${watermark(W, H)}
</svg>`;
    return toWebp(svg, W, H);
}

/** tabela de classificação (post) */
export async function standingsArt(title: string, rows: { team: string, p: number, j: number, v: number, e: number, d: number, sg: number }[]): Promise<Buffer> {
    const W = 1080, H = 1080;
    const body = rows.map((row, i) => {
        const y = 300 + i * 78;
        const me = row.team.includes('Filtradores');
        return `<rect x="60" y="${y - 52}" width="960" height="68" rx="10" fill="${me ? C.gold : C.white}" fill-opacity="${me ? 1 : 0.1}"/>
<text x="90" y="${y}" font-family="${FONT}" font-size="36" font-weight="700" font-style="italic" fill="${me ? C.deep : C.white}">${i + 1}. ${esc(row.team.toUpperCase())}</text>
${[row.p, row.j, row.v, row.e, row.d, row.sg].map((v, k) => `<text x="${640 + k * 64}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="700" fill="${me ? C.deep : C.white}">${v}</text>`).join('')}`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
${heroBg(W, H)}
<text x="60" y="120" font-family="${FONT}" font-size="90" font-weight="700" font-style="italic" fill="${C.white}">CLASSIFICAÇÃO</text>
<text x="60" y="175" font-family="${FONT}" font-size="34" font-weight="700" font-style="italic" fill="${C.gold}">${esc(title.toUpperCase())}</text>
${['P', 'J', 'V', 'E', 'D', 'SG'].map((h, k) => `<text x="${640 + k * 64}" y="235" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="700" fill="${C.gold}">${h}</text>`).join('')}
${body}
${watermark(W, H)}
</svg>`;
    return toWebp(svg, W, H);
}
