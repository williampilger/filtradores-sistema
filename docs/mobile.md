# App mobile (iOS / Android)

O app é **único**, em Expo (SDK 58) com Expo Router, e fica em `apps/mobile`. Instruções completas de execução e build estão em [`apps/mobile/README.md`](../apps/mobile/README.md).

- **Torcedor/sócio**: feed, jogos (compra, resgate de sócio, escalação), loja (compra, lista de espera, encomendas), carteirinha com **QR rotativo offline**, perfil (ingressos, pedidos, cobranças, notificações, 2FA, excluir conta).
- **Staff** (aparece conforme as permissões): leitor de QR em tela cheia, busca manual, painel do evento e venda na portaria.
- **Autenticação**: `POST /api/v1/auth/login` com `client: 'app'` → token guardado no SecureStore → `Authorization: Bearer`.
- **Cores**: `apps/mobile/src/theme.ts`, com os mesmos valores de [identidade-visual.md](identidade-visual.md).

⚠️ **App Store**: o plano de sócio inclui conteúdo digital (feed prime). Por isso, no iOS a adesão abre o site, e a análise da Apple precisa ser validada (ver `ToDo.md`). Ingressos e produtos físicos podem ser comprados dentro do app.

---

By: **will.i.am** | github.com/williampilger
