/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Página 404 ("bola fora")
 */
import Link from 'next/link';

export default function NotFound() {
    return (
        <main className="hero-blue flex min-h-dvh flex-col">
            <div className="club-stripes h-2" aria-hidden />
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
                <div className="text-xs font-bold uppercase tracking-[.3em] text-club-gold">Erro 404</div>
                <div className="display text-[9rem] leading-none sm:text-[12rem]">4<span className="text-club-gold">0</span>4</div>
                <h1 className="display text-5xl sm:text-6xl">Bola fora!</h1>
                <p className="max-w-md text-lg opacity-90">A página que você procurou não está em campo. Talvez o link tenha mudado ou o conteúdo saiu do ar.</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Link href="/" className="btn btn-accent btn-lg">Voltar ao início</Link>
                    <Link href="/jogos" className="btn btn-lg">Ver os jogos</Link>
                </div>
            </div>
            <div className="club-stripes h-2" aria-hidden />
        </main>
    );
}
