# Loja, estoque e lista de espera

## Modos de venda (por produto)

| `fulfillment` | `waitlistEnabled` | `waitlistPayment` | Comportamento |
|---|---|---|---|
| `STOCK` | não | - | Venda normal enquanto houver estoque |
| `STOCK` | **sim** | - | Esgotou → o torcedor **entra na fila**. Quando o estoque é reposto, os primeiros da fila são **chamados**: o item fica **reservado** para eles por `WAITLIST_RESERVATION_HOURS`. Passado o prazo, a vez vai para o próximo |
| `ON_DEMAND` | sim | `UPFRONT` | **Encomenda paga**: o torcedor compra e o item entra no **lote de produção aberto** |
| `ON_DEMAND` | sim | `ON_RELEASE` | Entra na fila do lote **sem pagar**. Quando a diretoria marca o lote como **Pronto**, todos são chamados para pagar dentro do prazo |

## Estoque

- Contadores por variante:
  - `stock`: em mãos;
  - `reserved`: pedidos pendentes + chamadas da lista de espera;
  - disponível = `stock - reserved`.
- A reserva é um UPDATE condicional atômico.
- Na confirmação do pagamento, a quantidade sai de `stock` e de `reserved`.
- Pedido não pago expira e devolve a reserva.
- **Entrada / ajuste** (Admin > Produtos > Variações):
  - toda movimentação fica registrada em `StockMovement`;
  - uma **entrada positiva chama a fila automaticamente** (FIFO estrito: para no primeiro pedido que não couber).

## Lotes de produção (sob encomenda)

```
Aberto ──► Fechado ──► Em produção ──► Pronto ──► Entregue
   └──────────┴──────────────┴──► Cancelado
```

| Transição | O que acontece |
|---|---|
| Em produção | Os itens pagos passam para "Em produção" e os compradores são avisados |
| Pronto | Itens pagos ficam "Pronto p/ retirada" (aviso). Na fila `ON_RELEASE`, todos são chamados para pagar |
| Cancelado | Encomendas canceladas e compradores avisados. **Os pagamentos precisam ser estornados** (alerta ERROR no Google Chat) |

O **resumo do lote** traz a quantidade por variação (pagas + fila), que vira o pedido para o fornecedor.

## Entrega / retirada

Admin > Pedidos (filtro "entregas pendentes"). Cada item muda de "A separar" para "Pronto p/ retirada" e depois "Entregue", e o comprador é avisado. As instruções de retirada ficam em Configurações (`pickupInfo`).

## Descontos de sócio

O `storeDiscountPct` do plano vale para produtos com `allowMemberDiscount`. Arredondamento a favor do clube.

---

By: **will.i.am** | github.com/williampilger
