# Demonstração (apresentação para a gestão)

Este ambiente fica populado com **dados fictícios** para mostrar todas as telas e fluxos do sistema.

## Preparar

```bash
# .env: DEMO_MODE=true e EXPO_PUBLIC_DEMO_MODE=true
npm run db:demo:reset      # ⚠️ APAGA TODO o banco, roda o seed base e popula a demonstração (~40 s)
npm run dev                # web + worker
npm run dev:mobile         # app (opcional) - ver apps/mobile/README.md
```

O que muda com `DEMO_MODE=true`:

- Aparece a faixa **"AMBIENTE DE DEMONSTRAÇÃO"** no site, no painel e no app.
- O gateway **"Demonstração (simulado)"** passa a atender PIX, cartão e boleto:
  - **PIX/boleto**: aprovados sozinhos após `DEMO_APPROVE_SECONDS` (12 s). A página do pedido se atualiza.
  - **Cartão**: abre uma página simulada com os botões *Aprovar* / *Recusar*.
- Todas as imagens são **ilustrações geradas** com a marca d'água "DADOS DE EXEMPLO". Nenhuma pessoa real aparece. As fotos e o escudo oficiais entram depois (ver [identidade-visual.md](identidade-visual.md)).
- Os nomes de jogadores, sócios e adversários são fictícios. Os textos levam "(exemplo)".

⚠️ **Antes de abrir para o público:**
1. `DEMO_MODE=false`;
2. recriar o banco **sem** a demonstração;
3. trocar a senha do master.

Com o modo demonstração ligado, qualquer pessoa "paga" sem pagar.

## Contas

Senha de **todas**: `Teste53!`. O master usa `MASTER_EMAIL`, com a mesma senha padrão.

| Perfil | E-mail | O que mostrar |
|---|---|---|
| Master | `MASTER_EMAIL` do `.env` | 2FA **obrigatório** no 1º acesso (tenha o Google Authenticator à mão) · acesso total |
| Diretoria | `diretoria@exemplo.local` | Painel completo (sem papéis/gateways) |
| Tesouraria | `tesouraria@exemplo.local` | Pagamentos, estornos, relatórios |
| Administrador de TI | `ti@exemplo.local` | Papel com **2FA obrigatório**; papéis e permissões; gateways |
| Treinador | `treinador@exemplo.local` | Elenco, escalações, feed - sem acesso a pedidos |
| Organizador | `organizador@exemplo.local` | Painel do jogo, venda na portaria, entradas |
| Organizador sem venda | `organizador2@exemplo.local` | **Override individual** (DENY `tickets.sell_manual`) |
| Portaria | `portaria@exemplo.local` | Leitor de QR (`/validar` ou aba Staff do app) |
| Portaria restrita | `portaria2@exemplo.local` | Só enxerga o **próximo jogo** (equipe do evento) |
| Lojinha | `lojinha@exemplo.local` | **Papel personalizado** criado pelo painel |
| Sócia Raiz | `socio@exemplo.local` | Carteirinha com **QR rotativo**, ingressos, pedidos, encomenda, lista de espera, notificações |
| Sócio Torcedor | `socio.torcedor@exemplo.local` | Plano de **resgate** de ingresso |
| Sócio Ouro | `socio.ouro@exemplo.local` | Plano anual, convite do jantar dos sócios |
| Inadimplente | `inadimplente@exemplo.local` | Carteirinha sem QR, cobrança vencida, barrada na portaria |
| Adesão pendente | `socio.pendente@exemplo.local` | Pagar a adesão (PIX simulado) |
| Torcedor | `torcedor@exemplo.local` | Não sócio · **chamado na lista de espera** da camisa GG · pedido aguardando pagamento |

## O que tem populado

- **Campeonato** "Gauchão de Futsal Série A 2026 (exemplo)". Os jogos ficam no Ginásio do Morangão:
  - **6 jogos encerrados**, cada um com:
    - placar e capa "FIM DE JOGO";
    - vendas online (Mercado Pago, Asaas, PagBank e Stripe *simulados*), na portaria e cortesias;
    - resgates de sócios;
    - log de entradas, inclusive leituras negadas;
    - escalação;
    - post com 4 fotos ilustrativas.
  - **3 jogos futuros**:
    - o próximo tem escalação publicada, cortesia, resgate de sócio e portaria restrita;
    - lotes com virada de preço;
    - pré-venda exclusiva para sócios.
  - **1 rascunho** (a final, sem adversário) e **1 evento social** (jantar, só para sócios).
- **Classificação**: arte publicada no feed com a tabela fictícia.
- **Sócios**: ~30, incluindo ativos, inadimplentes, cancelado e pendente. Há histórico de mensalidades pagas e cobranças de renovação geradas pelo worker.
- **Loja** (8 produtos):

  | Produto | O que demonstra |
  |---|---|
  | Camisa branca | Tamanho GG esgotado, com **lista de espera** e uma pessoa chamada |
  | Camisas azul e de treino, boné | Estoque normal |
  | Squeeze | Últimas unidades |
  | Cachecol | Esgotado, sem fila |
  | **Jaqueta** | Sob encomenda paga antecipadamente: lote 1 em produção, lote 2 aberto |
  | **Caneca** | Sob encomenda paga na liberação: fila aguardando o lote |

  Também há entregas em todos os estados, uma venda no balcão e um **estorno**.
- **Feed**: posts públicos, só para sócios e **prime por nível** (Raiz+), fixados, ligados a jogos e um rascunho.
- **Equipe**: papéis padrão, um papel personalizado e um override individual. A **auditoria** já tem registros.

## Roteiro sugerido (≈ 20 min)

1. **Site público** (deslogado): home → próximo jogo → loja → "Seja sócio" → notícias, com os posts bloqueados para não sócios.
2. **Torcedor** (`torcedor@`):
   - comprar ingresso via **PIX simulado** e ver a aprovação em ~12 s e o ingresso com QR;
   - ver a camisa GG reservada pela lista de espera e comprar.
3. **Sócia** (`socio@`, de preferência no **app**):
   - carteirinha com QR mudando a cada 30 s (funciona offline);
   - ingresso do acompanhante com 50% de desconto;
   - encomenda da jaqueta em produção.
4. **Portaria** (`portaria@`, no celular):
   - ler o QR da carteirinha → **LIBERADO**;
   - ler de novo → **JÁ UTILIZADO**;
   - ler a carteirinha da `inadimplente@` → barrada.
5. **Organizador**: painel do jogo com contadores e venda na portaria (dinheiro).
6. **Treinador**: montar e publicar a escalação → ela aparece na página do jogo.
7. **Diretoria**:
   - dashboard e sócios (inadimplência, pagamento manual em dinheiro);
   - lote da jaqueta → "Pronto" (notifica os compradores);
   - estoque (reposição chama a fila);
   - pedidos/entregas e estorno;
   - cortesias.
8. **TI / Master**:
   - 2FA obrigatório;
   - papéis e permissões (matriz e override individual);
   - gateways (credenciais criptografadas, sandbox, URL do webhook);
   - auditoria.

---

By: **will.i.am** | github.com/williampilger
