/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Testes da resolução de permissões
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_ROLES, PERMISSIONS, isPermission, resolvePermissions } from '../src/permissions';

describe('resolvePermissions', () => {
    it('master tem todas', () => {
        expect(resolvePermissions({ isMaster: true, rolePermissions: [], overrides: [{ permission: 'users.read', effect: 'DENY' }] })).toEqual(PERMISSIONS);
    });
    it('união dos papéis, ignora chaves desconhecidas', () => {
        const r = resolvePermissions({ isMaster: false, rolePermissions: ['checkin.validate', 'feed.write', 'xyz.abc'], overrides: [] });
        expect(r).toEqual(['checkin.validate', 'feed.write']);
    });
    it('DENY individual vence GRANT e papel', () => {
        const r = resolvePermissions({
            isMaster: false, rolePermissions: ['orders.read', 'orders.manage'],
            overrides: [{ permission: 'orders.manage', effect: 'DENY' }, { permission: 'payments.read', effect: 'GRANT' }],
        });
        expect(r).toEqual(['orders.read', 'payments.read']);
    });
    it('papéis padrão usam apenas permissões válidas', () => {
        for (const role of DEFAULT_ROLES) for (const p of role.permissions) expect(isPermission(p)).toBe(true);
        expect(DEFAULT_ROLES.find(r => r.key === 'board')!.permissions).not.toContain('roles.manage');
    });
});
