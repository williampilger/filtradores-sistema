# Usuários, papéis e permissões

## Perfis

| Perfil | Como é representado | Acesso |
|---|---|---|
| **Master** | `User.isMaster = true` (criado pelo seed com `MASTER_EMAIL`) | **Tudo**, inclusive o que não estiver no catálogo. **2FA obrigatório**. |
| **Administrador de TI** | papel `it_admin` | Todas as permissões do catálogo. 2FA obrigatório (`require2fa`) - editável |
| **Diretoria** | papel `board` | Tudo, exceto `roles.manage` e `gateways.manage` |
| **Treinador** | papel `coach` | elenco, escalações, feed, ver eventos |
| **Organizador** | papel `organizer` | painel do evento, validar entradas, relatórios de entrada, venda na portaria, ver pedidos e sócios |
| **Validador de Entrada** | papel `gatekeeper` | apenas `checkin.validate` |
| **Torcedor / Sócio** | usuário sem papel | compras, ingressos, carteirinha (se sócio), feed conforme o nível do plano |

Os papéis padrão são criados pelo seed **uma única vez**. Depois disso, a diretoria edita nome, permissões e exigência de 2FA pelo painel (**Admin > Papéis**) e pode criar papéis novos. O seed não sobrescreve as alterações.

## Catálogo

O catálogo fica em `packages/shared/src/permissions.ts` (`PERMISSION_GROUPS`) e é a fonte única para a API, o painel e o app. As chaves seguem o formato `recurso.ação`:

| Grupo | Permissões |
|---|---|
| Administração | `users.read`, `users.write`, `roles.manage`, `audit.read`, `settings.manage` |
| Sócios | `members.read`, `members.write`, `plans.manage`, `memberships.charges` |
| Eventos e ingressos | `events.read`, `events.write`, `tickets.sell_manual`, `tickets.courtesy`, `tickets.refund` |
| Controle de entrada | `checkin.validate`, `checkin.reports` |
| Loja | `products.write`, `stock.adjust`, `waitlist.manage`, `orders.read`, `orders.manage` |
| Financeiro | `payments.read`, `payments.manual`, `payments.refund`, `gateways.manage`, `reports.finance` |
| Time e conteúdo | `feed.write`, `squad.write`, `lineups.write` |

⚠️ As chaves ficam gravadas no banco (`role_permissions`, `user_permission_overrides`). Para renomear uma chave, é preciso uma migration de dados.

## Resolução (`resolvePermissions`)

1. **Master**: todas.
2. União das permissões de todos os papéis do usuário.
3. `GRANT` individual: acrescenta permissões.
4. `DENY` individual: remove permissões, mesmo que venham de um papel. **O DENY sempre vence.**

### Restrição por evento (`EventStaff`)

Se o usuário estiver na equipe de **algum** evento (**Admin > Eventos > Equipe**), as permissões de evento (`events.read`, `checkin.validate`, `checkin.reports`, `tickets.sell_manual`) passam a valer **somente nos eventos listados**. Exemplo: um voluntário só consegue validar entradas do jogo para o qual foi escalado. Quem tem `events.write` não sofre essa restrição.

## Regras de segurança

- Rota sem permissão devolve **404**, para não revelar que existe.
- Ninguém altera os **próprios** papéis ou status.
- Só o master altera a conta do master.
- `users.write` cria e edita usuários. Para atribuir papéis ou permissões individuais, é preciso `roles.manage`.
- Bloquear um usuário encerra todas as sessões dele na hora (a sessão é opaca, então revoga imediatamente).
- Toda alteração de acesso vai para a auditoria (**Admin > Auditoria**).

## 2FA (TOTP)

- O padrão é RFC 6238, compatível com Google Authenticator, Authy, 1Password etc. O segredo fica criptografado no banco.
- **Master**: obrigatório. Ao entrar, o master só acessa a tela de cadastro do 2FA até concluir.
- Papéis com `require2fa`: mesma regra do master.
- Demais usuários: opcional, em **Minha conta > Segurança**.
- No cadastro são gerados 10 **códigos de recuperação**. Cada um vale uma vez e é guardado com hash argon2.
- Celular perdido:
  - usuário comum: quem tem `roles.manage` usa "Resetar 2FA" no cadastro do usuário;
  - **master**: só pelo servidor:
    ```bash
    cd ~/github/williampilger/filtradores-sistema/packages/db
    npx tsx --env-file=../../.env -e "import('./src/client.ts').then(async({prisma})=>{await prisma.user.update({where:{email:'EMAIL_DO_MASTER'},data:{totpEnabledAt:null,totpSecretEnc:null}});await prisma.recoveryCode.deleteMany({where:{User:{email:'EMAIL_DO_MASTER'}}});await prisma.\$disconnect()})"
    ```
- Proteção contra tentativas (login, 2FA, cadastro, "esqueci a senha"): `LOGIN_MAX_ATTEMPTS` por IP+e-mail a cada 15 min, contadas no Redis.

## Convites

A diretoria cria o usuário em **Admin > Usuários**. O sistema gera um link de convite que vale 7 dias. O link é mandado por e-mail e também aparece na tela, porque enquanto o SMTP não estiver configurado ele não chega por e-mail. Pelo link, o usuário define a própria senha.

---

By: **will.i.am** | github.com/williampilger
