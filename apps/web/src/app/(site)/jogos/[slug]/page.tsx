/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Detalhe do jogo/evento (ingressos, benefício de sócio, escalação)
 */
import EventDetail from '@/views/EventDetail';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return <EventDetail slug={slug} />;
}
