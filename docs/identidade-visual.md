# Identidade visual - ACE Filtradores

Referência para o painel web, as páginas públicas, o app (iOS/Android) e os e-mails.

> **Fonte:** levantamento informal a partir do Instagram oficial [@acefiltradores](https://instagram.com/acefiltradores) (perfil, escudo e artes dos posts) em 15/11/2026.
> ⚠️ **Não é um manual oficial.** Validar com a diretoria e substituir as cores e os arquivos pelos originais (vetor do escudo, códigos de cor do fornecedor das artes) quando forem enviados.

## O clube

| | |
|---|---|
| Nome completo | **Associação Cultural e Esportiva Filtradores** |
| Sigla / nome curto | **ACEF** · "ACE Filtradores" · "Filtradores" |
| Modalidade | **Futsal** (Gauchão de Futsal - Série A 2026; campeão Série B 2024; vice Série C) |
| Casa | Ginásio do Morangão - Bom Princípio/RS |
| Instagram | `@acefiltradores` |

## Escudo

- Formato: **escudo** (brasão) com borda **vermelho-escuro**.
- No centro: **bola de futebol** e uma **caneca de chope**, sobre um fundo de **raios amarelo/laranja**.
- Embaixo, uma **faixa amarela** com o texto "ACEF".
- Em cima, uma **estrela vermelha**.

Uso no sistema:

- Não redesenhar nem recriar o escudo. Usar **somente o arquivo oficial**:
  - logo do clube: tela **Admin > Configurações** (vai para `ClubSettings.logoKey`);
  - arquivos estáticos (favicon, ícone do app, splash): `apps/web/public/brand/` e `apps/mobile/assets/`.
- Enquanto o arquivo oficial não for enviado, as telas mostram a sigla **ACEF** no estilo de título (ver Tipografia).
- Área de respiro mínima: ¼ da largura do escudo. Sobre fundos azuis, aplicar dentro de um círculo branco, como no avatar do Instagram.

## Cores

A cor dominante das artes é o **azul royal**. **Vermelho** e **branco** vêm do uniforme (listras). **Amarelo/ouro** vem do escudo e é usado como destaque.

| Token (`globals.css`) | Hex | Uso |
|---|---|---|
| `--color-brand` | `#1b3fd1` | Azul royal: cor principal, botões primários, cabeçalhos, fundos de destaque |
| `--color-brand-strong` | `#102c9e` | Hover, barra lateral, gradientes |
| `--color-brand-deep` | `#0a1c66` | Topo/header, fim dos gradientes, texto sobre o dourado |
| `--color-brand-soft` | `#e6ebfc` | Fundos suaves, seleção, foco de inputs |
| `--color-club-red` | `#d62631` | Vermelho do uniforme: chamadas ("à venda!"), listras, alertas de marca |
| `--color-club-red-deep` | `#8f1d22` | Borda do escudo; uso pontual |
| `--color-club-gold` | `#f5b700` | Ouro do escudo: CTA de destaque (`.btn-accent`), item ativo do menu, selos |
| `--color-club-orange` | `#e8891b` | Raios do escudo: uso pontual em ilustrações |
| Branco | `#ffffff` | Fundo das artes "claras" e texto sobre azul |

Estados do sistema (ok, aviso, erro, info) seguem os tokens neutros `--color-ok`, `--color-warn`, `--color-danger` e `--color-info`. **Não** usar o vermelho do clube para indicar erro, porque o torcedor confundiria "marca" com "falha".

Regras:

- ⚠️ Nenhuma cor fora dos tokens (diretriz do projeto - `docs/0-Diretrizes.md`).
- Proporção aproximada das artes: **60% azul**, 25% branco, 10% vermelho, 5% ouro.
- Texto sobre azul é sempre branco. Texto sobre ouro usa `--color-brand-deep`.
- O app mobile usa os mesmos valores em `apps/mobile/src/theme.ts`.

## Tipografia

As artes usam títulos **condensados, pesados, em itálico e caixa alta** ("SEJA SÓCIO", "FIM DE JOGO", "QUARTAS DE FINAL") e, em algumas chamadas, um **pincel/script** vermelho ("Ingressos *à venda!*").

| Papel | Fonte | Onde |
|---|---|---|
| Títulos / display | **Oswald** 600–700, itálico, caixa alta (classe `.display`) | Hero, títulos de seção, placar, nome do plano na carteirinha |
| Texto | **Inter** 400–600 | Todo o resto (painel, formulários, tabelas) |
| Script (opcional) | Não implementado | Só em artes de divulgação, nunca na interface |

As fontes são carregadas por `next/font/google` (`apps/web/src/app/layout.tsx`), com as variáveis `--font-oswald` e `--font-inter`. No app são carregadas por `@expo-google-fonts/oswald` e `@expo-google-fonts/inter`.

## Elementos gráficos

- **Listras diagonais** azul / branco / vermelho, como no uniforme: classe `.club-stripes`, para faixas decorativas em banners e topo da carteirinha.
- **Gradiente azul** radial (royal → profundo): classe `.hero-blue`, para hero da home, carteirinha e cabeçalho do evento.
- **Placar** no estilo "FIM DE JOGO": escudos lado a lado + números grandes em `.display`.
- **Fotos** de jogadores recortadas sobre fundo azul. Na interface, as fotos ficam em cards com cantos arredondados (10 px).

## Aplicações

| Tela | Aplicação |
|---|---|
| Home pública | Hero `.hero-blue` com "SEJA SÓCIO" em `.display`, próximo jogo com escudos e CTA `.btn-accent` "Garanta seu ingresso" |
| Evento | Cabeçalho azul com "ACEF x ADVERSÁRIO", data e Ginásio do Morangão; lotes em cards brancos |
| Carteirinha (app/web) | Cartão azul com gradiente, faixa `.club-stripes`, escudo, nome do plano em `.display`, QR rotativo em quadro branco |
| Painel administrativo | Neutro (fundo `--color-app`), header `--color-brand-deep`, menu lateral `--color-brand-strong` com item ativo em ouro |
| Leitor de QR (portaria) | Tela cheia **verde** (`--color-ok`) liberado / **vermelha** (`--color-danger`) negado: legibilidade acima da marca |
| E-mails | Título e botão `#1b3fd1` (`packages/integrations/src/mailer.ts`) |

## Tom de voz

Próximo da torcida, direto e com energia: "Seu lugar no Filtradores começa aqui!", "Garanta seu ingresso", "Seja sócio". Mensagens do sistema continuam claras e objetivas.

## Pendências

- [ ] Receber o **vetor oficial do escudo** (SVG/PDF) e colocá-lo em `apps/web/public/brand/` e `apps/mobile/assets/`. Gerar favicon, ícone do app (1024×1024) e splash.
- [ ] Confirmar os **códigos de cor** com quem produz as artes.
- [ ] Confirmar a **fonte** dos títulos das artes. Se for outra condensada (ex.: Bebas Neue, Anton), trocar em `layout.tsx` e no app.

---

By: **will.i.am** | github.com/williampilger
