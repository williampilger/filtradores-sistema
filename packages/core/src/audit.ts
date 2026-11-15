/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Auditoria de ações administrativas (cortesias, pagamentos manuais, permissões...)
 */
import { prisma, type Prisma } from '@filt/db';
import { LogSystem } from './log';

export type AuditInput = { userId?: number | null, action: string, entity?: string, entityId?: string | number, data?: unknown, ip?: string | null };

export async function audit(a: AuditInput, tx: Prisma.TransactionClient = prisma): Promise<void> {
    try {
        await tx.auditLog.create({
            data: {
                userId: a.userId ?? null, action: a.action, entity: a.entity ?? null,
                entityId: a.entityId === undefined ? null : String(a.entityId),
                data: a.data === undefined ? undefined : (JSON.parse(JSON.stringify(a.data)) as Prisma.InputJsonValue),
                ip: a.ip ?? null,
            },
        });
    } catch (e) {
        // auditoria nunca derruba a operação principal
        LogSystem.ERROR(261115100001, `Falha ao gravar auditoria ${a.action}: ${(e as Error).message}`);
    }
}
