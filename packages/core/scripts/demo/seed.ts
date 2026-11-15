/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Seed de DEMONSTRAÇÃO completo (apresentação para a gestão)
 *
 * Uso (raiz do repo):
 *   npm run db:demo:reset   -> APAGA TODO o banco, roda o seed base e popula a demonstração
 *   npm run db:seed:demo    -> só popula (banco recém-criado)
 *
 * - Exige DEMO_MODE=true no .env (trava contra rodar em produção por engano).
 * - Usa as PRÓPRIAS regras do @filt/core (pedidos, pagamentos, ingressos, entradas, lista de espera...):
 *   os dados ficam consistentes como se o sistema tivesse sido usado de verdade. Depois, as datas são "envelhecidas".
 * - Imagens ilustrativas geradas localmente (scripts/demo/images.ts) com marca d'água "DADOS DE EXEMPLO".
 * - Senha de TODAS as contas de demonstração: DEMO_PASSWORD (abaixo). Lista no final da execução e em docs/demonstracao.md.
 */
process.env.DEMO_SEED_RUNNING = 'true';
process.env.LOG_LEVEL ??= 'warn';
process.env.LOG_APP_NAME = 'filt-demo-seed';

import { execSync } from 'node:child_process';
import path from 'node:path';
import { hash } from '@node-rs/argon2';
import { prisma, type PaymentMethod, type PlayerPosition } from '@filt/db';
import { StorageSystem } from '@filt/integrations/storage';
import { LABELS, slugify } from '@filt/shared';
import {
    adjustStock, applyPaymentStatus, billingSweep, checkInMember, checkInTicket, claimMemberTicket, createBatch, createOrder, getRedis,
    issueCourtesy, joinWaitlist, newIdempotencyKey, refundPayment, sellAtGate, setBatchStatus, setDeliveryStatus, startPayment, validateQr,
} from '../../src';
import { gamePhoto, memberAvatar, playerPortrait, postArt, productImage, rng, standingsArt, type ProductKind } from './images';

export const DEMO_PASSWORD = 'Teste53!';
const DAY = 86_400_000;
const NOW = Date.now();
const R = rng(20261115);
const pick = <T>(a: T[]) => a[Math.floor(R() * a.length)];
const at = (days: number, hour = 20, min = 0) => { const d = new Date(NOW + days * DAY); d.setHours(hour, min, 0, 0); return d; };
const fmtDay = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) + ` · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`;
const log = (s: string) => console.log(`  • ${s}`);

// ─── CPFs válidos fictícios ─────────────────────────────────────────────────
let cpfSeq = 100_000_000;
function nextCpf(): string {
    const base = String(cpfSeq++ * 7 % 999_999_999).padStart(9, '1');
    const d = (len: number, s: string) => { let sum = 0; for (let i = 0; i < len; i++) sum += Number(s[i]) * (len + 1 - i); const r = (sum * 10) % 11; return r === 10 ? 0 : r; };
    const d1 = d(9, base); const d2 = d(10, base + d1);
    return base + d1 + d2;
}

// ─── Reset ──────────────────────────────────────────────────────────────────
async function resetDatabase() {
    const tables = await prisma.$queryRaw<{ t: string }[]>`SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> '_prisma_migrations'`;
    await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
        for (const { t } of tables) await tx.$executeRawUnsafe(`DELETE FROM \`${t}\``);
        for (const { t } of tables) await tx.$executeRawUnsafe(`ALTER TABLE \`${t}\` AUTO_INCREMENT = 1`).catch(() => undefined);
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
    }, { timeout: 60_000 });
    const { rm } = await import('node:fs/promises');
    await rm(path.resolve(import.meta.dirname, '../../../../.storage/public/demo'), { recursive: true, force: true });
    await rm(path.resolve(import.meta.dirname, '../../../../.storage/users'), { recursive: true, force: true });
    try { await getRedis().flushdb(); } catch { /* cache opcional */ }
    execSync('npm run seed --workspace=packages/db', { cwd: path.resolve(import.meta.dirname, '../../../..'), stdio: 'inherit' });
}

// ─── Helpers ────────────────────────────────────────────────────────────────
let pwHash: string;
async function mkUser(name: string, email: string, opts: { roleKeys?: string[], photo?: boolean, phone?: boolean } = {}) {
    const roles = opts.roleKeys?.length ? await prisma.role.findMany({ where: { key: { in: opts.roleKeys } } }) : [];
    const u = await prisma.user.create({
        data: {
            name, email, cpf: nextCpf(), phone: opts.phone === false ? null : `519${String(Math.floor(R() * 1e8)).padStart(8, '0')}`,
            birthDate: new Date(Date.UTC(1965 + Math.floor(R() * 40), Math.floor(R() * 12), 1 + Math.floor(R() * 27))),
            passwordHash: pwHash, emailVerifiedAt: new Date(), createdAt: new Date(NOW - (30 + R() * 300) * DAY),
            Roles: { create: roles.map(r => ({ roleId: r.id })) },
        },
    });
    if (opts.photo !== false) {
        const key = `users/${u.id}/demo-${u.id}.webp`;
        await StorageSystem.put(key, await memberAvatar(u.id, name));
        await prisma.user.update({ where: { id: u.id }, data: { photoKey: key } });
    }
    return u;
}

async function putPublic(key: string, buf: Buffer) { await StorageSystem.put(`public/demo/${key}`, buf); return `public/demo/${key}`; }

/** pagamento "online" SIMULADO já aprovado (para o histórico): grava Payment e aplica o status PAID (fulfillOrder real) */
async function paySimulated(orderId: number, gateway: string, method: PaymentMethod, paidAt: Date) {
    const o = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const p = await prisma.payment.create({
        data: { orderId, gateway, method, amountCents: o.totalCents, status: 'PENDING', idempotencyKey: newIdempotencyKey(), externalId: `demo_hist_${orderId}_${Math.floor(R() * 1e9)}`, note: 'Pagamento simulado (dados de exemplo)' },
    });
    await applyPaymentStatus(p.id, 'PAID', { paidAt });
    return p;
}

/** envelhece um pedido e tudo que nasceu dele */
async function ageOrder(orderId: number, when: Date) {
    await prisma.order.update({ where: { id: orderId }, data: { createdAt: when, paidAt: when } });
    await prisma.payment.updateMany({ where: { orderId }, data: { createdAt: when, paidAt: when } });
    await prisma.ticket.updateMany({ where: { OrderItem: { orderId } }, data: { createdAt: when } });
}

const customerOf = (u: { name: string, email: string, cpf: string | null, phone: string | null }) => ({ name: u.name, email: u.email, cpf: u.cpf, phone: u.phone });

// ─── Dados ──────────────────────────────────────────────────────────────────
const FIRST = ['Ana', 'Bruno', 'Carla', 'Diego', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique', 'Isadora', 'João', 'Larissa', 'Lucas', 'Mariana', 'Mateus', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sabrina', 'Tiago', 'Vanessa', 'Vinícius', 'Bianca', 'Leonardo', 'Camila', 'Gustavo', 'Juliana', 'Rodrigo', 'Fernanda', 'André', 'Patrícia', 'Marcelo', 'Letícia', 'Daniel', 'Aline', 'Fábio'];
const LAST = ['Schmitt', 'Klein', 'Hoffmann', 'Wagner', 'Weber', 'Scherer', 'Kunz', 'Becker', 'Lauxen', 'Dresch', 'Müller', 'Schneider', 'Fischer', 'Haas', 'Mallmann', 'Ritter', 'Spohr', 'Diehl', 'Rauber', 'Thomas', 'Bohn', 'Hendges'];
const OPPONENTS = ['Atlético Vale Verde', 'Serra Azul Futsal', 'Rio Claro EC', 'Pinheiral FC', 'União Cascata', 'AE Morro Alto', 'Grêmio Arroio Fundo'];
const COMPETITION = 'Gauchão de Futsal Série A 2026 (exemplo)';
const VENUE = 'Ginásio do Morangão';

const PLAYERS: { name: string, nick: string, number: number | null, pos: PlayerPosition }[] = [
    { name: 'Rodrigo Hoffmann', nick: 'Digo', number: 1, pos: 'GK' }, { name: 'Lucas Becker', nick: 'Becker', number: 12, pos: 'GK' },
    { name: 'Marcelo Klein', nick: 'Marcelinho', number: 4, pos: 'DF' }, { name: 'Tiago Scherer', nick: 'Tiaguinho', number: 5, pos: 'DF' },
    { name: 'Felipe Wagner', nick: 'Felipão', number: 6, pos: 'DF' }, { name: 'André Kunz', nick: 'Dedé', number: 7, pos: 'MF' },
    { name: 'Gustavo Weber', nick: 'Guga', number: 8, pos: 'MF' }, { name: 'Daniel Lauxen', nick: 'Dani', number: 10, pos: 'MF' },
    { name: 'Vinícius Dresch', nick: 'Vini', number: 11, pos: 'MF' }, { name: 'Fábio Ritter', nick: 'Fabinho', number: 14, pos: 'MF' },
    { name: 'Leonardo Spohr', nick: 'Léo', number: 9, pos: 'FW' }, { name: 'Mateus Haas', nick: 'Matheuzinho', number: 19, pos: 'FW' },
    { name: 'Henrique Mallmann', nick: 'Rique', number: 17, pos: 'FW' }, { name: 'Otávio Bohn', nick: 'Tavinho', number: 21, pos: 'DF' },
    { name: 'Carlos Diehl', nick: 'Professor Carlão', number: null, pos: 'STAFF' }, { name: 'Paulo Rauber', nick: 'Preparador Paulinho', number: null, pos: 'STAFF' },
];

// ─── Execução ───────────────────────────────────────────────────────────────
async function main() {
    if (process.env.DEMO_MODE !== 'true') throw new Error('Defina DEMO_MODE=true no .env para popular dados de demonstração (proteção contra produção).');
    const reset = process.argv.includes('--reset');
    console.log(`\n▶ Demonstração ACE Filtradores${reset ? ' (RESET do banco)' : ''}`);
    if (reset) await resetDatabase();
    else if (await prisma.order.count()) throw new Error('O banco já tem pedidos. Use `npm run db:demo:reset` (apaga tudo) para recriar a demonstração.');

    pwHash = await hash(DEMO_PASSWORD, { algorithm: 2 });

    // ── clube ──
    await prisma.clubSettings.update({
        where: { id: 1 },
        data: {
            name: 'ACE Filtradores', shortName: 'ACEF', city: 'Bom Princípio - RS', instagram: 'acefiltradores', contactEmail: 'contato@exemplo.local', contactPhone: '(51) 99999-0000',
            about: 'Associação Cultural e Esportiva Filtradores - futsal de Bom Princípio-RS. (Texto de exemplo: ambiente de demonstração.)',
            pickupInfo: 'Retirada dos produtos na secretaria do Ginásio do Morangão, em dias de jogo, 1h antes da partida. (exemplo)',
        },
    });

    // ── equipe / staff ──
    const master = await prisma.user.findFirstOrThrow({ where: { isMaster: true } });
    await prisma.user.update({ where: { id: master.id }, data: { photoKey: null } });
    const staff = {
        president: await mkUser('Roberto Schneider', 'diretoria@exemplo.local', { roleKeys: ['board'] }),
        treasurer: await mkUser('Cláudia Fischer', 'tesouraria@exemplo.local', { roleKeys: ['board'] }),
        it: await mkUser('Rafael Thomas', 'ti@exemplo.local', { roleKeys: ['it_admin'] }),
        coach: await mkUser('Carlos Diehl', 'treinador@exemplo.local', { roleKeys: ['coach'] }),
        org1: await mkUser('Patrícia Hendges', 'organizador@exemplo.local', { roleKeys: ['organizer'] }),
        org2: await mkUser('Fernando Bohn', 'organizador2@exemplo.local', { roleKeys: ['organizer'] }),
        gate1: await mkUser('Juliana Spohr', 'portaria@exemplo.local', { roleKeys: ['gatekeeper'] }),
        gate2: await mkUser('Marcos Rauber', 'portaria2@exemplo.local', { roleKeys: ['gatekeeper'] }),
    };
    // papel personalizado de exemplo
    await prisma.role.create({ data: { name: 'Lojinha (voluntários)', description: 'Exemplo de papel personalizado: atende a loja nos dias de jogo.', Permissions: { create: ['orders.read', 'orders.manage', 'stock.adjust', 'payments.manual'].map(permission => ({ permission })) } } });
    const shopRole = await prisma.role.findFirstOrThrow({ where: { name: 'Lojinha (voluntários)' } });
    const shop = await mkUser('Bianca Mallmann', 'lojinha@exemplo.local');
    await prisma.userRole.create({ data: { userId: shop.id, roleId: shopRole.id } });
    // override individual de exemplo: organizador 2 NÃO pode vender na portaria
    await prisma.userPermissionOverride.create({ data: { userId: staff.org2.id, permission: 'tickets.sell_manual', effect: 'DENY' } });
    log('equipe: diretoria, tesouraria, TI, treinador, 2 organizadores, 2 portaria, lojinha (papel personalizado)');

    // ── planos ──
    const plans = {
        torcedor: await prisma.membershipPlan.create({ data: { name: 'Sócio Torcedor', slug: 'socio-torcedor', tierLevel: 1, priceCents: 1990, period: 'MONTHLY', eventAccess: 'CLAIM', storeDiscountPct: 5, ticketDiscountPct: 0, benefits: ['Ingresso para os jogos no Morangão (resgate no app)', '5% de desconto na loja', 'Feed exclusivo de sócios'], color: '#2c5be0', sortOrder: 1 } }),
        raiz: await prisma.membershipPlan.create({ data: { name: 'Sócio Raiz', slug: 'socio-raiz', tierLevel: 2, priceCents: 3990, enrollmentFeeCents: 1000, period: 'MONTHLY', eventAccess: 'AUTOMATIC', storeDiscountPct: 10, ticketDiscountPct: 50, benefits: ['Entrada em todos os jogos com a carteirinha', '10% de desconto na loja', '50% de desconto em ingressos para acompanhantes', 'Conteúdo prime dos bastidores'], color: '#1b3fd1', sortOrder: 2 } }),
        anual: await prisma.membershipPlan.create({ data: { name: 'Sócio Ouro Anual', slug: 'socio-ouro-anual', tierLevel: 3, priceCents: 39900, period: 'YEARLY', eventAccess: 'AUTOMATIC', storeDiscountPct: 15, ticketDiscountPct: 50, benefits: ['Tudo do Sócio Raiz', '15% de desconto na loja', 'Camisa oficial na adesão', 'Encontro anual com o elenco'], color: '#f5b700', sortOrder: 3 } }),
        familia: await prisma.membershipPlan.create({ data: { name: 'Sócio Kids (inativo)', slug: 'socio-kids', tierLevel: 1, priceCents: 990, period: 'MONTHLY', eventAccess: 'CLAIM', active: false, benefits: ['Plano antigo, desativado - exemplo'], sortOrder: 9 } }),
    };
    void plans.familia;
    log('planos: Torcedor (resgate), Raiz (carteirinha), Ouro Anual, Kids (inativo)');

    // ── elenco ──
    const players = [];
    for (const [i, p] of PLAYERS.entries()) {
        const key = await putPublic(`players/${i + 1}.webp`, await playerPortrait(i, p.nick, p.number, LABELS.playerPosition[p.pos]));
        players.push(await prisma.player.create({ data: { name: `${p.name} (exemplo)`, nickname: p.nick, number: p.number, position: p.pos, photoKey: key, bio: p.pos === 'STAFF' ? 'Comissão técnica. Perfil fictício para demonstração.' : `Atleta fictício para demonstração. Camisa ${p.number}.` } }));
    }
    log(`elenco: ${players.length} (fotos ilustrativas)`);

    // ── sócios e torcedores ──
    type Fan = Awaited<ReturnType<typeof mkUser>>;
    const fans: Fan[] = [];
    const mainFan = await mkUser('Mariana Klein', 'socio@exemplo.local');             // Raiz, ativa - conta principal da demo
    const claimFan = await mkUser('Lucas Wagner', 'socio.torcedor@exemplo.local'); // Torcedor (resgate)
    const goldFan = await mkUser('Henrique Scherer', 'socio.ouro@exemplo.local');  // Ouro anual
    const overdue = await mkUser('Sabrina Dresch', 'inadimplente@exemplo.local');   // inadimplente
    const fan = await mkUser('Gabriel Lauxen', 'torcedor@exemplo.local');           // não sócio
    const pending = await mkUser('Otávio Kunz', 'socio.pendente@exemplo.local');    // adesão aguardando pagamento
    for (let i = 0; i < 34; i++) {
        const name = `${FIRST[i % FIRST.length]} ${pick(LAST)}`;
        fans.push(await mkUser(name, `${slugify(name).replace(/-/g, '.')}.${i}@exemplo.local`, { photo: i % 3 !== 0 }));
    }
    const members: { user: Fan, plan: typeof plans.raiz, monthsAgo: number, status: 'ACTIVE' | 'OVERDUE' | 'CANCELED' }[] = [
        { user: mainFan, plan: plans.raiz, monthsAgo: 8, status: 'ACTIVE' },
        { user: claimFan, plan: plans.torcedor, monthsAgo: 5, status: 'ACTIVE' },
        { user: goldFan, plan: plans.anual, monthsAgo: 3, status: 'ACTIVE' },
        { user: overdue, plan: plans.raiz, monthsAgo: 6, status: 'OVERDUE' },
        ...fans.slice(0, 24).map((u, i) => ({ user: u, plan: [plans.raiz, plans.torcedor, plans.raiz, plans.anual][i % 4], monthsAgo: 1 + (i % 10), status: (i === 7 || i === 15 ? 'OVERDUE' : i === 20 ? 'CANCELED' : 'ACTIVE') as 'ACTIVE' | 'OVERDUE' | 'CANCELED' })),
    ];
    let memberNo = 0;
    for (const m of members) {
        memberNo++;
        const start = new Date(NOW - m.monthsAgo * 30 * DAY);
        const months = m.plan.period === 'YEARLY' ? 12 : 1;
        // período atual: ativo cobre hoje; inadimplente venceu há ~15-20 dias
        // ativos: validade espalhada nas próximas semanas (alguns perto do vencimento -> renovação gerada pelo worker)
        let periodEnd = new Date(NOW + (months === 12 ? 120 + (memberNo % 90) : 3 + (memberNo * 7) % 26) * DAY);
        if (m.status === 'OVERDUE') periodEnd = new Date(NOW - (15 + memberNo % 5) * DAY);
        if (m.status === 'CANCELED') periodEnd = new Date(NOW - 40 * DAY);
        const ms = await prisma.membership.create({
            data: {
                userId: m.user.id, planId: m.plan.id, memberNumber: memberNo, status: m.status, startedAt: start, createdAt: start,
                currentPeriodStart: new Date(periodEnd.getTime() - months * 30 * DAY), currentPeriodEnd: periodEnd,
                canceledAt: m.status === 'CANCELED' ? new Date(NOW - 35 * DAY) : null, cancelReason: m.status === 'CANCELED' ? 'Mudou de cidade (exemplo)' : null,
            },
        });
        // histórico de mensalidades pagas (com pedido + pagamento simulado)
        const paidCount = m.plan.period === 'YEARLY' ? 1 : Math.min(m.monthsAgo, 8);
        for (let k = paidCount - 1; k >= 0; k--) {
            const due = new Date(periodEnd.getTime() - (k + 1) * months * 30 * DAY);
            if (m.status === 'OVERDUE' && k === 0) continue;
            const charge = await prisma.membershipCharge.create({
                data: { membershipId: ms.id, planId: m.plan.id, amountCents: m.plan.priceCents + (k === paidCount - 1 ? m.plan.enrollmentFeeCents : 0), dueDate: due, status: 'OPEN', isEnrollment: k === paidCount - 1 },
            });
            const order = await createOrder({ userId: m.user.id, channel: R() > 0.5 ? 'APP' : 'WEB', customer: customerOf(m.user), lines: [{ kind: 'MEMBERSHIP', chargeId: charge.id }] });
            await paySimulated(order.id, pick(['mercadopago', 'mercadopago', 'asaas', 'stripe']), pick(['PIX', 'PIX', 'CARD']), new Date(due.getTime() - 2 * DAY));
            await ageOrder(order.id, new Date(due.getTime() - 2 * DAY));
            await prisma.membershipCharge.update({ where: { id: charge.id }, data: { paidAt: new Date(due.getTime() - 2 * DAY), periodStart: due, periodEnd: new Date(due.getTime() + months * 30 * DAY) } });
        }
        // o fulfill real renova o período: restaura as datas planejadas
        await prisma.membership.update({ where: { id: ms.id }, data: { status: m.status, memberNumber: memberNo, startedAt: start, currentPeriodEnd: periodEnd, currentPeriodStart: new Date(periodEnd.getTime() - months * 30 * DAY) } });
        if (m.status === 'OVERDUE') await prisma.membershipCharge.create({ data: { membershipId: ms.id, planId: m.plan.id, amountCents: m.plan.priceCents, dueDate: periodEnd, status: 'OVERDUE' } });
    }
    // adesão pendente (aguardando pagamento)
    const pendMs = await prisma.membership.create({ data: { userId: pending.id, planId: plans.raiz.id, status: 'PENDING' } });
    const pendCharge = await prisma.membershipCharge.create({ data: { membershipId: pendMs.id, planId: plans.raiz.id, amountCents: plans.raiz.priceCents + plans.raiz.enrollmentFeeCents, dueDate: new Date(NOW + 2 * DAY), isEnrollment: true } });
    await createOrder({ userId: pending.id, channel: 'APP', customer: customerOf(pending), lines: [{ kind: 'MEMBERSHIP', chargeId: pendCharge.id }] });
    await billingSweep(); // gera renovações próximas do vencimento (como o worker faria)
    log(`sócios: ${members.length + 1} (ativos, inadimplentes, cancelado, pendente) + ${fans.length - 24} torcedores sem plano`);

    // ── campeonato: jogos passados ──
    const ctxOf = (eventId: number, operatorId: number) => ({ eventId, operatorId, deviceId: 'demo-portaria' });
    const results: [number, number][] = [[4, 2], [3, 1], [2, 2], [1, 3], [5, 0], [3, 2]];
    const rounds = ['1ª rodada', '2ª rodada', '3ª rodada', '4ª rodada', '5ª rodada', 'Quartas de final - ida'];
    const table = new Map<string, { team: string, p: number, j: number, v: number, e: number, d: number, sg: number }>();
    const addRes = (team: string, gf: number, ga: number) => {
        const t = table.get(team) ?? { team, p: 0, j: 0, v: 0, e: 0, d: 0, sg: 0 };
        t.j++; t.sg += gf - ga; if (gf > ga) { t.v++; t.p += 3; } else if (gf === ga) { t.e++; t.p++; } else t.d++;
        table.set(team, t);
    };
    const allFans = [mainFan, claimFan, goldFan, overdue, fan, ...fans];
    const pastEvents = [];
    for (let i = 0; i < results.length; i++) {
        const daysAgo = (results.length - i) * 14 - 3;
        const opp = OPPONENTS[i];
        const [hs, as] = results[i];
        const startsAt = at(-daysAgo, 20);
        const ev = await prisma.event.create({
            data: {
                slug: `acef-x-${slugify(opp)}-${i + 1}`, title: `Filtradores x ${opp}`, opponent: opp, competition: `${COMPETITION} · ${rounds[i]}`, venue: VENUE,
                address: 'Bom Princípio - RS (endereço de exemplo)', isMatch: true, startsAt, gatesOpenAt: new Date(startsAt.getTime() - 3_600_000), status: 'PUBLISHED',
                capacity: 600, memberCapacity: 250, description: `Jogo de exemplo - ${rounds[i]} do ${COMPETITION}.`, createdAt: new Date(startsAt.getTime() - 20 * DAY),
                TicketTypes: { create: [{ name: 'Inteira', priceCents: 2000, quantity: 350, sortOrder: 1 }, { name: 'Meia-entrada', priceCents: 1000, quantity: 150, sortOrder: 2 }] },
            },
            include: { TicketTypes: true },
        });
        // vendas online
        const buyers = allFans.slice(0, 10 + Math.floor(R() * 12));
        for (const b of buyers) {
            const o = await createOrder({ userId: b.id, channel: R() > 0.4 ? 'APP' : 'WEB', customer: customerOf(b), lines: [{ kind: 'TICKET', ticketTypeId: ev.TicketTypes[R() > 0.75 ? 1 : 0].id, quantity: 1 + Math.floor(R() * 3) }] });
            await paySimulated(o.id, pick(['mercadopago', 'mercadopago', 'asaas', 'pagseguro', 'stripe']), pick(['PIX', 'PIX', 'PIX', 'CARD']), new Date(startsAt.getTime() - (1 + R() * 9) * DAY));
            await ageOrder(o.id, new Date(startsAt.getTime() - (1 + R() * 9) * DAY));
        }
        // portaria + cortesias + resgates de sócios CLAIM
        for (let k = 0; k < 4; k++) await sellAtGate({ eventId: ev.id, lines: [{ ticketTypeId: ev.TicketTypes[k % 2].id, quantity: 1 + (k % 3) }], customerName: `Venda portaria ${k + 1}`, method: k % 2 ? 'PIX' : 'CASH', byUserId: staff.org1.id, byUserName: staff.org1.name });
        await issueCourtesy({ eventId: ev.id, holders: [{ name: 'Imprensa local (exemplo)' }, { name: 'Patrocinador (exemplo)' }], reason: 'Imprensa e patrocinadores', byUserId: staff.president.id, byUserName: staff.president.name });
        for (const m of await prisma.membership.findMany({ where: { status: 'ACTIVE', Plan: { eventAccess: 'CLAIM' } }, take: 6 })) await claimMemberTicket(m.userId, ev.id).catch(() => undefined);
        // entradas: ~85% dos ingressos + sócios AUTOMATIC, algumas leituras negadas
        await prisma.event.update({ where: { id: ev.id }, data: { status: 'PUBLISHED' } });
        const tickets = await prisma.ticket.findMany({ where: { eventId: ev.id, status: 'VALID' } });
        for (const t of tickets) if (R() < 0.85) await checkInTicket(ctxOf(ev.id, pick([staff.gate1.id, staff.gate2.id, staff.org1.id])), { id: t.id });
        for (const m of await prisma.membership.findMany({ where: { status: { in: ['ACTIVE', 'OVERDUE'] }, Plan: { eventAccess: 'AUTOMATIC' } } })) if (R() < 0.7) await checkInMember(ctxOf(ev.id, staff.gate1.id), m.id);
        await validateQr(ctxOf(ev.id, staff.gate2.id), 'QR-QUALQUER-INVALIDO');
        if (tickets[0]) await checkInTicket(ctxOf(ev.id, staff.gate2.id), { id: tickets[0].id });
        // datas das leituras = noite do jogo
        const reads = await prisma.checkIn.findMany({ where: { eventId: ev.id }, select: { id: true } });
        for (const [k, c] of reads.entries()) await prisma.checkIn.update({ where: { id: c.id }, data: { createdAt: new Date(startsAt.getTime() - 50 * 60_000 + k * 9_000) } });
        await prisma.ticket.updateMany({ where: { eventId: ev.id, status: 'USED' }, data: { usedAt: new Date(startsAt.getTime() - 30 * 60_000) } });
        await prisma.memberEventEntry.updateMany({ where: { eventId: ev.id }, data: { createdAt: new Date(startsAt.getTime() - 30 * 60_000) } });
        // placar, capa, escalação, encerramento
        const cover = await putPublic(`events/past-${i + 1}.webp`, await gamePhoto(100 + i, `${rounds[i]} · Filtradores ${hs} x ${as} ${opp}`));
        await prisma.event.update({ where: { id: ev.id }, data: { status: 'CLOSED', homeScore: hs, awayScore: as, coverKey: cover, endsAt: new Date(startsAt.getTime() + 2 * 3_600_000) } });
        await saveLineup(ev.id, players, staff.coach.id, new Date(startsAt.getTime() - 2 * DAY));
        addRes('ACE Filtradores', hs, as); addRes(opp, as, hs);
        pastEvents.push({ ev, opp, hs, as, startsAt, round: rounds[i] });
    }
    // demais resultados da tabela (fictícios)
    for (let k = 0; k < 10; k++) { const a = OPPONENTS[k % 7], b = OPPONENTS[(k + 3) % 7]; if (a !== b) { const ga = Math.floor(R() * 5), gb = Math.floor(R() * 5); addRes(a, ga, gb); addRes(b, gb, ga); } }
    log(`campeonato: ${pastEvents.length} jogos encerrados com placar, vendas, cortesias, portaria, entradas e escalações`);

    // ── jogos futuros ──
    const future = [
        { days: 3, opp: 'Rio Claro EC', round: 'Quartas de final - volta', sold: 26, lineup: true },
        { days: 10, opp: 'Pinheiral FC', round: 'Semifinal - ida', sold: 12, lineup: false },
        { days: 17, opp: 'União Cascata', round: 'Semifinal - volta', sold: 4, lineup: false },
    ];
    const futureEvents = [];
    for (const [i, f] of future.entries()) {
        const startsAt = at(f.days, 20);
        const cover = await putPublic(`events/next-${i + 1}.webp`, await gamePhoto(200 + i, `${f.round} · ${fmtDay(startsAt)}`));
        const ev = await prisma.event.create({
            data: {
                slug: `acef-x-${slugify(f.opp)}-${f.round.includes('volta') ? 'volta' : 'ida'}-${i + 1}`, title: `Filtradores x ${f.opp}`, opponent: f.opp,
                competition: `${COMPETITION} · ${f.round}`, venue: VENUE, address: 'Bom Princípio - RS (endereço de exemplo)', isMatch: true, startsAt,
                gatesOpenAt: new Date(startsAt.getTime() - 3_600_000), status: 'PUBLISHED', capacity: 600, memberCapacity: 250, coverKey: cover,
                description: `${f.round} do ${COMPETITION}. Garanta seu ingresso antecipado! (evento de exemplo)`,
                TicketTypes: {
                    create: [
                        { name: '1º lote', priceCents: 2000, quantity: 150, sortOrder: 1, salesEndAt: new Date(startsAt.getTime() - 2 * DAY) },
                        { name: '2º lote', priceCents: 2500, quantity: 250, sortOrder: 2 },
                        { name: 'Meia-entrada', priceCents: 1250, quantity: 100, sortOrder: 3 },
                        { name: 'Pré-venda sócios', priceCents: 1000, quantity: 80, membersOnly: true, memberDiscount: false, sortOrder: 0 },
                    ],
                },
            },
            include: { TicketTypes: true },
        });
        for (const b of allFans.slice(0, f.sold)) {
            const o = await createOrder({ userId: b.id, channel: R() > 0.4 ? 'APP' : 'WEB', customer: customerOf(b), lines: [{ kind: 'TICKET', ticketTypeId: ev.TicketTypes.find(t => t.name === '1º lote')!.id, quantity: 1 + Math.floor(R() * 2) }] });
            await paySimulated(o.id, pick(['mercadopago', 'asaas', 'pagseguro', 'stripe']), pick(['PIX', 'PIX', 'CARD']), new Date(NOW - R() * 4 * DAY));
            await ageOrder(o.id, new Date(NOW - R() * 4 * DAY));
        }
        if (f.lineup) await saveLineup(ev.id, players, staff.coach.id, new Date(NOW - DAY));
        futureEvents.push({ ev, ...f, startsAt });
    }
    const next = futureEvents[0].ev;
    await issueCourtesy({ eventId: next.id, holders: [{ name: 'Rádio Local (exemplo)' }], reason: 'Imprensa - transmissão', byUserId: staff.president.id, byUserName: staff.president.name });
    await claimMemberTicket(claimFan.id, next.id);
    // validador 2 restrito ao próximo jogo (Equipe do evento)
    await prisma.eventStaff.create({ data: { eventId: next.id, userId: staff.gate2.id } });
    // ingresso da conta principal da demo para o próximo jogo (acompanhante com desconto de sócio)
    const mainOrder = await createOrder({ userId: mainFan.id, channel: 'APP', customer: customerOf(mainFan), lines: [{ kind: 'TICKET', ticketTypeId: next.TicketTypes.find(t => t.name === '1º lote')!.id, quantity: 1, holderNames: ['Acompanhante da Mariana'] }] });
    await paySimulated(mainOrder.id, 'mercadopago', 'PIX', new Date(NOW - DAY));
    // pedido aguardando pagamento (torcedor) - reserva estendida para a demo
    const pendOrder = await createOrder({ userId: fan.id, channel: 'WEB', customer: customerOf(fan), lines: [{ kind: 'TICKET', ticketTypeId: next.TicketTypes.find(t => t.name === '2º lote')!.id, quantity: 2 }] });
    await prisma.order.update({ where: { id: pendOrder.id }, data: { expiresAt: new Date(NOW + 2 * DAY) } });
    // rascunho + evento social
    await prisma.event.create({ data: { slug: 'final-a-definir', title: 'Final - adversário a definir', competition: `${COMPETITION} · Final`, venue: VENUE, isMatch: true, startsAt: at(31, 20), status: 'DRAFT', capacity: 600, description: 'Rascunho de exemplo (não aparece no site).' } });
    const socialCover = await putPublic('events/jantar.webp', await postArt(['JANTAR', 'DOS SÓCIOS'], 'Confraternização de fim de ano · exemplo', '#f5b700'));
    const social = await prisma.event.create({
        data: {
            slug: 'jantar-de-confraternizacao', title: 'Jantar de confraternização dos sócios', isMatch: false, venue: 'Salão da comunidade (exemplo)', startsAt: at(24, 20, 30), status: 'PUBLISHED',
            capacity: 150, memberAccess: false, coverKey: socialCover, description: 'Evento social de exemplo: jantar com elenco e diretoria. Ingresso exclusivo para sócios.',
            TicketTypes: { create: [{ name: 'Convite sócio', priceCents: 6000, quantity: 120, membersOnly: true, memberDiscount: false, maxPerOrder: 4 }] },
        },
        include: { TicketTypes: true },
    });
    const goldOrder = await createOrder({ userId: goldFan.id, channel: 'WEB', customer: customerOf(goldFan), lines: [{ kind: 'TICKET', ticketTypeId: social.TicketTypes[0].id, quantity: 2, holderNames: ['Henrique Scherer', 'Convidada do Henrique'] }] });
    await paySimulated(goldOrder.id, 'asaas', 'PIX', new Date(NOW - 2 * DAY));
    log(`agenda: ${futureEvents.length} jogos futuros (lotes, pré-venda sócios, vendas), 1 rascunho, 1 evento social`);

    // ── loja ──
    const products = await seedStore(allFans, staff, mainFan, fan);
    log(`loja: ${products} produtos (estoque, esgotado c/ lista de espera, sob encomenda pago antecipado e na liberação)`);

    // ── feed ──
    await seedFeed(pastEvents, futureEvents, table, staff, master.id, players);
    log('feed: notícias públicas, exclusivas de sócios e prime (nível), fotos dos jogos, escalação e classificação');

    // ── notificações extras para a conta principal ──
    await prisma.notification.createMany({
        data: [
            { userId: mainFan.id, title: 'Escalação divulgada!', body: `Confira a escalação para Filtradores x ${future[0].opp}.`, link: `/jogos/${next.slug}`, createdAt: new Date(NOW - 3_600_000) },
            { userId: mainFan.id, title: 'Bem-vinda ao Sócio Raiz', body: 'Sua carteirinha digital já está disponível no app.', link: '/minha-conta?aba=carteirinha', readAt: new Date(NOW - 30 * DAY), createdAt: new Date(NOW - 200 * DAY) },
        ],
    });

    // remove o lixo da auditoria gerado pelas rotinas internas? NÃO: mantém (demonstra a auditoria). Só envelhece levemente.
    console.log('\n✔ Demonstração pronta. Contas (senha de todas: ' + DEMO_PASSWORD + '):');
    for (const [role, email] of [
        ['Master (2FA obrigatório no 1º acesso)', process.env.MASTER_EMAIL], ['Diretoria', 'diretoria@exemplo.local'], ['Tesouraria (diretoria)', 'tesouraria@exemplo.local'],
        ['Administrador de TI (2FA obrigatório)', 'ti@exemplo.local'], ['Treinador', 'treinador@exemplo.local'], ['Organizador', 'organizador@exemplo.local'],
        ['Organizador sem venda (override DENY)', 'organizador2@exemplo.local'], ['Portaria (todos os eventos)', 'portaria@exemplo.local'], ['Portaria (só o próximo jogo)', 'portaria2@exemplo.local'],
        ['Lojinha (papel personalizado)', 'lojinha@exemplo.local'], ['Sócia Raiz (carteirinha)', 'socio@exemplo.local'], ['Sócio Torcedor (resgate)', 'socio.torcedor@exemplo.local'],
        ['Sócio Ouro anual', 'socio.ouro@exemplo.local'], ['Sócia inadimplente', 'inadimplente@exemplo.local'], ['Adesão pendente', 'socio.pendente@exemplo.local'], ['Torcedor (não sócio)', 'torcedor@exemplo.local'],
    ] as const) console.log(`   ${role.padEnd(42)} ${email}${email === process.env.MASTER_EMAIL ? '  (senha: MASTER_PASSWORD do .env)' : ''}`);
}

async function saveLineup(eventId: number, players: { id: number, position: PlayerPosition }[], coachId: number, when: Date) {
    const gk = players.filter(p => p.position === 'GK'), df = players.filter(p => p.position === 'DF'), mf = players.filter(p => p.position === 'MF'), fw = players.filter(p => p.position === 'FW');
    const starters = [[gk[0], 'GOL'], [df[0], 'FIXO'], [mf[0], 'ALA-D'], [mf[1], 'ALA-E'], [fw[0], 'PIVÔ']] as const;
    const reserves = [gk[1], df[1], df[2], mf[2], mf[3], fw[1], fw[2]].filter(Boolean);
    await prisma.lineup.create({
        data: {
            eventId, formation: '3-1', notes: 'Escalação de exemplo.', publishedAt: when, createdById: coachId,
            Entries: { create: [...starters.map(([p, slot], i) => ({ playerId: p.id, starter: true, slot, isCaptain: i === 2, sortOrder: i })), ...reserves.map((p, i) => ({ playerId: p.id, starter: false, sortOrder: 10 + i }))] },
        },
    });
}

async function seedStore(allFans: { id: number, name: string, email: string, cpf: string | null, phone: string | null }[], staff: Record<string, { id: number, name: string }>, main: { id: number, name: string, email: string, cpf: string | null, phone: string | null }, fan: { id: number, name: string, email: string, cpf: string | null, phone: string | null }) {
    const defs: { slug: string, name: string, cat: string, price: number, kind: ProductKind, desc: string, variants: [string, number][], fulfillment?: 'ON_DEMAND', waitlist?: boolean, wlPay?: 'UPFRONT' | 'ON_RELEASE' }[] = [
        { slug: 'camisa-oficial-2026', name: 'Camisa oficial 2026 (branca)', cat: 'Vestuário', price: 16990, kind: 'shirt', desc: 'Camisa de jogo branca com listras vermelhas e azuis. Produto de exemplo.', variants: [['P', 6], ['M', 12], ['G', 9], ['GG', 0]], waitlist: true },
        { slug: 'camisa-alternativa-azul', name: 'Camisa alternativa (azul)', cat: 'Vestuário', price: 16990, kind: 'shirt-blue', desc: 'Segundo uniforme, azul royal. Produto de exemplo.', variants: [['P', 4], ['M', 7], ['G', 5], ['GG', 2]] },
        { slug: 'camisa-treino', name: 'Camisa de treino', cat: 'Vestuário', price: 8990, kind: 'training', desc: 'Dry-fit para treino e dia a dia. Produto de exemplo.', variants: [['P', 10], ['M', 10], ['G', 10], ['GG', 6]] },
        { slug: 'bone-acef', name: 'Boné ACEF', cat: 'Acessórios', price: 5990, kind: 'cap', desc: 'Boné aba curva bordado. Produto de exemplo.', variants: [['Único', 30]] },
        { slug: 'squeeze-acef', name: 'Squeeze 750 ml', cat: 'Acessórios', price: 3490, kind: 'bottle', desc: 'Squeeze do time. Últimas unidades! Produto de exemplo.', variants: [['Azul', 3]] },
        { slug: 'cachecol-acef', name: 'Cachecol listrado', cat: 'Acessórios', price: 4990, kind: 'scarf', desc: 'Esgotado (sem lista de espera) - exemplo.', variants: [['Único', 0]] },
        { slug: 'jaqueta-personalizada', name: 'Jaqueta personalizada', cat: 'Vestuário', price: 24990, kind: 'jacket', desc: 'Produzida em lotes: pague agora e retire quando o lote ficar pronto. Produto de exemplo.', variants: [['P', 0], ['M', 0], ['G', 0], ['GG', 0]], fulfillment: 'ON_DEMAND', waitlist: true, wlPay: 'UPFRONT' },
        { slug: 'caneca-com-nome', name: 'Caneca com seu nome', cat: 'Acessórios', price: 4990, kind: 'mug', desc: 'Entre na lista sem pagar; pague quando o lote ficar pronto. Produto de exemplo.', variants: [['Padrão', 0]], fulfillment: 'ON_DEMAND', waitlist: true, wlPay: 'ON_RELEASE' },
    ];
    const created: Record<string, { id: number, Variants: { id: number, name: string }[] }> = {};
    for (const [i, d] of defs.entries()) {
        const keys = [];
        for (let v = 0; v < (i < 2 ? 3 : 1); v++) keys.push(await putPublic(`products/${d.slug}-${v + 1}.webp`, await productImage(d.kind, d.name, v)));
        created[d.slug] = await prisma.product.create({
            data: {
                slug: d.slug, name: d.name, category: d.cat, description: d.desc, basePriceCents: d.price, imageKeys: keys, sortOrder: i,
                fulfillment: d.fulfillment ?? 'STOCK', waitlistEnabled: !!d.waitlist, waitlistPayment: d.wlPay ?? 'UPFRONT',
                Variants: { create: d.variants.map(([name, stock], k) => ({ name, stock, sortOrder: k, sku: `${d.slug.toUpperCase().slice(0, 10)}-${name}` })) },
            },
            include: { Variants: true },
        });
    }
    const v = (slug: string, name: string) => created[slug].Variants.find(x => x.name === name)!.id;
    const buy = async (u: typeof main, variantId: number, qty: number, daysAgo: number, waitlistEntryId?: number) => {
        const o = await createOrder({ userId: u.id, channel: R() > 0.5 ? 'APP' : 'WEB', customer: customerOf(u), lines: [{ kind: 'PRODUCT', variantId, quantity: qty, waitlistEntryId }] });
        await paySimulated(o.id, pick(['mercadopago', 'asaas', 'stripe']), pick(['PIX', 'CARD']), new Date(NOW - daysAgo * DAY));
        await ageOrder(o.id, new Date(NOW - daysAgo * DAY));
        return o;
    };
    // vendas com estados de entrega variados
    const sold = [];
    for (let i = 0; i < 14; i++) sold.push(await buy(allFans[i + 3], v(pick(['camisa-oficial-2026', 'camisa-alternativa-azul', 'camisa-treino']), pick(['P', 'M', 'G'])), 1, 5 + i * 3));
    sold.push(await buy(main, v('bone-acef', 'Único'), 1, 20));
    sold.push(await buy(main, v('camisa-oficial-2026', 'M'), 1, 60));
    for (const [k, o] of sold.entries()) {
        const items = await prisma.orderItem.findMany({ where: { orderId: o.id } });
        for (const it of items) {
            if (k % 3 === 0) await setDeliveryStatus(it.id, 'DELIVERED', staff.president.id);
            else if (k % 3 === 1) await setDeliveryStatus(it.id, 'READY_FOR_PICKUP', staff.president.id);
        }
    }
    // venda presencial (pagamento manual) + estorno de exemplo
    const posOrder = await createOrder({ userId: null, channel: 'POS', pos: true, createdById: staff.org1.id, customer: { name: 'Cliente balcão (exemplo)' }, lines: [{ kind: 'PRODUCT', variantId: v('bone-acef', 'Único'), quantity: 2 }] });
    await startPayment(posOrder.id, 'CASH', { registeredById: staff.org1.id, registeredByName: staff.org1.name, note: 'Venda na lojinha do ginásio' });
    const refundOrder = await createOrder({ userId: allFans[8].id, channel: 'POS', pos: true, createdById: staff.org1.id, customer: customerOf(allFans[8]), lines: [{ kind: 'PRODUCT', variantId: v('camisa-treino', 'G'), quantity: 1 }] });
    const refundPay = await startPayment(refundOrder.id, 'MANUAL', { registeredById: staff.org1.id, registeredByName: staff.org1.name, note: 'PIX direto na chave do clube' });
    await refundPayment(refundPay.id, { reason: 'Tamanho errado - devolução (exemplo)', byUserId: staff.president.id });

    // lista de espera da GG (esgotada): 4 na fila; chega 1 unidade -> 1º é chamado
    const gg = v('camisa-oficial-2026', 'GG');
    for (const u of [fan, allFans[10], allFans[11], allFans[12]]) await joinWaitlist(u.id, gg, 1);
    await adjustStock(gg, 1, 'RESTOCK', staff.president.id, 'Chegou 1 unidade do fornecedor (exemplo)');

    // jaqueta sob encomenda (paga antes): lote 1 em produção, lote 2 aberto
    const jac = created['jaqueta-personalizada'];
    const b1 = await createBatch({ productId: jac.id, name: 'Lote 1 - outubro', minQuantity: 20, notes: 'Fornecedor de exemplo', byUserId: staff.president.id });
    for (let i = 0; i < 9; i++) await buy(allFans[(i * 3) % allFans.length], v('jaqueta-personalizada', pick(['P', 'M', 'G', 'GG'])), 1, 25 - i);
    await setBatchStatus(b1.id, 'CLOSED', staff.president.id);
    await setBatchStatus(b1.id, 'IN_PRODUCTION', staff.president.id);
    await createBatch({ productId: jac.id, name: 'Lote 2 - dezembro', minQuantity: 15, closesAt: new Date(NOW + 20 * DAY), byUserId: staff.president.id });
    for (let i = 0; i < 4; i++) await buy(allFans[(i * 5 + 2) % allFans.length], v('jaqueta-personalizada', pick(['M', 'G'])), 1, 3 - i * 0.5);
    await buy(main, v('jaqueta-personalizada', 'M'), 1, 1);

    // caneca (paga na liberação): lote aberto com fila
    const mug = created['caneca-com-nome'];
    await createBatch({ productId: mug.id, name: 'Lote natal', minQuantity: 10, closesAt: new Date(NOW + 12 * DAY), byUserId: staff.president.id });
    for (const u of [main, fan, ...allFans.slice(14, 21)]) await joinWaitlist(u.id, v('caneca-com-nome', 'Padrão'), 1 + Math.floor(R() * 2), 'Nome na caneca: (exemplo)');

    // pedido aguardando pagamento na loja
    const pend = await createOrder({ userId: allFans[20].id, channel: 'APP', customer: customerOf(allFans[20]), lines: [{ kind: 'PRODUCT', variantId: v('bone-acef', 'Único'), quantity: 1 }] });
    await prisma.order.update({ where: { id: pend.id }, data: { expiresAt: new Date(NOW + 2 * DAY) } });
    return defs.length;
}

async function seedFeed(
    past: { ev: { id: number, slug: string }, opp: string, hs: number, as: number, startsAt: Date, round: string }[],
    future: { ev: { id: number, slug: string }, opp: string, round: string, startsAt: Date }[],
    table: Map<string, { team: string, p: number, j: number, v: number, e: number, d: number, sg: number }>,
    staff: Record<string, { id: number }>, masterId: number, players: { nickname: string | null }[],
) {
    const post = async (d: { title: string, body: string, images?: string[], visibility?: 'PUBLIC' | 'MEMBERS' | 'MIN_TIER', minTier?: number, pinned?: boolean, when: Date, eventId?: number, author?: number }) =>
        prisma.post.create({ data: { title: d.title, body: d.body, imageKeys: d.images ?? [], visibility: d.visibility ?? 'PUBLIC', minTierLevel: d.visibility === 'MIN_TIER' ? (d.minTier ?? 2) : null, pinned: !!d.pinned, publishedAt: d.when, createdAt: d.when, eventId: d.eventId ?? null, authorId: d.author ?? staff.president.id } });

    await post({ title: 'Seu lugar no Filtradores começa aqui!', body: 'Seja sócio e garanta entrada nos jogos, descontos na loja e conteúdo exclusivo. Associe-se pelo app ou pelo site.\n\n(Post de exemplo - ambiente de demonstração.)', images: [await putPublic('posts/seja-socio.webp', await postArt(['SEJA', 'SÓCIO'], 'Garanta seus benefícios e apoie o clube', '#f5b700'))], pinned: true, when: new Date(NOW - 40 * DAY) });
    for (const [i, g] of past.entries()) {
        const photos = [];
        for (let k = 0; k < 4; k++) photos.push(await putPublic(`posts/jogo-${i + 1}-foto-${k + 1}.webp`, await gamePhoto(i * 10 + k, `${g.round} · ${['Lance do jogo', 'Comemoração do gol', 'Torcida no Morangão', 'Disputa de bola'][k]}`)));
        const res = g.hs > g.as ? 'Vitória' : g.hs === g.as ? 'Empate' : 'Derrota';
        await post({ title: `Fim de jogo: Filtradores ${g.hs} x ${g.as} ${g.opp}`, body: `${res} no Morangão pela ${g.round}. Confira as fotos da partida!\n\nGols (exemplo): ${players.slice(5, 5 + Math.max(1, g.hs)).map(p => p.nickname).join(', ')}.`, images: photos, when: new Date(g.startsAt.getTime() + 3 * 3_600_000), eventId: g.ev.id, author: staff.org1.id });
        if (i % 2 === 0) await post({ title: `Bastidores: vestiário após o jogo contra ${g.opp}`, body: 'Conteúdo exclusivo para sócios: a conversa do treinador com o elenco depois da partida. (exemplo)', images: [photos[1]], visibility: 'MEMBERS', when: new Date(g.startsAt.getTime() + 20 * 3_600_000), eventId: g.ev.id, author: staff.coach.id });
    }
    const rows = [...table.values()].sort((a, b) => b.p - a.p || b.sg - a.sg).slice(0, 8);
    await post({ title: 'Classificação atualizada', body: 'Confira como ficou a tabela após a última rodada. (Tabela fictícia - exemplo.)', images: [await putPublic('posts/classificacao.webp', await standingsArt(COMPETITION, rows))], when: new Date(past[past.length - 1].startsAt.getTime() + DAY) });
    const nx = future[0];
    await post({ title: 'Semana de jogo: quartas de final!', body: `Filtradores x ${nx.opp} no ${VENUE}. Ingressos à venda no app e no site; sócios Raiz e Ouro entram com a carteirinha.`, images: [await putPublic('posts/semana-de-jogo.webp', await postArt(['SEMANA', 'DE JOGO'], `Quartas de final · Filtradores x ${nx.opp}`))], pinned: true, when: new Date(NOW - 2 * DAY), eventId: nx.ev.id });
    await post({ title: 'Ingressos à venda!', body: '1º lote com preço promocional até 2 dias antes do jogo. Pré-venda exclusiva para sócios. (exemplo)', images: [await putPublic('posts/ingressos.webp', await postArt(['INGRESSOS', 'À VENDA!'], 'Compre pelo app ou pelo site', '#d62631'))], when: new Date(NOW - 36 * 3_600_000), eventId: nx.ev.id });
    await post({ title: 'Escalação confirmada', body: `O professor divulgou os titulares para o jogo contra ${nx.opp}. Veja na página do jogo!`, when: new Date(NOW - 20 * 3_600_000), eventId: nx.ev.id, author: staff.coach.id });
    await post({ title: 'Papo com o elenco (Sócio Raiz e Ouro)', body: 'Entrevista exclusiva com os capitães sobre a reta final do campeonato. Conteúdo prime para sócios a partir do nível Raiz. (exemplo)', images: [await putPublic('posts/papo-elenco.webp', await gamePhoto(77, 'Papo com o elenco - conteúdo prime'))], visibility: 'MIN_TIER', minTier: 2, when: new Date(NOW - 5 * DAY), author: staff.coach.id });
    await post({ title: 'Nova camisa oficial 2026 na loja', body: 'Já disponível na loja do app. Tamanho GG esgotado: entre na lista de espera! (exemplo)', images: [await putPublic('posts/camisa.webp', await productImage('shirt', 'Camisa oficial 2026'))], when: new Date(NOW - 15 * DAY), author: masterId });
    await post({ title: 'Jaquetas personalizadas: lote 2 aberto', body: 'Encomende até o fechamento do lote. Pagamento antecipado, retirada no ginásio. (exemplo)', images: [await putPublic('posts/jaqueta.webp', await productImage('jacket', 'Jaqueta personalizada'))], when: new Date(NOW - 4 * DAY) });
    await post({ title: 'Rascunho: anúncio da final', body: 'Rascunho de exemplo (não publicado).', when: new Date(NOW), visibility: 'PUBLIC' }).then(p => prisma.post.update({ where: { id: p.id }, data: { publishedAt: null } }));
}

main()
    .then(async () => { await prisma.$disconnect(); getRedis().disconnect(); process.exit(0); })
    .catch(async e => { console.error('\n✘ Falha no seed de demonstração:', e); await prisma.$disconnect(); getRedis().disconnect(); process.exit(1); });
