# Diretrizes de código - ACE Filtradores

Segue o padrão dos projetos recentes (`orca-simples`, `financeiro`, `big-database`), com os ajustes listados ao final.

## Geral

- **Identificadores em inglês**, **comentários em PT-BR**. JSDoc acima de cada rota, com marcadores:
  - `🔓` público
  - `🔐` usuário logado
  - `🔑` permissão administrativa/staff
  - `⚠️` atenção
- Cabeçalho dos arquivos:
  ```ts
  /**
   * Authenty AE - Bom Princípio-RS  |  github.com/authentyAE
   * by: will.i.am                   |  github.com/williampilger
   *
   * AAAA.MM.DD - descrição
   */
  ```
- **Códigos de erro e log** são timestamps `YYMMDDHHmmss` de quando a linha foi escrita. O mesmo código vai na resposta (`{ msg: '261115210002 - E-mail ou senha incorretos' }`) e no `LogSystem`.
- Mensagens da API em **PT-BR** (exibidas ao usuário; o front remove o código com `cleanMsg`).

## Estrutura

| Pacote | Papel |
|---|---|
| `packages/shared` | Enums, catálogo de permissões, DTOs, Zod, regras puras (QR, cobrança, formatação). **Roda também no app mobile: nada de Node aqui.** |
| `packages/db` | Prisma (MySQL), migrations, seeds |
| `packages/integrations` | Storage, criptografia, e-mail, imagens |
| `packages/core` | **Regras de negócio** usadas pelo web E pelo worker (pedidos, pagamentos, sócios, ingressos, check-in, lista de espera, webhooks) |
| `apps/web` | Next.js: páginas + API (`/api/v1`) |
| `apps/worker` | Filas e agendamentos |
| `apps/mobile` | App Expo (iOS/Android) |

## Back-end (route handlers do Next)

- **Toda rota** usa o wrapper `route(opts, handler)` (`apps/web/src/lib/authenticate.ts`):
  - manutenção, sessão (cookie `SSID` ou `Bearer`), 2FA pendente/obrigatório, permissões (`perm`), `master`
  - tradução de erros: `ZodError` → 422, `GenericError` → status próprio, Prisma `P2002` → 409, `P2025` → 404, `P2003` → 409
- **Sem permissão = 404** (esconde a existência da rota). 403 só para ações em recursos que o usuário pode ver.
- Validação com Zod (`zodSchema_*` em `packages/shared/src/schemas.ts`).
- **Rotas finas**: regra de negócio em `packages/core` (compartilhada) ou `apps/web/src/server/*.ts` (exclusiva do web).
- ⚠️ `route.ts` só pode exportar `GET/POST/...` (o Next recusa outros nomes) - schemas auxiliares em `server/`.
- **Dinheiro em centavos (Int)**. Nunca float.
- **Concorrência**: reservas de ingressos/estoque e check-in são atômicos (ver `packages/core/src/inventory.ts` e `checkin.ts`). Não "ler e depois gravar" contadores fora dessas funções.
- **Auditoria** (`audit()`) em toda ação administrativa: cortesias, pagamentos manuais, estornos, permissões, estoque.
- **Segredos**: credenciais de gateway e TOTP gravados com `encrypt()` (AES-256-GCM). Nunca devolvidos ao front.
- **Soft delete** (`deletedAt`) nos cadastros de negócio.

## Banco (Prisma / MySQL)

- Modelos PascalCase, campos camelCase, tabelas snake_case (`@@map`); relações PascalCase, FKs camelCase.
- `onDelete` sempre explícito e `@@index` em toda FK.
- Prefixos: `ref_` (snapshot da época), `calc_` (contador/denormalizado).
- Enums do Prisma espelhados em `packages/shared/src/enums.ts` (o app não importa o Prisma).
- Ver [prisma.md](prisma.md).

## Front-end (web)

- **Todo fetch** em `apps/web/src/api/index.ts` (`basicFetch` nunca lança: `{ conex, reqStat, success, data, msg }`).
- Telas em `src/views/<PascalName>/index.tsx` (`form.Xxx.tsx`); `src/app/**/page.tsx` são wrappers. ⚠️ Não usar `src/pages`.
- **Cores: SOMENTE tokens do tema** (`apps/web/src/app/globals.css`). Identidade visual em [identidade-visual.md](identidade-visual.md).
- Componentes base em `src/components/ui.tsx` (formulários, modal, abas, badges, paginação).
- Rótulos de enums: `LABELS` de `@filt/shared`.

## Mobile

- Expo Router, mesmo contrato da API (`Authorization: Bearer`), cores em `apps/mobile/src/theme.ts` (mesmos valores dos tokens do web). Ver [mobile.md](mobile.md).

## Ajustes conscientes em relação às referências

| Referência | Aqui | Motivo |
|---|---|---|
| PostgreSQL próprio por projeto | MySQL no container compartilhado `mysql-dev` | pedido do projeto |
| Papéis fixos (`SystemRole`) | Papéis editáveis + catálogo de permissões + overrides por usuário | requisito de permissões flexíveis |
| Regras em `apps/web/src/server` | `packages/core` compartilhado com o worker | webhooks/expiração/cobrança rodam nos dois |
| Sem 2FA | TOTP (obrigatório p/ master) + códigos de recuperação | requisito |

---

By: **will.i.am** | github.com/williampilger
