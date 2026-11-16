# ACE Filtradores - sistema

Sistema da **Associação Cultural e Esportiva Filtradores**, time de futsal de Bom Princípio/RS:

- **Sócio torcedor**: planos, adesão, cobranças geradas pelo sistema e **carteirinha digital com QR rotativo**, que funciona offline.
- **Ingressos**: venda própria, substituindo o Sympla. Lotes, desconto de sócio, cortesias, venda na portaria e resgate de ingresso pelo sócio.
- **Controle de entrada**: leitor de QR no app ou no navegador, validação atômica e log de todas as leituras.
- **Loja**: camisas, bonés etc. com estoque, **lista de espera** e itens **sob encomenda** em lotes de produção.
- **Pagamentos modulares** pelo pacote separado [`payment-gateways`](vendor/payment-gateways) (submódulo git): Stripe, Mercado Pago, PagSeguro, Asaas, pagamento manual e cortesia.
- **Feed do time**: posts públicos, só para sócios, ou a partir de um nível de plano. Também elenco e escalações.
- **Permissões granulares**: papéis editáveis e overrides por usuário. **2FA obrigatório para o master** e opcional para os demais.
- **Painel web** de gestão e **app iOS/Android** (Expo) para torcedores, sócios e staff.

## Stack

| Camada | Tecnologia |
|---|---|
| Web + API | Next.js 16 (App Router + route handlers), React 19.3, Tailwind 4 |
| App | Expo SDK 58 (React Native 0.88, Expo Router) |
| Banco | MySQL 8 (container `mysql-dev`) + Prisma 7 (`@prisma/adapter-mariadb`) |
| Filas / cache | Redis 7 + BullMQ + node-cron |
| Validação | Zod 4 (compartilhado web/app) |
| Auth | Sessão opaca (cookie `SSID` / Bearer), argon2id, TOTP |
| Testes | Vitest (unitários + integração contra banco de teste) |

## Monorepo

```
apps/web              Next.js: site público, /minha-conta, /admin, /validar, API /api/v1
apps/worker           Expiração de pedidos, reconciliação de pagamentos, cobrança de sócios, lista de espera, e-mails
apps/mobile           App Expo (torcedor + Staff)
vendor/payment-gateways  Submódulo: gateways de pagamento (pacote do workspace, consumido pelo fonte)
packages/shared       Enums, permissões, DTOs, Zod, QR, regras puras (também usado pelo app)
packages/db           Prisma: schema, migrations, seeds
packages/core         Regras de negócio (web + worker)
packages/integrations Storage, criptografia, e-mail, imagens
docs/                 Documentação
```

## Rodando localmente

Pré-requisitos:
- Node ≥ 22;
- Docker com o container `mysql-dev` (MySQL 8);
- acesso ao repo privado `payment-gateways` (submódulo em `vendor/`).

```bash
git submodule update --init   # ou clonar com --recurse-submodules
cp .env.sample .env            # preencher DATABASE_URL, ENCRYPTION_KEY, QR_SIGNING_SECRET... (ver docs/deploy.md)
npm install
npm run db:up                  # Redis (filt-redis :6393)
npm run db:generate
npm run db:migrate             # cria as tabelas no mysql-dev
npm run db:seed                # clube, papéis, master
npm run db:demo:reset          # (opcional) DEMONSTRAÇÃO completa - APAGA o banco (exige DEMO_MODE=true) - ver docs/demonstracao.md
npm run dev                    # web (http://localhost:3000) + worker
npm run dev:mobile             # app (Expo) - ver apps/mobile/README.md
```

Entre com `MASTER_EMAIL` / `MASTER_PASSWORD` do `.env` (senha padrão do seed: `Teste53!` - trocar em produção). O cadastro do 2FA é pedido no primeiro acesso.

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | web + worker em modo desenvolvimento |
| `npm run build` | gera o client Prisma + build do web |
| `npm run typecheck` | typecheck de todos os pacotes |
| `npm test` | testes (shared: unitários; core: integração com `TEST_DATABASE_URL`) |
| `npm run lint` | ESLint |
| `npm run db:*` | ver [docs/prisma.md](docs/prisma.md) |
| `npm run deploy:sony` / `redeploy:sony` | ver [docs/deploy.md](docs/deploy.md) |

## Documentação

| Documento | Assunto |
|---|---|
| [0-Diretrizes](docs/0-Diretrizes.md) | Padrões de código |
| [1-LogLevels](docs/1-LogLevels.md) | Níveis de log |
| [arquitetura](docs/arquitetura.md) | Visão geral e decisões |
| [identidade-visual](docs/identidade-visual.md) | Cores, tipografia e aplicações da marca ACEF |
| [permissoes](docs/permissoes.md) | Perfis, catálogo de permissões, 2FA |
| [pagamentos](docs/pagamentos.md) | Gateways, ciclo do pedido, estornos, webhooks |
| [ingressos-checkin](docs/ingressos-checkin.md) | Eventos, lotes, cortesias, portaria, QR |
| [socios](docs/socios.md) | Planos, cobranças, carteirinha, feed prime |
| [loja-lista-espera](docs/loja-lista-espera.md) | Estoque, lista de espera, lotes de produção |
| [prisma](docs/prisma.md) | Banco e migrations |
| [deploy](docs/deploy.md) | Deploy no sony |
| [mobile](docs/mobile.md) | App iOS/Android |
| [demonstracao](docs/demonstracao.md) | Ambiente de demonstração: contas, dados e roteiro de apresentação |
| [ToDo](ToDo.md) | Pendências |
| [CHANGELOG](CHANGELOG.md) | O que mudou e por quê |

---

By: **will.i.am** | github.com/williampilger
