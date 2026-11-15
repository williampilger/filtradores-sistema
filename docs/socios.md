# Sócio torcedor

## Planos (Admin > Planos)

Cada plano define:

- preço e período (mensal, trimestral, semestral ou anual);
- **taxa de adesão**, cobrada só na 1ª adesão;
- **nível** (`tierLevel`), usado pelo feed "prime";
- descontos (%) na loja e em ingressos;
- **acesso aos jogos** (`NONE` / `CLAIM` / `AUTOMATIC`, ver [ingressos-checkin.md](ingressos-checkin.md));
- benefícios exibidos;
- cor.

Alterações de preço valem a partir das **próximas** cobranças.

## Ciclo de vida

```
adesão (joinPlan) ─► PENDING + cobrança de adesão ─► pago ─► ACTIVE (nº de sócio atribuído)
ACTIVE ─(N dias antes do fim)─► worker gera cobrança de renovação + avisa
pago antes do fim ─► período estendido a partir do fim atual (não perde dias)
venceu + MEMBERSHIP_GRACE_DAYS ─► OVERDUE (não entra nos jogos, conteúdo prime bloqueado)
OVERDUE + MEMBERSHIP_EXPIRE_DAYS ─► EXPIRED
cancelamento (sócio pela diretoria) ─► CANCELED
```

- A **cobrança é gerada pelo sistema** (worker `memberships:billing`, `MEMBERSHIP_BILLING_CRON`). O pagamento passa pelo mesmo fluxo de pedidos/gateways: PIX, cartão, boleto ou pagamento manual.
- **Recorrência automática no cartão** (assinatura do gateway) está no `ToDo.md`.
- **Sócios antigos / pagos fora do sistema**: Admin > Usuários > (usuário) > Sócio define plano, status e validade manualmente. Tudo vai para a auditoria.
- **Pagamento em dinheiro de uma mensalidade**: Admin > Sócios > (sócio) > Cobranças > Registrar pagamento manual.

## Carteirinha

- Digital, no app e em `/minha-conta`. Mostra:
  - foto, nome, plano, nº de sócio e validade;
  - **QR rotativo** (ver [ingressos-checkin.md](ingressos-checkin.md#qr-codes)).
- A foto de perfil é usada pela portaria para conferência visual.

## Feed "prime"

| Visibilidade do post | Quem vê |
|---|---|
| Público | todos |
| Somente sócios | sócios **ACTIVE** |
| Sócios a partir de um nível | sócios **ACTIVE** com `tierLevel` ≥ `minTierLevel` |

Quem não tem acesso vê o título e um trecho, com o selo "Exclusivo para sócios", como chamada para se associar. O staff vê tudo.

---

By: **will.i.am** | github.com/williampilger
