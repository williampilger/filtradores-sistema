# Pagamentos

Os gateways ficam no pacote **separado e reaproveitável** [`@williampilger/payment-gateways`](../../payment-gateways/README.md) (repo `~/github/williampilger/payment-gateways`). A ponte com este sistema está em `packages/core/src/gateways.ts`.

| Gateway | Métodos | Uso |
|---|---|---|
| Stripe | cartão, PIX, checkout | online |
| Mercado Pago | PIX, cartão, checkout | online |
| PagSeguro (PagBank) | PIX, cartão, boleto, checkout | online |
| Asaas | PIX, boleto, cartão, checkout | online |
| `manual` | dinheiro, PIX direto, transferência | portaria/PDV, mensalidade paga em mãos |
| `courtesy` | cortesia (valor 0) | ingressos cortesia, pedidos gratuitos |

## Configuração (Admin > Gateways)

- Credenciais criptografadas no banco (`GatewayConfig.credentialsEnc`, AES-256-GCM com `ENCRYPTION_KEY`). A tela nunca mostra o valor salvo; campo vazio mantém o atual.
- `sandbox` liga o ambiente de testes do provedor.
- **Prioridade**: quando dois gateways atendem o mesmo método, vence o de menor número. Ex.: PIX no Mercado Pago (10) e cartão na Stripe (20).
- **Webhook**: cadastrar no painel do provedor a URL exibida na tela: `https://filtradores.pilger.dev.br/api/v1/webhooks/payments/<gateway>`.
  - Stripe: eventos `checkout.session.*`, `payment_intent.*`, `charge.refunded`. Copiar o *signing secret* (`whsec_...`).
  - Mercado Pago: tópico *Pagamentos*. Copiar a *assinatura secreta*.
  - Asaas: definir um *token de autenticação* e informar o mesmo valor aqui.
  - PagBank: a notificação vai na própria cobrança (`notification_urls`). O token de verificação é o token da conta.

## Ciclo de vida

```
createOrder (reserva, expira em ORDER_RESERVATION_MINUTES)
   └─ startPayment(método) ─► Payment PENDING + cobrança no gateway (PIX/link/boleto)
          ├─ webhook (assinatura validada) ─┐
          ├─ reconciliação (worker, 5 min) ─┼─► applyPaymentStatus ─► PAID ─► fulfillOrder (idempotente)
          └─ manual/cortesia (na hora) ─────┘                                   ├─ TICKET: emite ingressos
                                                                                ├─ PRODUCT: baixa estoque / converte lista de espera
                                                                                ├─ PREORDER: entra no lote de produção
                                                                                └─ MEMBERSHIP: ativa/renova o sócio
expireOrders (worker, 1 min): pedido não pago ─► EXPIRED + devolve reservas + cancela cobrança no gateway
```

- **Pago depois de expirar**: o sistema tenta reservar de novo. Se não houver mais disponibilidade:
  - o pagamento recebe a nota "PAGO APÓS EXPIRAÇÃO ... ESTORNAR";
  - é disparado um ERROR (Google Chat);
  - o pagamento aparece em **Admin > Pagamentos > Atenção** para ser estornado.
- **Trocar de método**: as cobranças pendentes anteriores são canceladas. Se o cliente pagar uma delas assim mesmo, o webhook trata o pagamento normalmente.
- **Estorno** (Admin > Pedidos/Pagamentos): é feito pelo gateway, pode ser total ou parcial (se o gateway permitir) e fica registrado em `Refund`. O estorno **total**:
  - cancela os ingressos válidos;
  - devolve ao estoque os itens não entregues;
  - cancela a cobrança de sócio. O período do sócio deve ser revisto manualmente.
- **Chargeback/estorno feito direto no painel do gateway**: chega por webhook e aplica os mesmos efeitos.
- **Idempotência**:
  - `Payment.idempotencyKey` vai para o gateway;
  - webhooks são únicos por `gateway + eventId`;
  - `fulfillOrder` trava o pedido (`SELECT ... FOR UPDATE`) e não faz nada se ele já estiver pago.

## Testes

- Pacote `payment-gateways`: testes unitários com fixtures, e `npm run sandbox:<gateway>` com credenciais de sandbox (ver o README do pacote).
- Este sistema: `npm test` em `packages/core` roda os testes de integração (pagamento manual, idempotência, estorno, cortesia) contra `TEST_DATABASE_URL`.
- ⚠️ **Validação ponta a ponta de cada gateway**: pendente até chegarem as credenciais de sandbox (ver `ToDo.md`).

---

By: **will.i.am** | github.com/williampilger
