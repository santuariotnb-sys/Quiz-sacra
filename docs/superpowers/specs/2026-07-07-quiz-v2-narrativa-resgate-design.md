# Quiz Sacra v2 — "Narrativa de Resgate" (Design Spec)

**Data:** 2026-07-07
**Objetivo de negócio:** aumentar a taxa de início (hoje 6–7,5% de `arrival → question`) e o volume de leads, preparando a troca da campanha Meta para otimização de **Lead** (via CAPI).
**Decisões travadas com o dono:**
- Quiz atual (`/sacra/quiz`) **intocado** durante todo o desenvolvimento.
- Abordagem A: protótipo navegável em deploy preview isolado (`*.pages.dev`) → validação visual → porte para o repo `Quiz-sacra` reusando engine/tracking/checkout.
- Produção final como **path** (ex.: `/sacra/v2`), nunca subdomínio (decisão registrada: subdomínio quebra multi-toque UTM + bug de splat rules no Cloudflare Pages).
- Nome coletado no início (Passo 0); **WhatsApp continua como gate antes do resultado** — é o evento Lead da campanha.

## Dados que sustentam o design (banco de produção, 07/07)

- Connect rate real: ~96% (147 arrivals / 153 cliques). Página carrega bem — problema não é velocidade de entrega.
- Gargalo: `arrival → question` = 6,1%. 138 de 147 pessoas foram embora sem clicar.
- Quem inicia converte: 3 leads / 9 inícios (33%).
- Pixel captura só 1/3 dos leads → Lead via CAPI é pré-requisito da troca de campanha (fora do escopo desta spec, trackeado separadamente).

## Fluxo (9 telas)

### 1. Hero — Passo 0 (micro-compromisso)
- Headline: **"Deus não te chamou para viver de plantão."**
- Sub: "Sua exaustão não é falta de fé, é o seu corpo pedindo rendição. Descubra em 2 minutos qual padrão está roubando sua paz e como voltar ao colo do Pai."
- **3 botões de dor** (tons terrosos, grandes, clicáveis <1s no 4G, zero animação bloqueante):
  1. `[ O cansaço que me esmaga ]` → pré-score **sobrecarga**
  2. `[ Minha oração não passa do teto ]` → pré-score **vigilante**
  3. `[ Sinto culpa por querer sumir ]` → pré-score **culposa**
- Clique dispara stage novo `hero_intent` (payload: qual dor).
- Imagem: Jaqueline em ambiente de paz, 4:5, balão de fala orgânico.
- Estética: fundo areia `#F6F0E4`, Playfair Display (títulos) + Inter (texto), sentence case, sem caps.

### 2. Nome (transição)
- Jaqueline responde à dor clicada com copy **específica por botão** (3 variantes), depois: "Antes de darmos nome ao seu padrão, como posso te chamar?"
- Input grande, autofocus, botão `DESCOBRIR MEU PADRÃO →`.

### 3. Q1–Q7 com Chat de Validação
- Mantém as **7 perguntas e scores atuais** (`src/data/quiz.ts`).
- Feedbacks da Jaqueline entre perguntas são **condicionais à resposta marcada** (mecanismo `transitionFrom` já existente). Nunca citar sintoma que ela não marcou.
- Copy base do dono (blueprint 07/07) adaptada em variantes por resposta.

### 4. Gate WhatsApp
- Antes do resultado, como hoje. Dispara **Lead** (pixel + CAPI com telefone hasheado — padrão EMQ do Purchase).
- Nome já coletado → tela pede só WhatsApp, com promessa de entrega do diagnóstico.

### 5. Loading com ponte + depoimentos
- Copy ponte: "[Nome], cada padrão tem um caminho específico de saída. Estou cruzando suas respostas para montar o seu... Enquanto isso, veja o que aconteceu com mulheres que descobriram o delas:"
- Barra de progresso 8–10s com etapas nomeadas ("Analisando seus sintomas… Identificando seu padrão… Montando seu caminho").
- **Carrossel de depoimentos estilo WhatsApp em HTML** (não imagem): bolhas, horário, check azul, linguagem real (calibrada pelos exemplos reais enviados 07/07 — pontuação corrida, "viu", "colhendo frutos da minha fé", emojis 🙏😭❤️).

### 6. Resultado — stories interativos (4 variantes, uma por arquétipo)
- Cena 0 — Veredito: "Seu padrão é {Arquétipo}" + soco e abraço ("sentinela nenhuma aguenta ficar de guarda a vida inteira sem ser rendida").
- Cena 1 — Verdade bíblica: "Isso não é falta de fé. É exaustão acumulada." (Romanos 12:2, Rendimento de Turno).
- Cena 2 — 3 Passos NeuroFé: Render o Corpo / Resetar a Mente / Habitar no Colo. Imagem 1:1 por passo.
- Arquétipos: vigilante, sobrecarga, culposa, antecipatoria (motor atual).

### 7. Dicotomia de identidade
- Lado A 🔴 Mula de Carga vs Lado B 🟢 Filha Cuidada, 2 imagens 4:5, itálicos suaves.
- Fecho: "Deus está rendendo o seu turno agora, [Nome]. Você aceita o colo?"

### 8. Oferta no-brainer
- Dados reais confirmados no código (`NEUROFE_OFFER`, preços via DB):
  - Âncora R$ 228 → **R$ 47** à vista, ou **10× R$ 5,60** (com juros, valor exato confirmado).
  - **Protocolo de 14 Encontros (Vol. I Despertar + Vol. II Repouso)** — nomenclatura padronizada (não "7 dias").
  - Bônus: 148 Louvores em Salmos · Guia Dormir Melhor · Devocional 30 dias.
  - Garantia **15 dias**, framing "faça a sua primeira noite… fica com os áudios e bônus".
- Sem timer, sem vagas limitadas, sem caps (regra da casa).
- Seção de depoimentos WhatsApp completa antes da garantia.

### 9. Checkout
- Reusa `CheckoutModal`/fluxo atual no porte. No protótipo: botão leva a placeholder.

## Depoimentos — política

- 6 modelos escritos na voz real da persona para o protótipo.
- **Antes de produção:** cada depoimento ancorado em história real do dono (áudios transcritos, validados/ajustados por ele). Nenhum depoimento inventado vai ao ar.

## Imagens — placeholders e prompts

Protótipo nasce com placeholders na proporção exata; prompts numerados entregues ao dono (geração via ChatGPT):

| # | Uso | Proporção | Sugestão px |
|---|-----|-----------|-------------|
| 1 | Jaqueline hero (paz, olhando para a lead) | 4:5 | 1080×1350 |
| 2 | Passo 1 Render o Corpo (respiro fundo) | 1:1 | 1024×1024 |
| 3 | Passo 2 Resetar a Mente (luz neural) | 1:1 | 1024×1024 |
| 4 | Passo 3 Habitar no Colo (abraço/paz) | 1:1 | 1024×1024 |
| 5 | Dicotomia A — Mula de Carga | 4:5 | 1080×1350 |
| 6 | Dicotomia B — Filha Cuidada | 4:5 | 1080×1350 |
| 7 | Jaqueline na oferta (convite ao colo) | 4:5 | 1080×1350 |

## Tracking (stages novos no `quiz_funnel_events`)

- `hero_intent` (nova) — clique no botão de dor, com qual dor.
- Demais stages mantidos: arrival, question, contact, result, offer, cta.
- Validar aceitação do stage novo no endpoint `save-quiz-session` (hoje rejeita stages fora da lista — deu 400 com `contact_gate` no passado).

## Fora de escopo (desta spec)

- Implementação do Lead via CAPI no `persist_lead` (pré-requisito da campanha, trabalho separado).
- Troca da campanha Meta para otimização de Lead.
- Qualquer alteração no quiz atual em produção.
- A/B automatizado (decisão: análise manual no preview antes de produção).

## Critérios de sucesso

1. Protótipo navegável no celular via URL preview, todas as 9 telas.
2. `hero_intent → question` mensurável no banco após produção.
3. Meta de negócio: início (`arrival → question`) acima dos 7,5% do teste atual.
4. Lead/dia ≥ 2× baseline (hoje ~3/dia) com mesmo gasto, após campanha otimizada para Lead.
