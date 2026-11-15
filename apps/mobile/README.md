# App ACE Filtradores (iOS / Android)

App único (Expo SDK 58 + Expo Router) para **torcedores e sócios** e para a **equipe** (portaria e organização) da
Associação Cultural e Esportiva Filtradores - futsal, Bom Princípio/RS, Ginásio do Morangão.

Consome a API do `apps/web` (`/api/v1/...`) com `Authorization: Bearer <token>` e usa o pacote `@filt/shared`
(tipos, rótulos, formatação e o QR rotativo da carteirinha).

## Funcionalidades

| Aba | O que tem |
|---|---|
| **Início** | Chamada "Seja sócio", próximo jogo e feed (fixados primeiro; posts exclusivos mostram "Exclusivo para sócios") |
| **Jogos** | Próximos/anteriores, detalhe com lotes, preço de sócio, resgate do ingresso de sócio, escalação e compra |
| **Loja** | Produtos, variações, preço de sócio, encomenda (lote aberto) e lista de espera |
| **Carteirinha** | Carteirinha com **QR rotativo** (muda a cada 30 s, gerado no aparelho, funciona **offline** no ginásio), situação e pagamento da cobrança, planos |
| **Perfil** | Dados, foto, ingressos (QR), pedidos, cobranças de sócio, lista de espera, notificações, segurança (2FA, senha), **excluir conta**, sair |
| **Portaria** | Só para quem tem `checkin.validate`, `events.read` ou `tickets.sell_manual` (ou master): leitor de QR em tela cheia (verde/vermelho + vibração), busca manual, painel e venda na portaria |

Pagamentos: PIX na própria tela (QR + "Copiar código PIX"); cartão, boleto e checkout do gateway abrem no navegador do
sistema. A tela do pedido consulta o status a cada 5 s até o pagamento ser confirmado.

## Estrutura

```
apps/mobile/
├── app.config.ts        # lê o .env da RAIZ (EXPO_PUBLIC_API_URL, EXPO_PUBLIC_DEMO_MODE) -> extra.apiUrl / extra.demoMode
├── metro.config.js      # monorepo: resolve @filt/shared (TS direto de packages/shared/src)
├── eas.json             # perfis de build: development / preview / production
└── src/
    ├── theme.ts         # FONTE ÚNICA das cores (mesmos tokens do apps/web/src/app/globals.css)
    ├── api.ts           # cliente da API (nunca lança exceção; 401 -> login; 403 2FA -> tela de 2FA)
    ├── session.tsx      # sessão (token no SecureStore + GET auth/me)
    ├── storage.ts       # SecureStore: token, id do aparelho, cache da carteirinha
    ├── app/             # rotas (Expo Router, typed routes)
    │   ├── (auth)/      # login, cadastro, recuperar senha, 2FA (modal)
    │   ├── (tabs)/      # Início, Jogos, Loja, Carteirinha, Perfil, Portaria
    │   ├── event/ product/ order/ checkout.tsx plans.tsx
    │   ├── me/          # telas do perfil
    │   └── gate/[eventId]/  # portaria: hub, leitor, busca, painel, venda
    ├── components/  hooks/  lib/
```

## Rodando no celular (desenvolvimento)

1. Na raiz do repositório: `npm install` (instala todos os workspaces).
2. Suba a API: `npm run dev:web` (porta 3000) - ou use a do servidor `sony`.
3. No `.env` da **raiz**, aponte o app para um endereço que o celular alcance (não use `localhost`):
   ```
   EXPO_PUBLIC_API_URL=http://<IP-da-máquina>:3000    # ex.: http://192.168.0.10:3000 (mesma rede Wi-Fi)
   # ou
   EXPO_PUBLIC_API_URL=http://sony:26006
   ```
   `EXPO_PUBLIC_DEMO_MODE=true` mostra a faixa "AMBIENTE DE DEMONSTRAÇÃO · dados fictícios" no topo das telas.
4. Inicie o Metro: `npm run dev:mobile` (ou `cd apps/mobile && npx expo start`).
5. Abra no aparelho:
   - **Expo Go** (Android/iOS, mesma rede): leia o QR exibido no terminal. Se a rede bloquear, use `npx expo start --tunnel`.
   - **Development build** (recomendado para testar câmera, SecureStore e fontes como no app final):
     `npx eas build --profile development --platform android` e instale o APK.

Depois de mudar o `.env`, reinicie o Metro com `npx expo start -c` (limpa o cache).

Verificações: `npm run typecheck --workspace=apps/mobile` e `npx expo-doctor` (dentro de `apps/mobile`).
O TypeScript fica em 5.9.3 como no resto do monorepo (excluído da checagem de versões do Expo em `package.json`).

> **Monorepo:** os `overrides` de `react` na raiz fazem o npm manter o `expo-router` em `apps/mobile/node_modules`.
> O `app.config.ts` acrescenta essa pasta ao `NODE_PATH` do processo do Expo CLI para o gerador de *typed routes*
> funcionar (sem isso o `expo start` falha com `Cannot find module 'expo-router/internal/testing'`).

## Build e publicação (EAS)

```bash
npm i -g eas-cli
cd apps/mobile
eas login
eas init                      # cria o projeto no Expo e grava o projectId (extra.eas.projectId)
eas build --profile preview --platform android      # APK interno para testes
eas build --profile production --platform all       # lojas
eas submit --platform ios|android
```

As URLs da API de cada perfil ficam em `eas.json` (`env.EXPO_PUBLIC_API_URL`) e têm prioridade sobre o `.env`.

Identificadores: `br.com.acefiltradores.app` (iOS e Android), esquema de links `acefiltradores://`.

## App Store / Google Play - pendências

- [ ] **Escudo oficial:** ícone (1024×1024), ícone adaptativo do Android e splash ainda NÃO existem. Quando a diretoria
      enviar o vetor oficial, gerar os PNGs em `apps/mobile/assets/` e preencher `icon`, `android.adaptiveIcon` e o
      plugin `expo-splash-screen` em `app.config.ts`. **Não redesenhar o escudo** (ver `docs/identidade-visual.md`).
      Enquanto isso o app mostra a sigla "ACEF" no estilo de título.
- [ ] **Plano de sócio no iOS (regra 3.1.1 da Apple):** o plano libera conteúdo digital (posts exclusivos do feed), e a
      Apple pode exigir In-App Purchase para vendê-lo dentro do app. Por isso, **no iOS** "Quero ser sócio" e o
      pagamento de mensalidades abrem o site (`<API_URL>/socio`) no navegador; no Android o fluxo é no app
      (`src/lib/membership.ts`). Ingressos e produtos físicos podem ser vendidos no app (regra 3.1.3). Revisar após o
      retorno da revisão da Apple (talvez seja preciso também ocultar preços do plano no iOS).
      - TODO: a página `/socio` precisa existir no site.
- [ ] **Exclusão de conta** dentro do app: implementada (Perfil › Excluir conta), exigida pelas duas lojas.
- [ ] Textos de permissão (câmera e fotos) em PT-BR: em `app.config.ts`.
- [ ] Política de privacidade e conta de teste (com 2FA desativado) para os revisores.

---

By: **will.i.am** | github.com/williampilger
