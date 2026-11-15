# Arquitetura

```
                ┌──────────────────────── sony (PM2) ────────────────────────┐
 Torcedor ──┐   │  filtradores-web  (Next.js :26006)                          │
 (site/app) │   │   ├─ páginas públicas, /minha-conta, /admin, /validar       │
 Staff ─────┼──►│   └─ API /api/v1  ──► @filt/core ──► Prisma ──► mysql-dev    │
 Gateways ──┘   │                         │   (regras)            (:3306)     │
 (webhooks)     │  filtradores-worker     │                                    │
                │   ├─ crons: expira pedidos, reconcilia pagamentos,           │
                │   │         cobra sócios, avança lista de espera            │
                │   └─ fila mail (BullMQ) ──► SMTP (ou log)                    │
                │  filt-redis :6393 (cache de sessão, rate limit, filas)       │
                └────────────────────────────────────────────────────────────┘
 Cloudflare Tunnel (*.pilger.dev.br) ──► nginx :80 ──► 127.0.0.1:26006
```

## Pacotes

| Pacote | Conteúdo |
|---|---|
| `packages/shared` | enums + `LABELS`, catálogo de permissões, DTOs, schemas Zod, QR (carteirinha rotativa), regras de cobrança, formatação |
| `packages/db` | `schema.prisma`, migrations, `seed.ts` (base, idempotente) e `seed.demo.ts` (dev) |
| `packages/integrations` | storage local, AES-GCM, e-mail (nodemailer), normalização de imagens (sharp) |
| `packages/core` | pedidos, inventário, pagamentos (ponte com `payment-gateways`), sócios, ingressos, check-in, lista de espera, webhooks, DTOs, auditoria, notificações, log |
| `apps/web` | Next.js 16: UI + route handlers |
| `apps/worker` | BullMQ + node-cron |
| `apps/mobile` | Expo SDK 58 (iOS/Android) |
| `../payment-gateways` (repo separado) | `@williampilger/payment-gateways`: Stripe, Mercado Pago, PagSeguro, Asaas, manual, cortesia |

## Fluxos principais

- **Compra** (ingresso/produto/sócio) → `Order` com reserva → `Payment` no gateway → webhook/reconciliação → `fulfillOrder` (emite ingressos, baixa estoque, ativa sócio). Ver [pagamentos.md](pagamentos.md).
- **Entrada no jogo** → leitura do QR (app Staff ou `/validar`) → `validateQr` atômico. Ver [ingressos-checkin.md](ingressos-checkin.md).
- **Sócio** → adesão → cobranças geradas pelo worker → carteirinha com QR rotativo. Ver [socios.md](socios.md).
- **Loja** → estoque / sob encomenda / lista de espera. Ver [loja-lista-espera.md](loja-lista-espera.md).
- **Permissões** → [permissoes.md](permissoes.md).

## Decisões

- **Um app mobile só** (torcedor + Staff por permissão).
- **Lógica no `packages/core`**: o worker precisa das mesmas regras (expirar pedido, aplicar webhook, cobrar sócio).
- **Webhooks processados na hora** (rápido, idempotente por `gateway+eventId`) e reprocessados pelo worker se falharem; a reconciliação periódica cobre webhooks perdidos.
- **Sessão opaca** (não JWT): revogação imediata (bloqueio de usuário, troca de senha, reset de 2FA).
- **Carteirinha offline**: o QR é gerado no aparelho com uma chave derivada por sócio (o ginásio pode estar sem sinal).

---

By: **will.i.am** | github.com/williampilger
