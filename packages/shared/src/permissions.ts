/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Catálogo de permissões (fonte única para API, painel web e app)
 *
 * MODELO (ver docs/permissoes.md):
 *  - Master (`User.isMaster`)  -> pode TUDO (ignora o catálogo). 2FA obrigatório.
 *  - Papéis (`Role`) editáveis pelo painel, cada um com N permissões deste catálogo.
 *  - Overrides por usuário (`UserPermissionOverride`): GRANT ou DENY individual.
 *  - Resolução: DENY individual > GRANT individual > união das permissões dos papéis.
 *  - `EventStaff` pode restringir permissões de evento (check-in/organização) a eventos específicos.
 *
 * ⚠️ Chaves são gravadas no banco (RolePermission.permission). Renomear = migration de dados.
 */

export const PERMISSION_GROUPS = [
    {
        key: 'admin', label: 'Administração', perms: {
            'users.read': 'Ver usuários',
            'users.write': 'Criar/editar/bloquear usuários',
            'roles.manage': 'Gerenciar papéis e permissões',
            'audit.read': 'Ver auditoria',
            'settings.manage': 'Configurações do clube',
        },
    },
    {
        key: 'members', label: 'Sócios', perms: {
            'members.read': 'Ver sócios',
            'members.write': 'Cadastrar/editar/cancelar sócios',
            'plans.manage': 'Gerenciar planos de sócio',
            'memberships.charges': 'Gerenciar cobranças de sócios',
        },
    },
    {
        key: 'events', label: 'Eventos e ingressos', perms: {
            'events.read': 'Ver eventos e painel da organização',
            'events.write': 'Criar/editar eventos e lotes',
            'tickets.sell_manual': 'Venda manual (portaria/PDV)',
            'tickets.courtesy': 'Emitir cortesias',
            'tickets.refund': 'Cancelar/reembolsar ingressos',
        },
    },
    {
        key: 'checkin', label: 'Controle de entrada', perms: {
            'checkin.validate': 'Validar entradas (leitor de QR)',
            'checkin.reports': 'Relatórios de entrada',
        },
    },
    {
        key: 'store', label: 'Loja', perms: {
            'products.write': 'Cadastrar produtos e variantes',
            'stock.adjust': 'Ajustar estoque',
            'waitlist.manage': 'Gerenciar listas de espera e lotes de produção',
            'orders.read': 'Ver pedidos',
            'orders.manage': 'Gerenciar pedidos (separação/entrega/cancelamento)',
        },
    },
    {
        key: 'finance', label: 'Financeiro', perms: {
            'payments.read': 'Ver pagamentos',
            'payments.manual': 'Registrar pagamento manual (dinheiro etc.)',
            'payments.refund': 'Estornar pagamentos',
            'gateways.manage': 'Configurar gateways de pagamento',
            'reports.finance': 'Relatórios financeiros',
        },
    },
    {
        key: 'team', label: 'Time e conteúdo', perms: {
            'feed.write': 'Publicar no feed',
            'squad.write': 'Gerenciar elenco',
            'lineups.write': 'Lançar escalações',
        },
    },
] as const;

type Group = (typeof PERMISSION_GROUPS)[number];
export type Permission = { [G in Group as G['key']]: keyof G['perms'] }[Group['key']] & string;

export const PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap(g => Object.keys(g.perms)) as Permission[];

export const PERMISSION_LABELS: Record<Permission, string> = Object.fromEntries(
    PERMISSION_GROUPS.flatMap(g => Object.entries(g.perms)),
) as Record<Permission, string>;

export const isPermission = (v: string): v is Permission => (PERMISSIONS as string[]).includes(v);

/** Permissões que podem ser restritas a eventos específicos via EventStaff */
export const EVENT_SCOPED_PERMISSIONS: Permission[] = ['events.read', 'checkin.validate', 'checkin.reports', 'tickets.sell_manual'];

export type PermissionOverride = { permission: string, effect: 'GRANT' | 'DENY' };

/** Resolve as permissões efetivas (sem considerar master: master = todas) */
export function resolvePermissions(input: { isMaster: boolean, rolePermissions: string[], overrides: PermissionOverride[] }): Permission[] {
    if (input.isMaster) return [...PERMISSIONS];
    const set = new Set<string>(input.rolePermissions);
    for (const o of input.overrides) if (o.effect === 'GRANT') set.add(o.permission);
    for (const o of input.overrides) if (o.effect === 'DENY') set.delete(o.permission);
    return PERMISSIONS.filter(p => set.has(p));
}

/** Papéis padrão criados pelo seed (editáveis depois pelo painel) */
export const DEFAULT_ROLES: { key: string, name: string, description: string, require2fa: boolean, permissions: Permission[] }[] = [
    {
        key: 'it_admin', name: 'Administrador de TI', require2fa: true,
        description: 'Apoio técnico à diretoria: usuários, papéis, gateways e configurações.',
        permissions: [...PERMISSIONS],
    },
    {
        key: 'board', name: 'Diretoria', require2fa: false,
        description: 'Gestão do clube: sócios, eventos, loja, financeiro e conteúdo.',
        permissions: PERMISSIONS.filter(p => !['roles.manage', 'gateways.manage'].includes(p)),
    },
    {
        key: 'coach', name: 'Treinador', require2fa: false,
        description: 'Elenco, escalações e publicações no feed.',
        permissions: ['squad.write', 'lineups.write', 'feed.write', 'events.read'],
    },
    {
        key: 'organizer', name: 'Organizador', require2fa: false,
        description: 'Organização dos jogos: painel do evento, entradas, venda na portaria.',
        permissions: ['events.read', 'checkin.validate', 'checkin.reports', 'tickets.sell_manual', 'orders.read', 'members.read'],
    },
    {
        key: 'gatekeeper', name: 'Validador de Entrada', require2fa: false,
        description: 'Somente leitura de QR na entrada dos eventos.',
        permissions: ['checkin.validate'],
    },
];
