/**
 * 2026.11.15 - Fixtures dos testes de integração
 */
import { prisma } from '@filt/db';

export async function resetDb() {
    const tables = await prisma.$queryRaw<{ t: string }[]>`SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> '_prisma_migrations'`;
    // SET FOREIGN_KEY_CHECKS vale por conexão: a transação fixa uma única conexão do pool
    await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
        for (const { t } of tables) await tx.$executeRawUnsafe(`DELETE FROM \`${t}\``);
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
    }, { timeout: 30_000 });
}

let seq = 0;
export async function mkUser(extra: Partial<{ name: string, cpf: string, isMaster: boolean }> = {}) {
    seq++;
    return prisma.user.create({ data: { name: extra.name ?? `Usuário ${seq}`, email: `u${seq}-${Date.now()}@teste.local`, cpf: extra.cpf ?? null, isMaster: extra.isMaster ?? false } });
}

export async function mkEvent(opts: { capacity?: number | null, types?: { name?: string, price?: number, qty: number }[] } = {}) {
    seq++;
    return prisma.event.create({
        data: {
            slug: `jogo-${seq}-${Date.now()}`, title: `Jogo ${seq}`, startsAt: new Date(Date.now() + 7 * 86_400_000), status: 'PUBLISHED',
            capacity: opts.capacity ?? null,
            TicketTypes: { create: (opts.types ?? [{ qty: 100 }]).map((t, i) => ({ name: t.name ?? `Lote ${i + 1}`, priceCents: t.price ?? 2000, quantity: t.qty })) },
        },
        include: { TicketTypes: true },
    });
}

export async function mkProduct(opts: { stock?: number, fulfillment?: 'STOCK' | 'ON_DEMAND', waitlist?: boolean, waitlistPayment?: 'UPFRONT' | 'ON_RELEASE' } = {}) {
    seq++;
    return prisma.product.create({
        data: {
            slug: `camisa-${seq}-${Date.now()}`, name: `Camisa ${seq}`, basePriceCents: 12000, fulfillment: opts.fulfillment ?? 'STOCK',
            waitlistEnabled: opts.waitlist ?? false, waitlistPayment: opts.waitlistPayment ?? 'UPFRONT',
            Variants: { create: [{ name: 'M', stock: opts.stock ?? 0 }] },
        },
        include: { Variants: true },
    });
}

export const customer = { name: 'Torcedor Teste', email: 'torcedor@teste.local', cpf: '52998224725' };
