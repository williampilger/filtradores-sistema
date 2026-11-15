/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Sócios: adesão, cobranças (geradas pelo sistema), carteirinha, ciclo de vida
 *
 * - Cada cobrança (MembershipCharge) é paga através de um Order com item MEMBERSHIP -> mesmo fluxo de pagamento da loja.
 * - O worker (billingSweep) gera a renovação N dias antes do fim do período e aplica carência/expiração.
 * - Recorrência automática no cartão (gateway) fica no ToDo.
 */
import { prisma, type Membership, type MembershipPlan } from '@filt/db';
import { addDays, deriveCardKey, membershipStatusAt, shouldGenerateRenewal, LABELS, formatDate, type MemberCard } from '@filt/shared';
import { StorageSystem } from '@filt/integrations/storage';
import { audit } from './audit';
import { CoreEnv } from './env';
import { InconsistencyError, InputError, NotFoundError } from './errors';
import { LogSystem } from './log';
import { notifyUser } from './notify';
import { createOrder, type Customer } from './orders';

export function cardKeyFor(m: Pick<Membership, 'id' | 'qrVersion'>): string {
    if (!CoreEnv.QR_SIGNING_SECRET) throw new Error('261115140001 - QR_SIGNING_SECRET não configurado');
    return deriveCardKey(CoreEnv.QR_SIGNING_SECRET, m.id, m.qrVersion);
}

export async function memberCard(userId: number): Promise<MemberCard | null> {
    const m = await prisma.membership.findUnique({ where: { userId }, include: { Plan: true, User: true } });
    if (!m || m.status === 'PENDING') return null;
    return {
        membershipId: m.id, memberNumber: m.memberNumber, name: m.User.name, photoUrl: StorageSystem.url(m.User.photoKey),
        planName: m.Plan.name, planColor: m.Plan.color, tierLevel: m.Plan.tierLevel, status: m.status,
        validUntil: m.currentPeriodEnd?.toISOString() ?? null, cardKey: cardKeyFor(m),
    };
}

async function customerOf(userId: number): Promise<Customer> {
    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return { name: u.name, email: u.email, cpf: u.cpf, phone: u.phone };
}

/** Pedido para pagar uma cobrança (reaproveita pedido pendente da mesma cobrança) */
export async function orderForCharge(chargeId: number, userId: number, channel: 'WEB' | 'APP') {
    const existing = await prisma.order.findFirst({
        where: { status: 'PENDING_PAYMENT', Items: { some: { membershipChargeId: chargeId } } }, orderBy: { id: 'desc' },
    });
    if (existing) return existing;
    const charge = await prisma.membershipCharge.findUnique({ where: { id: chargeId }, include: { Membership: true } });
    if (!charge || charge.Membership.userId !== userId) throw new NotFoundError('Cobrança não encontrada', 261115140002);
    return createOrder({ userId, channel, customer: await customerOf(userId), lines: [{ kind: 'MEMBERSHIP', chargeId }] });
}

/** Torcedor se associa (ou troca de plano enquanto ainda não pagou / reativa vínculo encerrado) */
export async function joinPlan(userId: number, planId: number, channel: 'WEB' | 'APP') {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active || plan.deletedAt) throw new NotFoundError('Plano não encontrado', 261115140003);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.cpf) throw new InputError('Cadastre seu CPF no perfil antes de se associar', 261115140004);

    const current = await prisma.membership.findUnique({ where: { userId } });
    if (current && (current.status === 'ACTIVE' || current.status === 'OVERDUE')) {
        throw new InconsistencyError('Você já é sócio. Para trocar de plano, fale com a diretoria.', 261115140005);
    }

    const firstTime = !current?.startedAt;
    const membership = current
        ? await prisma.membership.update({ where: { id: current.id }, data: { planId, status: 'PENDING', canceledAt: null, cancelReason: null } })
        : await prisma.membership.create({ data: { userId, planId, status: 'PENDING' } });

    // cancela cobranças em aberto anteriores (troca de plano antes de pagar)
    await prisma.membershipCharge.updateMany({ where: { membershipId: membership.id, status: { in: ['OPEN', 'OVERDUE'] } }, data: { status: 'CANCELED' } });
    const charge = await prisma.membershipCharge.create({
        data: {
            membershipId: membership.id, planId, amountCents: plan.priceCents + (firstTime ? plan.enrollmentFeeCents : 0),
            dueDate: addDays(new Date(), 3), isEnrollment: true,
        },
    });
    LogSystem.info(261115140006, `Adesão iniciada: usuário ${userId} -> plano ${plan.name}`);
    return createOrder({ userId, channel, customer: await customerOf(userId), lines: [{ kind: 'MEMBERSHIP', chargeId: charge.id }] });
}

/** Diretoria cadastra/ajusta um sócio manualmente (ex.: sócios antigos, pagamento fora do sistema) */
export async function adminSetMembership(input: { userId: number, planId: number, status: 'ACTIVE' | 'PENDING', currentPeriodEnd: Date | null, byUserId: number }) {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: input.planId } });
    if (!plan) throw new NotFoundError('Plano não encontrado', 261115140007);
    const existing = await prisma.membership.findUnique({ where: { userId: input.userId } });
    let memberNumber = existing?.memberNumber ?? null;
    if (input.status === 'ACTIVE' && memberNumber == null) {
        const max = await prisma.membership.aggregate({ _max: { memberNumber: true } });
        memberNumber = (max._max.memberNumber ?? 0) + 1;
    }
    const data = {
        planId: input.planId, status: input.status, memberNumber,
        currentPeriodEnd: input.currentPeriodEnd, currentPeriodStart: input.status === 'ACTIVE' ? (existing?.currentPeriodStart ?? new Date()) : null,
        startedAt: existing?.startedAt ?? (input.status === 'ACTIVE' ? new Date() : null), canceledAt: null, cancelReason: null,
    };
    const m = existing
        ? await prisma.membership.update({ where: { id: existing.id }, data })
        : await prisma.membership.create({ data: { userId: input.userId, ...data } });
    await audit({ userId: input.byUserId, action: 'membership.set', entity: 'membership', entityId: m.id, data: { planId: input.planId, status: input.status, currentPeriodEnd: input.currentPeriodEnd } });
    return m;
}

export async function cancelMembership(membershipId: number, reason: string, byUserId: number | null) {
    const m = await prisma.membership.update({ where: { id: membershipId }, data: { status: 'CANCELED', canceledAt: new Date(), cancelReason: reason.slice(0, 255) } });
    await prisma.membershipCharge.updateMany({ where: { membershipId, status: { in: ['OPEN', 'OVERDUE'] } }, data: { status: 'CANCELED' } });
    await audit({ userId: byUserId, action: 'membership.cancel', entity: 'membership', entityId: membershipId, data: { reason } });
    return m;
}

/** Invalida o QR atual (celular perdido / suspeita de compartilhamento) */
export async function rotateMemberCard(membershipId: number, byUserId: number | null) {
    await prisma.membership.update({ where: { id: membershipId }, data: { qrVersion: { increment: 1 } } });
    await audit({ userId: byUserId, action: 'membership.rotate_card', entity: 'membership', entityId: membershipId });
}

/** Cobrança avulsa gerada pela diretoria (ex.: renovar agora) */
export async function createCharge(membershipId: number, input: { amountCents?: number, dueDate?: Date, byUserId: number | null }) {
    const m = await prisma.membership.findUnique({ where: { id: membershipId }, include: { Plan: true } });
    if (!m) throw new NotFoundError('Sócio não encontrado', 261115140008);
    const open = await prisma.membershipCharge.findFirst({ where: { membershipId, status: { in: ['OPEN', 'OVERDUE'] } } });
    if (open) throw new InconsistencyError('Já existe uma cobrança em aberto para este sócio', 261115140009);
    const charge = await prisma.membershipCharge.create({
        data: { membershipId, planId: m.planId, amountCents: input.amountCents ?? m.Plan.priceCents, dueDate: input.dueDate ?? m.currentPeriodEnd ?? addDays(new Date(), 3) },
    });
    if (input.byUserId) await audit({ userId: input.byUserId, action: 'membership.charge', entity: 'membership', entityId: membershipId, data: { chargeId: charge.id } });
    return charge;
}

/**
 * Worker (diário):
 *  1. gera cobranças de renovação N dias antes do fim do período
 *  2. marca cobranças vencidas
 *  3. aplica carência -> OVERDUE -> EXPIRED
 */
export async function billingSweep(now = new Date()): Promise<{ charges: number, statusChanges: number }> {
    let charges = 0, statusChanges = 0;

    const active = await prisma.membership.findMany({
        where: { status: { in: ['ACTIVE', 'OVERDUE'] }, currentPeriodEnd: { not: null } },
        include: { Plan: true, Charges: { where: { status: { in: ['OPEN', 'OVERDUE'] } } } },
    });

    for (const m of active) {
        // 1. renovação
        if (!m.Charges.length && m.Plan.active && !m.Plan.deletedAt && shouldGenerateRenewal(now, m.currentPeriodEnd!, CoreEnv.MEMBERSHIP_BILLING_DAYS_BEFORE)) {
            await prisma.membershipCharge.create({ data: { membershipId: m.id, planId: m.planId, amountCents: m.Plan.priceCents, dueDate: m.currentPeriodEnd! } });
            charges++;
            await notifyUser(m.userId, {
                title: 'Renovação do seu plano de sócio',
                body: `Sua mensalidade do plano ${m.Plan.name} vence em ${formatDate(m.currentPeriodEnd)}. Pague pelo app ou pelo site para continuar com seus benefícios.`,
                link: '/minha-conta/socio',
            });
        }
        // 3. status por datas
        const next = membershipStatusAt({ now, status: m.status, currentPeriodEnd: m.currentPeriodEnd, graceDays: CoreEnv.MEMBERSHIP_GRACE_DAYS, expireDays: CoreEnv.MEMBERSHIP_EXPIRE_DAYS });
        if (next !== m.status) {
            await prisma.membership.update({ where: { id: m.id }, data: { status: next } });
            statusChanges++;
            await notifyUser(m.userId, { title: `Sócio: ${LABELS.membershipStatus[next]}`, body: next === 'OVERDUE' ? 'Sua mensalidade está atrasada. Regularize para voltar a entrar nos jogos.' : 'Seu vínculo de sócio expirou. Associe-se novamente quando quiser!', link: '/minha-conta/socio' });
        }
    }

    // 2. cobranças vencidas
    await prisma.membershipCharge.updateMany({ where: { status: 'OPEN', dueDate: { lt: addDays(now, -1) } }, data: { status: 'OVERDUE' } });

    if (charges || statusChanges) LogSystem.info(261115140010, `Cobrança de sócios: ${charges} renovação(ões) geradas, ${statusChanges} mudança(s) de status`);
    return { charges, statusChanges };
}

export type PlanWithCount = MembershipPlan & { _count: { Memberships: number } };
