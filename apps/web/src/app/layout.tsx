/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Layout raiz (fontes da identidade visual: Oswald para títulos, Inter para texto)
 */
import type { Metadata, Viewport } from 'next';
import { Inter, Oswald } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const oswald = Oswald({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-oswald', display: 'swap' });

export const metadata: Metadata = {
    title: { default: 'ACE Filtradores', template: '%s | ACE Filtradores' },
    description: 'Associação Cultural e Esportiva Filtradores - sócio torcedor, ingressos, loja e notícias do time de futsal de Bom Princípio-RS',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1b3fd1' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" className={`${inter.variable} ${oswald.variable}`}>
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
