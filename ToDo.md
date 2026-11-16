# To-Do List - ACE Filtradores

Legenda: `[X]` feito · `[ ]` pendente · ⚠️ prioridade

## ⚠️ Antes de usar com o público

- [ ] ⚠️ **Desligar a demonstração**: `DEMO_MODE=false`, recriar o banco sem dados de exemplo e trocar a senha padrão (`Teste53!`) do master

- [ ] ⚠️ **Credenciais de sandbox** dos 4 gateways (Stripe, Mercado Pago, PagSeguro, Asaas) para validar ponta a ponta: `npm run sandbox:<gateway>` em `vendor/payment-gateways` + compra real no site/app com webhook chegando (ver `vendor/payment-gateways/ToDo.md`, que lista os pontos da API ainda não confirmados, principalmente do PagBank)
- [ ] ⚠️ Escolher **qual gateway atende cada método** (prioridade) e virar para produção (`sandbox` desligado)
- [X] Repo `payment-gateways` criado no GitHub (privado): https://github.com/williampilger/payment-gateways
- [ ] ⚠️ Criar o secret `PAYMENT_GATEWAYS_TOKEN` neste repo (PAT fine-grained, *Contents: read* no `payment-gateways`) - sem ele o CI não baixa o submódulo
- [X] `payment-gateways` como submódulo + workspace (sem `file:`/build) - ver `CHANGELOG.md`
- [ ] ⚠️ Garantir acesso SSH do sony ao repo privado `payment-gateways` (deploy key ou chave do usuário)
- [ ] ⚠️ **Escudo oficial** em vetor (SVG/PDF) + confirmação de cores e fonte com a diretoria (`docs/identidade-visual.md` > Pendências). Gerar favicon, ícone do app e splash
- [ ] ⚠️ **SMTP** (Postfix no sony ou provedor transacional): hoje os e-mails (convite, reset de senha, confirmação, avisos) são apenas logados pelo worker
- [ ] ⚠️ Deploy no sony (`docs/deploy.md`): banco no `mysql-dev` do sony, nginx, túnel, `BACKUP_APPS`
- [ ] ⚠️ Revisar com a diretoria: planos reais, preços, regras de acesso aos jogos (CLAIM x AUTOMATIC), capacidade do Morangão, textos/termos de uso
- [ ] ⚠️ Termos de uso e política de privacidade (LGPD) - texto em Configurações + aceite no cadastro

## Base / infraestrutura

- [X] Ambiente de demonstração (`npm run db:demo:reset`): dados fictícios de todos os fluxos, imagens ilustrativas com marca d'água, gateway simulado - `docs/demonstracao.md`
- [ ] Campeonato como cadastro próprio (tabela/classificação automática) - hoje é texto no evento + post com a arte da classificação

- [X] Monorepo (npm workspaces) nos padrões dos projetos recentes
- [X] `.env` único na raiz + `.env.sample`
- [X] Banco no `mysql-dev` (principal, shadow, teste)
- [X] Redis próprio (`filt-redis` :6393)
- [X] Scripts `deploy:sony` / `redeploy:sony`
- [X] CI (GitHub Actions): typecheck, lint, testes, build
- [ ] Usuário read-only no Grafana do sony (`infrastructure/sony/grafana.md`)
- [ ] Storage em nuvem (hoje `.storage/` local)
- [ ] Playwright E2E (fluxos: compra PIX sandbox, check-in, lista de espera)

## Pagamentos

- [X] Pacote separado `payment-gateways` (Stripe, MP, PagSeguro, Asaas, manual, cortesia) com testes
- [X] Configuração por tela (credenciais criptografadas, sandbox, prioridade por método)
- [X] Webhooks com assinatura + idempotência + reprocessamento + reconciliação periódica
- [X] Estorno total/parcial; pagamento após expiração sinalizado para estorno
- [ ] **Recorrência nativa no cartão** para mensalidade (assinaturas do gateway) - hoje a cobrança é gerada pelo sistema
- [ ] Cupons de desconto
- [ ] Split de pagamento (patrocinadores/parceiros) - avaliar
- [ ] Relatórios financeiros com exportação (CSV/Excel) e conciliação com extrato

## Ingressos / entrada

- [X] Eventos, lotes, capacidade total + cota de sócios, desconto de sócio
- [X] Cortesias auditadas, venda na portaria, resgate de ingresso do sócio
- [X] Validação atômica (ingresso e carteirinha), log de leituras, busca manual
- [ ] ⚠️ **Check-in offline**: baixar manifesto do evento (hash dos códigos + sócios elegíveis) e sincronizar ao voltar a conexão - o ginásio pode ficar sem sinal
- [ ] Transferência de ingresso entre torcedores
- [ ] Meia-entrada com comprovação (hoje: lote "meia" sem validação de documento)
- [ ] Importar histórico de compras/clientes do Sympla
- [ ] Ingresso em PDF / Apple Wallet / Google Wallet

## Sócios

- [X] Planos, adesão, cobranças automáticas, carência/inadimplência/expiração
- [X] Carteirinha com QR rotativo offline + reemissão
- [X] Ajuste manual de sócio (sócios antigos) e pagamento manual de mensalidade
- [ ] Troca de plano pelo próprio sócio (upgrade/downgrade com pro-rata)
- [ ] Benefícios com parceiros (descontos em estabelecimentos) - validação da carteirinha pelo parceiro

## Loja

- [X] Estoque com reserva, lista de espera FIFO com chamada e prazo, encomendas em lotes de produção
- [X] Controle de entrega/retirada
- [ ] Carrinho com vários itens (hoje: compra direta por produto/evento; a API já aceita vários itens)
- [ ] Frete / entrega em domicílio (hoje: retirada)
- [ ] Personalização de camisa (nome/número) como campo do pedido

## App mobile

- [X] App único (torcedor + Staff), carteirinha offline, leitor de QR
- [ ] ⚠️ **Contas Apple Developer e Google Play** (da associação) + builds EAS + publicação
- [ ] ⚠️ **Regras da App Store** para venda do plano de sócio (conteúdo digital "prime"): validar com a revisão da Apple; hoje no iOS a adesão abre o site
- [ ] Push notifications (expo-notifications) - hoje: notificações in-app + e-mail
- [ ] Deep links (`acefiltradores://pedido/<code>`) no retorno dos checkouts

## Segurança

- [X] 2FA TOTP (obrigatório para master e papéis configurados), códigos de recuperação
- [X] Rate limit de login/2FA/cadastro/recuperação
- [X] Auditoria de ações administrativas
- [ ] Captcha (Turnstile) no cadastro/login se houver abuso
- [ ] Alerta de login em dispositivo novo
- [ ] Revisão de segurança (pentest básico) antes de abrir ao público

---

By: **will.i.am** | github.com/williampilger
