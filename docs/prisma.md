# Prisma / banco

- MySQL 8 no container compartilhado **`mysql-dev`** (local no micro-08 e no sony). Conexão por `localhost:3306` com `@prisma/adapter-mariadb` (`packages/db/src/client.ts`).
- Bancos:
  - `filtradores`: principal;
  - `filtradores-shadow`: usado pelo `migrate dev`;
  - `filtradores-test`: testes de integração, apagado a cada teste.
- Usuário `userfiltradores` (ver o SQL em [deploy.md](deploy.md)).

## Comandos (raiz do repo)

| Comando | O que faz |
|---|---|
| `npm run db:generate` | Gera o client (`packages/db/src/generated/prisma`, fora do git) |
| `npm run db:migrate` | `prisma migrate dev` (desenvolvimento; usa o shadow) |
| `npm run db:migrate:deploy` | Aplica migrations (produção) |
| `npm run db:seed` | Seed base idempotente: clube, papéis, gateways (desabilitados), master |
| `npm run db:seed:demo` | Dados de demonstração (planos, jogos no Morangão, produtos, elenco fictício). **Só em dev** |
| `npm run db:studio` | Prisma Studio |

## Convenções

Ver [0-Diretrizes.md](0-Diretrizes.md#banco-prisma--mysql). Lembrete: enums alterados no schema também mudam em `packages/shared/src/enums.ts`.

---

By: **will.i.am** | github.com/williampilger
