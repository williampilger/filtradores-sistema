/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Seed de DEMONSTRAÇÃO (somente dev): planos, jogos, produtos, elenco e posts de exemplo.
 * ⚠️ NÃO rodar em produção.
 */
import { prisma } from '../src/client';

const day = 86_400_000;

async function main() {
    if (process.env.NODE_ENV === 'production') throw new Error('seed:demo não roda em produção');
    if (await prisma.membershipPlan.count()) { console.log('Já existem dados de demonstração - nada feito.'); return; }

    const [torcedor, raiz, diretoria] = await Promise.all([
        prisma.membershipPlan.create({ data: { name: 'Sócio Torcedor', slug: 'socio-torcedor', tierLevel: 1, priceCents: 1990, period: 'MONTHLY', eventAccess: 'CLAIM', storeDiscountPct: 5, benefits: ['Ingresso para os jogos no Morangão (resgate no app)', '5% de desconto na loja', 'Feed exclusivo de sócios'], color: '#1f7cc0', sortOrder: 1 } }),
        prisma.membershipPlan.create({ data: { name: 'Sócio Raiz', slug: 'socio-raiz', tierLevel: 2, priceCents: 3990, period: 'MONTHLY', eventAccess: 'AUTOMATIC', storeDiscountPct: 10, ticketDiscountPct: 50, benefits: ['Entrada em todos os jogos com a carteirinha', '10% de desconto na loja', '50% de desconto em ingressos extras', 'Conteúdo prime dos bastidores'], color: '#0b3d91', sortOrder: 2 } }),
        prisma.membershipPlan.create({ data: { name: 'Sócio Anual', slug: 'socio-anual', tierLevel: 3, priceCents: 39900, enrollmentFeeCents: 0, period: 'YEARLY', eventAccess: 'AUTOMATIC', storeDiscountPct: 15, ticketDiscountPct: 50, benefits: ['Tudo do Sócio Raiz', '15% de desconto na loja', 'Camisa oficial na adesão'], color: '#f2c200', sortOrder: 3 } }),
    ]);
    void torcedor; void raiz; void diretoria;

    const now = Date.now();
    const events = [
        { slug: 'filtradores-x-santa-rosa-futsal', title: 'Filtradores x Santa Rosa Futsal', opponent: 'Santa Rosa Futsal', competition: 'Gauchão de Futsal - Série A 2026', venue: 'Ginásio do Morangão', startsAt: new Date(now + 6 * day) },
        { slug: 'filtradores-x-adversario-exemplo', title: 'Filtradores x Adversário Exemplo', opponent: 'Adversário Exemplo', competition: 'Gauchão de Futsal - Série A 2026', venue: 'Ginásio do Morangão', startsAt: new Date(now + 20 * day) },
    ];
    for (const e of events) {
        await prisma.event.create({
            data: {
                ...e, isMatch: true, status: 'PUBLISHED', capacity: 600, memberCapacity: 200, gatesOpenAt: new Date(e.startsAt.getTime() - 3_600_000),
                TicketTypes: { create: [
                    { name: '1º lote', priceCents: 2000, quantity: 300, sortOrder: 1 },
                    { name: 'Meia (estudante/idoso)', priceCents: 1000, quantity: 100, sortOrder: 2 },
                ] },
            },
        });
    }

    await prisma.product.create({ data: { slug: 'camisa-oficial-2026', name: 'Camisa oficial 2026', category: 'Vestuário', basePriceCents: 14990, fulfillment: 'STOCK', waitlistEnabled: true, description: 'Camisa oficial do Filtradores, temporada 2026.', Variants: { create: ['P', 'M', 'G', 'GG'].map((n, i) => ({ name: n, stock: i === 3 ? 0 : 10, sortOrder: i })) } } });
    await prisma.product.create({ data: { slug: 'bone-filtradores', name: 'Boné Filtradores', category: 'Acessórios', basePriceCents: 5990, fulfillment: 'STOCK', Variants: { create: [{ name: 'Único', stock: 25 }] } } });
    const jaqueta = await prisma.product.create({ data: { slug: 'jaqueta-personalizada', name: 'Jaqueta personalizada (sob encomenda)', category: 'Vestuário', basePriceCents: 22990, fulfillment: 'ON_DEMAND', waitlistEnabled: true, waitlistPayment: 'UPFRONT', description: 'Produzida em lotes. Pague agora e retire quando o lote ficar pronto.', Variants: { create: ['P', 'M', 'G', 'GG'].map((n, i) => ({ name: n, sortOrder: i })) } } });
    await prisma.productionBatch.create({ data: { productId: jaqueta.id, name: 'Lote 1', minQuantity: 20, closesAt: new Date(now + 15 * day) } });
    const caneca = await prisma.product.create({ data: { slug: 'caneca-personalizada', name: 'Caneca com nome (pague quando ficar pronta)', category: 'Acessórios', basePriceCents: 4990, fulfillment: 'ON_DEMAND', waitlistEnabled: true, waitlistPayment: 'ON_RELEASE', Variants: { create: [{ name: 'Padrão' }] } } });
    await prisma.productionBatch.create({ data: { productId: caneca.id, name: 'Lote dezembro' } });

    // futsal: GK goleiro | DF fixo | MF ala | FW pivô (nomes fictícios - cadastrar o elenco real pelo painel)
    const players: [string, number, 'GK' | 'DF' | 'MF' | 'FW'][] = [
        ['Goleiro Exemplo', 1, 'GK'], ['Goleiro Reserva', 12, 'GK'], ['Fixo Exemplo', 3, 'DF'], ['Fixo Reserva', 4, 'DF'],
        ['Ala Direito', 7, 'MF'], ['Ala Esquerdo', 10, 'MF'], ['Ala Reserva 1', 8, 'MF'], ['Ala Reserva 2', 11, 'MF'],
        ['Pivô Exemplo', 9, 'FW'], ['Pivô Reserva', 19, 'FW'],
    ];
    for (const [name, number, position] of players) await prisma.player.create({ data: { name, number, position } });

    const master = await prisma.user.findFirst({ where: { isMaster: true } });
    if (master) {
        await prisma.post.create({ data: { title: 'Bem-vindo ao novo app do Filtradores!', body: 'Agora ingressos, carteirinha de sócio e loja ficam todos aqui. Associe-se e apoie o time!', visibility: 'PUBLIC', pinned: true, publishedAt: new Date(), authorId: master.id } });
        await prisma.post.create({ data: { title: 'Bastidores do treino (sócios)', body: 'Conteúdo exclusivo para sócios: o treinador comenta a preparação para o próximo jogo.', visibility: 'MEMBERS', publishedAt: new Date(), authorId: master.id } });
        await prisma.post.create({ data: { title: 'Papo com o elenco (Sócio Raiz+)', body: 'Entrevista exclusiva para sócios a partir do nível Raiz.', visibility: 'MIN_TIER', minTierLevel: 2, publishedAt: new Date(), authorId: master.id } });
    }
    console.log('✔ Dados de demonstração criados');
}

main().then(() => prisma.$disconnect()).catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
