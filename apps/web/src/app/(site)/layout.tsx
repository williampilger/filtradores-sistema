/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Layout do site público (cabeçalho, rodapé e dados do clube compartilhados)
 */
import { SiteDataProvider } from '@/components/site/SiteData';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <SiteDataProvider>
            <div className="flex min-h-dvh flex-col">
                <SiteHeader />
                <main className="flex-1">{children}</main>
                <SiteFooter />
            </div>
        </SiteDataProvider>
    );
}
