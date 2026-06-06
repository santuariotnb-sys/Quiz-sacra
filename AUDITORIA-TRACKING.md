# Auditoria Completa de Tracking — Quiz Sacra

**Data:** 2026-05-31
**Escopo:** Verificacao pratica de CADA evento disparado em CADA interacao do usuario no funil.

---

## Tabela Completa de Eventos por Interacao

| # | Momento do usuario | Arquivo:Linha | Evento Meta (fbq) | event_id | value | currency | Dados extras | Evento DB (Supabase) | Tabela |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Abre qualquer pagina | `index.html:17-18` | `PageView` | Nenhum (padrao Meta) | -- | -- | pixel_id: 838169472100225 | Nenhum | -- |
| 2 | Digita nome + clica "Estou pronta" | `QuizApp.tsx:144-147` (startQuiz) | **NENHUM** | -- | -- | -- | -- | **NENHUM** | -- |
| 3 | Clica resposta do quiz (7x) | `QuizApp.tsx:149-177` (answer) | **NENHUM** | -- | -- | -- | -- | **NENHUM** | -- |
| 4 | Quiz termina → loading | `QuizApp.tsx:161,192` | **NENHUM** | -- | -- | -- | -- | `persistLead()` dispara (fire-and-forget) | `leads` + `quiz_responses` |
| 5 | Resultado aparece | `QuizApp.tsx:190` (setStage "result") | **NENHUM** | -- | -- | -- | -- | **NENHUM** (persistLead ja rodou no loading) | -- |
| 6 | Digita email + clica "Enviar" | `QuizApp.tsx:242-255` (saveEmail) | **NENHUM** | -- | -- | -- | -- | Insert em `leads` (novo registro com email) | `leads` |
| 7 | Clica CTA do resultado → oferta | `QuizApp.tsx:257-259` (goToOffer) | **NENHUM** | -- | -- | -- | Muda stage para "offer" | **NENHUM** | -- |
| 8 | Clica "QUERO MINHA PAZ" (checkout) | `QuizApp.tsx:261-269` (checkout) | `InitiateCheckout` | `ic_qs_{uuid}` | **47** | BRL | content_name: "Rotina de Paz", content_ids: ["rotina_de_paz"] | `saveTrackingSession()` → upsert | `tracking_sessions` |
| 9 | Kirvano redirect → /sacra/obrigado | `obrigado.tsx:20-28` + `OfferPage.tsx:48-82` | `Purchase` | `transaction_id` ou `tid` da URL (fallback: UUID) | **parseFloat(URL ?value) ou fallback 47** | BRL | content_name: "Rotina de Paz", content_ids: ["rotina_de_paz"] | **NENHUM** (so pixel client-side) | -- |
| 10 | Upsell: clica aceitar | `OfferPage.tsx:111-121` (handleAccept) | `InitiateCheckout` | `ic_qs_{uuid}` | **67** (parseFloat de "R$ 67") | BRL | content_name: "A Chave da Gratidao" | `saveTrackingSession()` → upsert | `tracking_sessions` |
| 11 | Upsell: clica recusar → downsell | `OfferPage.tsx:123-125` (handleDecline) | **NENHUM** | -- | -- | -- | Redirect para `/sacra/obrigado?offer=downsell` | **NENHUM** | -- |
| 12a | Downsell: clica aceitar | `OfferPage.tsx:111-121` (handleAccept) | `InitiateCheckout` | `ic_qs_{uuid}` | **37** (parseFloat de "R$ 37") | BRL | content_name: "A Chave da Gratidao" | `saveTrackingSession()` → upsert | `tracking_sessions` |
| 12b | Downsell: clica recusar | `OfferPage.tsx:123-125` (handleDecline) | **NENHUM** | -- | -- | -- | Redirect para app login | **NENHUM** | -- |

---

## Verificacao de Valores

### InitiateCheckout do checkout principal (Rotina de Paz)
- **Arquivo:** `QuizApp.tsx:267`
- **Codigo:** `await trackInitiateCheckout(externalId, { contentName: "Rotina de Paz", value: 47 })`
- **CORRETO:** value hardcoded 47

### InitiateCheckout do upsell (Chave da Gratidao)
- **Arquivo:** `OfferPage.tsx:116-119`
- **Codigo:** `value: parseFloat(content.offer.price.replace(/[^\d,.]/g, "").replace(",", ".")) || undefined`
- **UPSELL content.offer.price = "R$ 67"** → parseFloat("67") = **67** ✓
- **DOWNSELL content.offer.price = "R$ 37"** → parseFloat("37") = **37** ✓

### Purchase no redirect Kirvano
- **Arquivo:** `OfferPage.tsx:67-76`
- **Logica:** Le `?value` ou `?amount` da URL → parseFloat. **Se nao existir na URL, fallback = 47**
- **Codigo exato (linha 73):** `const parsed = rawValue ? parseFloat(rawValue) : 47;`
- **CORRETO:** fallback 47 para quando Kirvano nao manda o valor na URL
- **Dedup:** Usa `transaction_id` ou `tid` da URL como eventID + sessionStorage guard

### Purchase so dispara no upsell (primeira view), NAO no downsell
- **Arquivo:** `obrigado.tsx:27` → `firePurchasePixel={!isDownsell}`
- **CORRETO:** Purchase so dispara quando `offer !== "downsell"`

---

## Verificacao de Funcoes Auxiliares

### captureUtms()
- **Chamada em:** `QuizApp.tsx:112-114` — useEffect no mount (1x)
- **Comportamento:** Le UTMs da URL, salva em localStorage sob `rdp:utm`. Se nao tem UTMs na URL, le do storage.
- **Os UTMs chegam ao banco?** SIM — via `persistLead()` (QuizApp.tsx:201, spread `...utms` no insert de `leads`) e via `saveEmail()` (QuizApp.tsx:247, spread `...utms`)
- **Os UTMs viajam pro Kirvano?** SIM — via `buildKirvanoUrl()` que chama `captureUtms()` internamente (utm.ts:34)

### saveTrackingSession()
- **Chamada em:**
  1. `QuizApp.tsx:265` — no checkout principal (antes do redirect Kirvano)
  2. `OfferPage.tsx:114` — no handleAccept do upsell/downsell
- **Salva:** fbp, fbc, fbclid, user_agent, external_id → tabela `tracking_sessions` (upsert por external_id)
- **CORRETO:** fire-and-forget, nao bloqueia

### persistLead()
- **Chamada em:** `QuizApp.tsx:192` — no useEffect do stage "loading" (1x)
- **Insere em `leads`:** name, archetype, scores, desire, situation, risk_flag + UTMs
- **Insere em `quiz_responses`:** 7 rows (uma por pergunta), com lead_id, question_key, answer_value, answer_text, time_to_answer
- **CORRETO:** Faz os dois inserts sequenciais

### saveEmail()
- **Chamada em:** `QuizApp.tsx:862` — ao submeter form de email no resultado
- **ATENCAO:** Faz um **NOVO insert** em `leads` (nao update do lead existente). Isso cria um registro DUPLICADO com email mas sem scores/risk_flag.

---

## Gaps e Problemas Encontrados

### 1. NENHUM evento ViewContent no resultado
- **Momento:** Quando o resultado do quiz aparece (stage = "result"), nenhum evento `ViewContent` e disparado.
- **Impacto:** Nao ha sinal para o Meta de que o usuario viu o resultado personalizado. Perda de dado para otimizacao de publico.
- **Sugestao:** Adicionar `fbq('track', 'ViewContent', { content_name: archetype.name })` ao entrar no result.

### 2. NENHUM evento Lead no quiz
- **Momento:** Nao ha evento `Lead` ou `CompleteRegistration` em nenhum ponto do funil.
- **Impacto:** O Meta nao sabe quantas leads qualificadas o quiz gera. Impossivel otimizar campanha para leads.
- **Sugestao:** Disparar `Lead` no persistLead() ou quando o resultado aparece.

### 3. saveEmail() cria lead DUPLICADO
- **Arquivo:** `QuizApp.tsx:242-255`
- **Problema:** Faz `sb.from("leads").insert(...)` em vez de update. O lead ja foi criado no `persistLead()` durante o loading. Resultado: 2 registros na tabela `leads` para o mesmo usuario — um com scores e sem email, outro com email e sem scores.
- **Sugestao:** Usar update no lead_id existente (ja salvo em localStorage como `sacra_student.lead_id`).

### 4. Purchase NAO salva no Supabase
- **Momento 9:** O Purchase (OfferPage.tsx:48-82) so dispara o pixel client-side. Nao ha insert em nenhuma tabela Supabase.
- **Impacto:** Se o pixel falhar (adblocker, JS bloqueado), nao ha registro de purchase no banco. A reconciliacao depende inteiramente do webhook Kirvano (que e externo a este codigo).
- **Nota:** Isso pode estar OK se o webhook server-side cuida dessa parte. Mas nao ha fallback client-side.

### 5. Nenhum evento ao clicar respostas do quiz
- **Momento 3:** Cada resposta clicada nao gera nenhum sinal (nem Meta nem Supabase).
- **Impacto baixo:** O tracking de respostas individuais acontece no `persistLead()` ao final. Mas nao ha event `CustomEvent` ou micro-conversao para o Meta durante o quiz.

### 6. Recusa de upsell/downsell nao gera evento
- **Momentos 11 e 12b:** Clicar "Nao quero" faz redirect direto sem nenhum tracking.
- **Impacto:** Impossivel medir taxa de recusa no Meta. No Supabase tambem nao ha registro.

### 7. Nao ha AddToCart
- Nenhum evento `AddToCart` existe no funil inteiro. O fluxo vai direto de resultado para `InitiateCheckout`.

---

## Resumo dos Destinos por Tabela Supabase

| Tabela | Momento que insere | Campos principais |
|---|---|---|
| `leads` | Loading (persistLead) | name, archetype, scores, desire, situation, risk_flag, UTMs |
| `leads` | Email (saveEmail) — **DUPLICADO** | name, email, archetype, desire, situation, UTMs (sem scores/risk_flag) |
| `quiz_responses` | Loading (persistLead) | lead_id, question_key, answer_value, answer_text, time_to_answer |
| `tracking_sessions` | Checkout principal + handleAccept upsell/downsell | external_id, fbp, fbc, fbclid, user_agent |

---

## Resumo dos Eventos Meta por Etapa

| Evento | Onde | Value | EventID |
|---|---|---|---|
| `PageView` | index.html (todas as paginas) | -- | -- |
| `InitiateCheckout` | checkout principal (QuizApp) | 47 | `ic_qs_{uuid}` |
| `InitiateCheckout` | aceitar upsell (OfferPage) | 67 | `ic_qs_{uuid}` |
| `InitiateCheckout` | aceitar downsell (OfferPage) | 37 | `ic_qs_{uuid}` |
| `Purchase` | /obrigado (upsell view apenas) | URL param ou fallback 47 | transaction_id/tid da URL |
| ViewContent | **NAO EXISTE** | -- | -- |
| Lead | **NAO EXISTE** | -- | -- |
| AddToCart | **NAO EXISTE** | -- | -- |

---

## Veredicto Final

**Valores de preco:** CORRETOS. 47 principal, 67 upsell, 37 downsell.
**Purchase fallback:** CORRETO (47 se Kirvano nao mandar value).
**Purchase dedup:** CORRETO (sessionStorage + eventID por transaction).
**UTMs:** CORRETOS (captura, persiste, envia ao Kirvano e ao banco).
**Tracking session:** CORRETO (salva fbp/fbc/ua antes do redirect).

**Problemas reais:**
1. Lead duplicado no saveEmail (insert em vez de update)
2. Ausencia de ViewContent e Lead no pixel
3. Recusa de upsell/downsell sem tracking
