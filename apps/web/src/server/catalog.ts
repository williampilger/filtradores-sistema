/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Consultas públicas (eventos, loja, planos, feed, elenco) com as regras de visibilidade
 */
import 'server-only';
import { prisma, type Membership, type MembershipPlan } from '@filt/db';
import {
    canSeePost, memberEligibility, NotFoundError, productImageUrls, toEventListItem, toLineupDTO, toPlanDTO, toPlayerDTO, toPostDTO,
    toProductListItem, toTicketTypeDTO, toVariantDTOs, toWaitlistDTOs,
} from '@filt/core';
import { StorageSystem } from '@filt/integrations/storage';
import type { EventDetail, ProductDetail, PublicHome } from '@filt/shared';
import { type AuthInfo, isStaff } from '@/lib/authenticate';

type MemberWithPlan = (Membership & { Plan: MembershipPlan }) | null;

export async function viewerMembership(auth: AuthInfo | null): Promise<MemberWithPlan> {
    if (!auth) return null;
    return prisma.membership.findUnique({ where: { userId: auth.user.id }, include: { Plan: true } });
}
const activePlan = (m: MemberWithPlan) => (m && m.status === 'ACTIVE' ? m.Plan : null);

export async function listEvents(opts: { past?: boolean, take?: number } = {}) {
    const now = new Date(Date.now() - 6 * 3_600_000); // jogo de hoje continua na lista "próximos" por algumas horas
    const rows = await prisma.event.findMany({
        where: { deletedAt: null, status: { in: ['PUBLISHED', 'CLOSED'] }, startsAt: opts.past ? { lt: now } : { gte: now } },
        include: { TicketTypes: true }, orderBy: { startsAt: opts.past ? 'desc' : 'asc' }, take: opts.take ?? 50,
    });
    return rows.map(toEventListItem);
}

export async function eventDetail(slug: string, auth: AuthInfo | null): Promise<EventDetail> {
    const e = await prisma.event.findUnique({ where: { slug }, include: { TicketTypes: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }, Lineup: { include: { Entries: { include: { Player: true } } } } } });
    if (!e || e.deletedAt || (e.status === 'DRAFT' && !isStaff(auth))) throw new NotFoundError('Evento não encontrado', 261115230001);
    const m = await viewerMembership(auth);
    let memberBenefit: EventDetail['memberBenefit'] = null;
    if (m) {
        const el = await memberEligibility(e, m);
        const claimed = !!(await prisma.ticket.findFirst({ where: { eventId: e.id, membershipId: m.id, origin: 'MEMBER_CLAIM', status: { in: ['VALID', 'USED'] } } }));
        memberBenefit = { access: m.Plan.eventAccess, eligible: el.eligible, claimed, reason: el.reason };
    }
    return {
        ...toEventListItem(e), description: e.description, address: e.address, endsAt: e.endsAt?.toISOString() ?? null, gatesOpenAt: e.gatesOpenAt?.toISOString() ?? null,
        ticketTypes: e.TicketTypes.filter(t => t.active).map(t => toTicketTypeDTO(t, activePlan(m))),
        memberBenefit,
        lineup: e.Lineup && (e.Lineup.publishedAt || isStaff(auth)) ? toLineupDTO(e.Lineup) : null,
    };
}

export async function listProducts() {
    const rows = await prisma.product.findMany({ where: { active: true, deletedAt: null }, include: { Variants: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'desc' }] });
    return rows.map(toProductListItem);
}

export async function productDetail(slug: string, auth: AuthInfo | null): Promise<ProductDetail> {
    const p = await prisma.product.findUnique({ where: { slug }, include: { Variants: true } });
    if (!p || p.deletedAt || (!p.active && !isStaff(auth))) throw new NotFoundError('Produto não encontrado', 261115230002);
    const m = await viewerMembership(auth);
    const batch = p.fulfillment === 'ON_DEMAND' ? await prisma.productionBatch.findFirst({ where: { productId: p.id, status: 'OPEN' }, orderBy: { id: 'desc' } }) : null;
    const mine = auth ? await prisma.waitlistEntry.findMany({ where: { productId: p.id, userId: auth.user.id, status: { in: ['WAITING', 'NOTIFIED'] } }, include: { Product: true, Variant: true, Batch: true } }) : [];
    return {
        ...toProductListItem(p), description: p.description, imageUrls: productImageUrls(p), waitlistPayment: p.waitlistPayment, maxPerOrder: p.maxPerOrder,
        variants: toVariantDTOs(p, activePlan(m)),
        openBatch: batch ? { id: batch.id, name: batch.name, closesAt: batch.closesAt?.toISOString() ?? null } : null,
        myWaitlist: await toWaitlistDTOs(mine),
    };
}

export async function listPlans(includeInactive = false) {
    const rows = await prisma.membershipPlan.findMany({ where: { deletedAt: null, ...(includeInactive ? {} : { active: true }) }, orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }] });
    return rows.map(toPlanDTO);
}

export async function feed(auth: AuthInfo | null, page = 1, pageSize = 20) {
    const m = await viewerMembership(auth);
    const viewer = { membership: m, isStaff: isStaff(auth) };
    const rows = await prisma.post.findMany({
        where: { deletedAt: null, publishedAt: { not: null, lte: new Date() } },
        include: { Author: { select: { name: true } }, Event: { select: { id: true, slug: true, title: true } } },
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize,
    });
    return rows.map(p => toPostDTO(p, canSeePost(p, viewer)));
}

export async function squad() {
    const rows = await prisma.player.findMany({ where: { active: true }, orderBy: [{ position: 'asc' }, { number: 'asc' }] });
    return rows.map(toPlayerDTO);
}

export async function publicHome(auth: AuthInfo | null): Promise<PublicHome> {
    const club = await prisma.clubSettings.findUnique({ where: { id: 1 } });
    const [events, plans, products, posts] = await Promise.all([listEvents({ take: 6 }), listPlans(), listProducts(), feed(auth, 1, 6)]);
    return {
        club: {
            name: club?.name ?? 'Filtradores', shortName: club?.shortName ?? 'Filtradores', logoUrl: StorageSystem.url(club?.logoKey),
            primaryColor: club?.primaryColor ?? '#0b3d91', secondaryColor: club?.secondaryColor ?? '#f2c200', about: club?.about ?? null, instagram: club?.instagram ?? null,
        },
        events, plans, products: products.slice(0, 8), posts,
    };
}
