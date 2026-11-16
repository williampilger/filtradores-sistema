# Changelog - ACE Filtradores

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Datas no formato AAAA-MM-DD.

## [Não lançado]

## 2026-11-16

### Adicionado
- **Escudo provisório** (imagem raster enviada pela diretoria, fundo recortado para PNG transparente) em todos os
  lugares onde a marca aparece:
  - web: fallback do `ClubLogo` (`DEFAULT_LOGO_URL` = `/escudo.png`) quando não há logo em Admin > Configurações
    (cabeçalho, home, jogos, carteirinha, rodapé, login), cabeçalho do painel admin, prévia em Configurações,
    favicon (`app/icon.png`) e `apple-icon.png`;
  - app: `ClubMark` (login, perfil, carteirinha, jogos), ícone, ícone adaptativo do Android e splash.
  - **Por quê:** deixar o sistema com a cara final antes do vetor oficial; a sigla "ACEF" em texto era só um
    marcador. Trocar pelo vetor quando chegar (ver `docs/identidade-visual.md`).

### Alterado
- **`payment-gateways` agora é submódulo git em `vendor/payment-gateways`**, pacote do workspace npm consumido pelo
  código-fonte (mesmo modelo do CoreCAD na Authenty). Gateways atualizado para `0.2.0`.
  - **Por quê:** o modelo `file:../payment-gateways` exigia clonar o repo ao lado, `npm run build` a cada alteração,
    `install-links=true` + reinstalar a cópia, e um checkout extra no CI. Agora: `git submodule update --init` +
    `npm install`, e alterações no pacote aparecem direto (symlink do workspace, sem build).
  - `packages/core`: dependência `"@williampilger/payment-gateways": "*"` (era `file:`).
  - `apps/web/next.config.ts`: o pacote saiu de `serverExternalPackages` e entrou em `transpilePackages`.
  - `.npmrc` removido (o `install-links` só existia por causa do `file:`).
  - CI: um único `actions/checkout` com `submodules: recursive` (token `PAYMENT_GATEWAYS_TOKEN`); sem build do pacote.
  - `deploy:sony` / `redeploy:sony` inicializam/atualizam o submódulo.
  - Os testes do pacote passam a rodar junto com `npm test` e `npm run typecheck` do monorepo.

## 2026-11-15 - versão inicial

### Adicionado
- Monorepo npm workspaces no padrão dos projetos recentes: `apps/web` (Next.js 16, site + painel + API `/api/v1`),
  `apps/worker` (BullMQ + node-cron), `apps/mobile` (Expo, app único torcedor + Staff), `packages/shared`, `db`
  (Prisma 7 / MySQL `mysql-dev`), `core` (regras de negócio web + worker) e `integrations`. `.env` único na raiz.
- **Sócio torcedor**: planos, adesão, cobranças geradas pelo sistema, carência/inadimplência, carteirinha com **QR
  rotativo offline**.
- **Ingressos**: eventos, lotes, cota de sócios, desconto de sócio, cortesias auditadas, venda na portaria, resgate
  pelo sócio. Substitui o Sympla.
- **Controle de entrada**: leitor de QR (app e navegador), validação atômica, busca manual e log de leituras.
- **Loja**: estoque com reserva, lista de espera FIFO, itens sob encomenda em lotes de produção, entrega/retirada.
- **Pagamentos** pelo repo separado `payment-gateways` (Stripe, Mercado Pago, PagSeguro, Asaas, manual, cortesia):
  credenciais criptografadas, prioridade por método, webhooks com assinatura + idempotência, reconciliação, estornos.
  - **Por quê repo separado:** reaproveitar os gateways em outros sistemas.
- **Feed**, elenco e escalações; posts públicos, só sócios ou por nível de plano.
- **Permissões granulares** (papéis editáveis + overrides por usuário), 2FA TOTP (obrigatório para o master), rate
  limit e auditoria.
- **Modo demonstração** (`DEMO_MODE`, `npm run db:demo:reset`) com dados fictícios e gateway simulado.
- CI (lint, typecheck, testes, build) e scripts de deploy no sony (porta 26006, `filtradores.pilger.dev.br`).
