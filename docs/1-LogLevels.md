# Níveis de log

`LogSystem.<nível>(código, mensagem, ctx?)` — implementação única em `packages/core/src/log.ts` (o nome do app vem de `LOG_APP_NAME`: `filt-web` / `filt-worker`).

| Tipo | Utilização(ões) |
| --- | --- |
| `trace` | Informações minuciosas, dados para debug específico de algum problema (valores de variáveis, dumps de objetos...). |
| `debug` | Marcações de passagem por locais, início e fim de requisição, etc. |
| `info` | Coisas normais que aconteceram com o usuário: ações do usuário, alteração de dados, etc. |
| `INFO (info)` | Mesmo que `info`, mas também é comunicado via notificação (Google Chat). |
| `warn` | Algo que deu errado por erro do usuário. Exemplos: falha de login, dados inválidos. |
| `error` | Algo que deu errado, mas não por erro normal do usuário. Não deveria acontecer no uso normal. |
| `ERROR (error)` | Mesmo que `error`, mas também é comunicado via notificação. Usado inclusive para possíveis tentativas de invasão (ex.: webhook com assinatura inválida) e situações financeiras que exigem ação (pagamento após expiração, chargeback, lote cancelado com encomendas pagas). |
| `fatal` | Algo que pode, e provavelmente vai, parar o servidor (sempre notificado). |

As notificações vão para `GOOGLE_CHAT_WEBHOOK`. Se a variável estiver vazia, as notificações ficam desativadas.

---

By: **will.i.am** | github.com/williampilger
