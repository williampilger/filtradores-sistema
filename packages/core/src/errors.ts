/**
 * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
 * by: will.i.am                   |  github.com/williampilger
 *
 * 2026.11.15 - Erros padronizados. O `code` (YYMMDDHHmmss) vai na resposta e no log.
 */
export class GenericError extends Error {
    description = 'Erro genérico';
    constructor(message: string, readonly code: number = 0, readonly status = 500) {
        super(message);
        this.name = this.constructor.name;
    }
    toJSON() {
        return { msg: `${this.code} - ${this.message}` };
    }
}

/** Erro de entrada do usuário (400) */
export class InputError extends GenericError {
    description = 'Dados de entrada inválidos';
    constructor(message: string, code: number, status = 400) { super(message, code, status); }
}

/** Estado inconsistente / regra de negócio violada (409) */
export class InconsistencyError extends GenericError {
    description = 'Inconsistência de dados';
    constructor(message: string, code: number, status = 409) { super(message, code, status); }
}

/** Recurso inexistente OU sem permissão (404 para não revelar a existência) */
export class NotFoundError extends GenericError {
    description = 'Não encontrado';
    constructor(message: string, code: number) { super(message, code, 404); }
}

export class AuthError extends GenericError {
    description = 'Não autenticado';
    constructor(message: string, code: number, status = 401) { super(message, code, status); }
}

/** Sem permissão para uma ação em recurso que o usuário PODE ver (403) */
export class ForbiddenError extends GenericError {
    description = 'Sem permissão';
    constructor(message: string, code: number) { super(message, code, 403); }
}
