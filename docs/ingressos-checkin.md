# Eventos, ingressos e controle de entrada

## Eventos e lotes

- `Event` define:
  - `capacity`: capacidade **total** (ingressos + entradas de sócios). Vazio = sem limite.
  - `memberAccess`: liga ou desliga as entradas de sócio no evento.
  - `memberCapacity`: cota de sócios.
  - planos elegíveis: sem nenhum marcado, valem todos os planos com acesso.
  - status:
    - **Rascunho**: invisível ao público.
    - **Publicado**: à venda.
    - **Encerrado**: só a portaria vende.
    - **Cancelado**.
- `TicketType` (lote) define:
  - preço, quantidade e janela de vendas;
  - limite por pedido;
  - "somente sócios";
  - se o desconto de sócio se aplica (`ticketDiscountPct` do plano).
- Reserva no pedido:
  - o evento é travado (`SELECT ... FOR UPDATE`);
  - é conferida a capacidade total (todos os lotes + sócios);
  - depois, um UPDATE condicional no lote garante que **não vende acima do disponível**, mesmo com compras simultâneas (há teste em `packages/core/test`).

## Origens do ingresso

| Origem | Como nasce |
|---|---|
| Venda (`SALE`) | Compra no site/app, paga por gateway |
| Portaria (`MANUAL`) | **Venda na portaria/PDV** (Admin > Evento > Portaria, ou app Staff), paga em dinheiro ou PIX direto, com o operador registrado |
| Cortesia (`COURTESY`) | Admin > Evento > Cortesias: motivo obrigatório, um ingresso por titular, auditado. Pode ser vinculada à conta de um torcedor (aparece no app dele) |
| Sócio (`MEMBER_CLAIM`) | Sócio de plano **CLAIM** resgata no app/site, respeitando `memberCapacity` e a capacidade |

## Acesso de sócios (por plano)

| `eventAccess` | Entrada |
|---|---|
| `NONE` | Sem benefício de entrada (pode comprar ingresso, com desconto se o plano tiver) |
| `CLAIM` | Precisa **resgatar** o ingresso do jogo. Na portaria vale o QR do ingresso **ou** a carteirinha (o sistema localiza o ingresso resgatado) |
| `AUTOMATIC` | A **carteirinha é a entrada**: uma por evento (`member_event_entries`), consumindo a capacidade e a cota de sócios |

O sócio precisa estar **ACTIVE**. Inadimplente (`OVERDUE`) é barrado com o motivo exibido.

## QR codes

- **Ingresso**: `FT1.<código>`, com 128 bits aleatórios. É validado por busca no banco.
- **Carteirinha**: `FM1.<id>.<janela>.<assinatura>`, um **QR rotativo** que muda a cada 30 s. Por isso print ou foto não serve.
  - A assinatura é HMAC com uma chave derivada por sócio (`QR_SIGNING_SECRET` + `Membership.qrVersion`).
  - O app guarda a chave e gera o QR **offline**, para funcionar no ginásio sem sinal.
  - **Admin > Sócios > Reemitir carteirinha** incrementa `qrVersion` e invalida o QR antigo (celular perdido ou compartilhamento).
  - Tolerância de ±2 janelas (relógio do celular levemente fora).

## Portaria

Há duas formas de validar:

- **App** (aba Staff): câmera em tela cheia, verde LIBERADO / vermelho NEGADO, vibração;
- **Web** (`/validar`): mesma lógica no navegador do celular. Serve como alternativa ao app.

Funcionamento:

- **Atômico**: dois leitores lendo o mesmo QR ao mesmo tempo → só um libera. O outro recebe "Já utilizado", com o horário.
- **Toda leitura é registrada** em `CheckIn`, inclusive as negadas, com operador e dispositivo. Aparece em Admin > Evento > Entradas.
- **Busca manual**: por nome, CPF ou nº de sócio, para celular sem bateria ou QR ilegível.
- **Contadores**: vendidos, entraram, entradas de sócio, capacidade.
- **Restrição**: o validador só vê os eventos onde está na equipe, quando há equipe definida (ver [permissoes.md](permissoes.md)).

⚠️ **Check-in offline** (manifesto do evento baixado + fila de sincronização) está no `ToDo.md`. Hoje a validação precisa de conexão (a carteirinha do sócio funciona offline no celular dele, mas o leitor consulta o servidor).

## Escalação (treinador)

Admin > Evento > Escalação:

- titulares e reservas;
- posição (GOL, FIXO, ALA-D, ALA-E, PIVÔ);
- capitão;
- esquema (ex.: 3-1, 2-2, 4-0).

Ao **publicar**, a escalação aparece na página do jogo e no app.

---

By: **will.i.am** | github.com/williampilger
