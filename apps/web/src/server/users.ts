/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Usuários: login, cadastro, 2FA, senha, convites, perfil, exclusão de conta
 */
import 'server-only';
import { hash, verify } from '@node-rs/argon2';
import type { NextRequest } from 'next/server';
import { prisma, type TempHashOperation } from '@filt/db';
import { audit, AuthError, cache, CoreEnv, enqueueMail, InconsistencyError, InputError, LogSystem, newToken, NotFoundError, sha256 } from '@filt/core';
import { decryptString, encrypt } from '@filt/integrations/crypto';
import { mailHtml } from '@filt/integrations/mailer';
import { StorageSystem } from '@filt/integrations/storage';
import type { SessionInfo } from '@filt/shared';
import { type AuthInfo, clientIp, createSession, invalidateUserAuth, markSessionMfaOk } from '@/lib/authenticate';
import ENV from '@/lib/environmentConstants';
import { newRecoveryCodes, newTotpSecret, totpSetupPayload, verifyRecoveryCode, verifyTotp } from '@/lib/totp';

const ARGON = { algorithm: 2 as const };
// hash real (gerado uma vez) para equalizar o tempo de resposta quando o e-mail não existe (evita enumeração de usuários)
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hash('senha-inexistente-para-timing', ARGON));

export const hashPassword = (p: string) => hash(p, ARGON);

async function rateLimit(key: string) {
    const n = await cache.hit(`rl:${key}`, 15 * 60);
    if (n > ENV.LOGIN_MAX_ATTEMPTS) throw new InputError('Muitas tentativas. Aguarde alguns minutos e tente novamente.', 261115210001, 429);
}

// ─── Login / cadastro ───────────────────────────────────────────────────────

export async function login(req: NextRequest, email: string, password: string, client: string) {
    await rateLimit(`login:${clientIp(req)}:${email}`);
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = await verify(user?.passwordHash ?? await getDummyHash(), password).catch(() => false);
    if (!user || !user.passwordHash || !ok || user.deletedAt) {
        LogSystem.warn(261115210002, `Falha de login: ${email}`);
        throw new AuthError('E-mail ou senha incorretos', 261115210002);
    }
    if (user.status !== 'ACTIVE') throw new AuthError('Usuário bloqueado. Fale com a diretoria.', 261115210003, 403);
    const mfaPending = !!user.totpEnabledAt;
    const s = await createSession(user.id, req, { mfaPending, client });
    LogSystem.info(261115210004, `Login: ${email} (${client})${mfaPending ? ' - aguardando 2FA' : ''}`, { userId: user.id });
    const requires2fa = user.isMaster || (await prisma.userRole.count({ where: { userId: user.id, Role: { require2fa: true } } })) > 0;
    return { ...s, mfaPending, mfaSetupRequired: requires2fa && !user.totpEnabledAt };
}

export async function register(req: NextRequest, input: { name: string, email: string, password: string, cpf?: string, phone?: string, client: string }) {
    await rateLimit(`register:${clientIp(req)}`);
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new InconsistencyError('Já existe uma conta com este e-mail. Use "esqueci minha senha".', 261115210005);
    if (input.cpf && await prisma.user.findUnique({ where: { cpf: input.cpf } })) throw new InconsistencyError('Já existe uma conta com este CPF', 261115210006);
    const user = await prisma.user.create({
        data: { name: input.name, email: input.email, cpf: input.cpf ?? null, phone: input.phone ?? null, passwordHash: await hashPassword(input.password) },
    });
    await sendTokenMail(user.id, 'EMAIL_CONFIRMATION');
    LogSystem.info(261115210007, `Novo cadastro: ${input.email}`, { userId: user.id });
    return createSession(user.id, req, { mfaPending: false, client: input.client });
}

// ─── Tokens por e-mail (confirmação, reset, convite) ────────────────────────

const TOKEN_TTL_H: Record<TempHashOperation, number> = { EMAIL_CONFIRMATION: 72, PASSWORD_RESET: 2, INVITE: 7 * 24 };

export async function sendTokenMail(userId: number, operation: TempHashOperation): Promise<string> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const token = newToken();
    await prisma.tempHash.create({ data: { userId, operation, hash: sha256(token), expiresAt: new Date(Date.now() + TOKEN_TTL_H[operation] * 3_600_000) } });
    const paths: Record<TempHashOperation, [string, string, string]> = {
        EMAIL_CONFIRMATION: ['/confirmar-email', 'Confirme seu e-mail', 'Confirme seu e-mail para receber ingressos e avisos do clube.'],
        PASSWORD_RESET: ['/redefinir-senha', 'Redefinição de senha', 'Recebemos um pedido para redefinir sua senha. O link vale por 2 horas. Se não foi você, ignore este e-mail.'],
        INVITE: ['/convite', 'Você foi convidado(a) para o sistema do Filtradores', 'A diretoria criou um acesso para você. Defina sua senha pelo link abaixo (válido por 7 dias).'],
    };
    const [path, subject, text] = paths[operation];
    const url = `${ENV.APP_URL}${path}?token=${token}`;
    await enqueueMail({ to: user.email, subject, text: `Olá, ${user.name}!\n\n${text}\n\n${url}`, html: mailHtml(subject, [`Olá, ${user.name}!`, text], { label: 'Abrir', url }) });
    return url;
}

async function consumeToken(token: string, operation: TempHashOperation) {
    const t = await prisma.tempHash.findUnique({ where: { hash: sha256(token) } });
    if (!t || t.operation !== operation || t.usedAt || t.expiresAt < new Date()) throw new InputError('Link inválido ou expirado', 261115210008);
    await prisma.tempHash.update({ where: { id: t.id }, data: { usedAt: new Date() } });
    return t.userId;
}

export async function confirmEmail(token: string) {
    const userId = await consumeToken(token, 'EMAIL_CONFIRMATION');
    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
}

export async function forgotPassword(req: NextRequest, email: string) {
    await rateLimit(`forgot:${clientIp(req)}`);
    const user = await prisma.user.findUnique({ where: { email } });
    // resposta sempre igual (não revela se o e-mail existe)
    if (user && !user.deletedAt && user.status === 'ACTIVE') await sendTokenMail(user.id, 'PASSWORD_RESET');
}

/** Reset de senha OU aceite de convite: define a senha e encerra as outras sessões */
export async function setPasswordWithToken(token: string, password: string, operation: 'PASSWORD_RESET' | 'INVITE') {
    const userId = await consumeToken(token, operation);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password), emailVerifiedAt: new Date() } });
    await invalidateUserAuth(userId, { revoke: true });
    await audit({ userId, action: operation === 'INVITE' ? 'user.invite_accept' : 'user.password_reset', entity: 'user', entityId: userId });
}

export async function changePassword(auth: AuthInfo, current: string, next: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.user.id } });
    if (!user.passwordHash || !(await verify(user.passwordHash, current).catch(() => false))) throw new InputError('Senha atual incorreta', 261115210009);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
    await invalidateUserAuth(user.id, { revoke: true, exceptSessionId: auth.sessionId });
}

// ─── 2FA ────────────────────────────────────────────────────────────────────

/** Gera um segredo novo (ainda não ativo) e devolve o QR para o app autenticador */
export async function startTotpSetup(auth: AuthInfo) {
    if (auth.user.totpEnabled) throw new InconsistencyError('A verificação em duas etapas já está ativa', 261115210010);
    const secret = newTotpSecret();
    // guarda criptografado no usuário; só vale após confirmar um código (totpEnabledAt)
    await prisma.user.update({ where: { id: auth.user.id }, data: { totpSecretEnc: encrypt(secret), totpEnabledAt: null } });
    return totpSetupPayload(secret, auth.user.email);
}

export async function confirmTotpSetup(auth: AuthInfo, code: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.user.id } });
    if (user.totpEnabledAt) throw new InconsistencyError('A verificação em duas etapas já está ativa', 261115210011);
    if (!user.totpSecretEnc) throw new InputError('Inicie o cadastro do 2FA novamente', 261115210012);
    if (!verifyTotp(decryptString(user.totpSecretEnc), code)) throw new InputError('Código incorreto. Confira o horário do celular e tente de novo.', 261115210013);
    const codes = await newRecoveryCodes();
    await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { totpEnabledAt: new Date() } }),
        prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
        prisma.recoveryCode.createMany({ data: codes.hashes.map(codeHash => ({ userId: user.id, codeHash })) }),
    ]);
    await markSessionMfaOk(auth.sessionId);
    await invalidateUserAuth(user.id);
    await audit({ userId: user.id, action: 'user.2fa_enable', entity: 'user', entityId: user.id });
    return { recoveryCodes: codes.plain };
}

/** Valida o 2FA do login (código TOTP ou código de recuperação) */
export async function verifyMfa(req: NextRequest, auth: AuthInfo, code: string) {
    await rateLimit(`mfa:${auth.user.id}`);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.user.id }, include: { RecoveryCodes: { where: { usedAt: null } } } });
    if (!user.totpEnabledAt || !user.totpSecretEnc) { await markSessionMfaOk(auth.sessionId); return; }
    const clean = code.replace(/\s/g, '');
    if (/^\d{6}$/.test(clean) && verifyTotp(decryptString(user.totpSecretEnc), clean)) { await markSessionMfaOk(auth.sessionId); return; }
    for (const rc of user.RecoveryCodes) {
        if (await verifyRecoveryCode(rc.codeHash, code)) {
            await prisma.recoveryCode.update({ where: { id: rc.id }, data: { usedAt: new Date() } });
            await markSessionMfaOk(auth.sessionId);
            LogSystem.INFO(261115210014, `Código de recuperação 2FA usado por ${user.email}`, { userId: user.id });
            return;
        }
    }
    LogSystem.warn(261115210015, `2FA incorreto: ${user.email} (${clientIp(req)})`, { userId: user.id });
    throw new InputError('Código incorreto', 261115210015);
}

export async function disableTotp(auth: AuthInfo, code: string, targetUserId?: number) {
    const userId = targetUserId ?? auth.user.id;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!targetUserId) {
        if (user.isMaster) throw new InconsistencyError('O 2FA é obrigatório para o master', 261115210016);
        if (!user.totpSecretEnc || !verifyTotp(decryptString(user.totpSecretEnc), code)) throw new InputError('Código incorreto', 261115210017);
    }
    await prisma.user.update({ where: { id: userId }, data: { totpEnabledAt: null, totpSecretEnc: null } });
    await prisma.recoveryCode.deleteMany({ where: { userId } });
    await invalidateUserAuth(userId, { revoke: !!targetUserId });
    await audit({ userId: auth.user.id, action: targetUserId ? 'user.2fa_reset' : 'user.2fa_disable', entity: 'user', entityId: userId });
}

// ─── Sessão atual ───────────────────────────────────────────────────────────

export async function sessionInfo(auth: AuthInfo): Promise<SessionInfo> {
    const [user, unread] = await Promise.all([
        prisma.user.findUniqueOrThrow({
            where: { id: auth.user.id },
            include: { Membership: { include: { Plan: true, Charges: { where: { status: { in: ['OPEN', 'OVERDUE'] } }, orderBy: { dueDate: 'asc' }, take: 1, include: { OrderItems: { include: { Order: true } } } } } } },
        }),
        prisma.notification.count({ where: { userId: auth.user.id, readAt: null } }),
    ]);
    const m = user.Membership;
    const charge = m?.Charges[0];
    const pendingOrder = charge?.OrderItems.map(i => i.Order).find(o => o.status === 'PENDING_PAYMENT');
    return {
        user: {
            id: user.id, name: user.name, email: user.email, cpf: user.cpf, phone: user.phone, birthDate: user.birthDate?.toISOString().slice(0, 10) ?? null,
            photoUrl: StorageSystem.url(user.photoKey), isMaster: user.isMaster, totpEnabled: !!user.totpEnabledAt, emailVerified: !!user.emailVerifiedAt,
        },
        roles: auth.roles,
        permissions: auth.permissions,
        mfaPending: auth.mfaPending,
        mfaSetupRequired: auth.mfaSetupRequired,
        membership: m ? {
            id: m.id, status: m.status, memberNumber: m.memberNumber, currentPeriodEnd: m.currentPeriodEnd?.toISOString() ?? null,
            plan: { id: m.Plan.id, name: m.Plan.name, tierLevel: m.Plan.tierLevel, color: m.Plan.color, eventAccess: m.Plan.eventAccess, period: m.Plan.period, priceCents: m.Plan.priceCents },
            openCharge: charge ? { id: charge.id, amountCents: charge.amountCents, dueDate: charge.dueDate.toISOString(), orderId: pendingOrder?.id ?? null } : null,
        } : null,
        unreadNotifications: unread,
    };
}

/** Exclusão de conta pelo próprio usuário (exigência da App Store / LGPD): anonimiza e mantém o histórico financeiro */
export async function deleteOwnAccount(auth: AuthInfo, password: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.user.id } });
    if (user.isMaster) throw new InconsistencyError('A conta master não pode ser excluída', 261115210018);
    if (!user.passwordHash || !(await verify(user.passwordHash, password).catch(() => false))) throw new InputError('Senha incorreta', 261115210019);
    const m = await prisma.membership.findUnique({ where: { userId: user.id } });
    if (m && (m.status === 'ACTIVE' || m.status === 'PENDING')) await prisma.membership.update({ where: { id: m.id }, data: { status: 'CANCELED', canceledAt: new Date(), cancelReason: 'Conta excluída pelo usuário' } });
    if (user.photoKey) await StorageSystem.remove(user.photoKey).catch(() => undefined);
    await prisma.user.update({
        where: { id: user.id },
        data: { name: 'Usuário excluído', email: `excluido-${user.id}-${Date.now()}@filtradores.invalid`, cpf: null, phone: null, birthDate: null, photoKey: null, passwordHash: null, totpSecretEnc: null, totpEnabledAt: null, deletedAt: new Date() },
    });
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await invalidateUserAuth(user.id, { revoke: true });
    await audit({ userId: user.id, action: 'user.delete_self', entity: 'user', entityId: user.id });
}

/** Diretoria cria um usuário (staff ou torcedor) e envia convite para definir a senha */
export async function inviteUser(by: AuthInfo, input: { name: string, email: string, cpf?: string | null, phone?: string | null, roleIds: number[] }) {
    if (await prisma.user.findUnique({ where: { email: input.email } })) throw new InconsistencyError('Já existe um usuário com este e-mail', 261115210020);
    const user = await prisma.user.create({
        data: { name: input.name, email: input.email, cpf: input.cpf ?? null, phone: input.phone ?? null, createdById: by.user.id, Roles: { create: input.roleIds.map(roleId => ({ roleId })) } },
    });
    const url = await sendTokenMail(user.id, 'INVITE');
    await audit({ userId: by.user.id, action: 'user.invite', entity: 'user', entityId: user.id, data: { roleIds: input.roleIds } });
    // o link também volta para a diretoria (SMTP pode não estar configurado)
    return { user, inviteUrl: url };
}

export async function getUserOr404(id: number) {
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.deletedAt) throw new NotFoundError('Usuário não encontrado', 261115210021);
    return u;
}

export const appUrl = () => CoreEnv.APP_URL;
