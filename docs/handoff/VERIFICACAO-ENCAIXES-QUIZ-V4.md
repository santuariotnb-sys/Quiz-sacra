# VERIFICAÇÃO DE ENCAIXES — Quiz Sacra V4 (pré-implementação)

> Verificador **somente-leitura**. Nada de código foi alterado. Alvo: portar o HTML `~/Downloads/quiz-sacra-v4-oferta-otimizada.html` para o app React `~/Quiz-sacra` (branch `feat/resultado-3-slides`), substituindo o quiz atual em `/sacra/quiz/`, **preservando 100% do tracking / checkout / persistência / WhatsApp**.
> Data: 2026-07-19. Repos analisados: `~/Quiz-sacra` (quiz) e `~/rotina-de-paz-app` (backend WhatsApp — **é o clone de produção**, NÃO `~/projects/rotina-de-paz-app`).

---

## RESUMO EXECUTIVO (leia antes de tudo)

O v4 **não é só um reskin de tela**: ele muda a **espinha da máquina de estados**. O quiz real tem 9 stages (`hero → acolhimento → questions → age → alert → loading → contact → result → offer`) e o v4 só desenha 4 (`quiz/analysis/result/offer`). A pergunta `situacao` (segmentação) e a `risco` (triagem de saúde mental) **somem** no v4. O tracking, o checkout, o `persist_lead`, o e-mail e o WhatsApp estão **todos amarrados por `key` de pergunta e por `stage`** — mexer na lista de perguntas ou de stages sem cuidado quebra o funil silenciosamente.

A boa notícia: as camadas de infra (`tracking.ts`, `utm.ts`, `prices.ts`, `whatsapp-enqueue.ts`, `computeArchetype`, screens `Result/Offer`) são **agnósticas ao layout** e reutilizáveis quase sem tocar. O trabalho é **substituir a camada de conteúdo/telas** mantendo as **mesmas chamadas** nos mesmos momentos.

---

## 1. QuizApp.tsx — máquina de estados e contratos
Arquivo: `src/components/quiz/QuizApp.tsx` (1884 linhas).

### 1.1 Máquina de stages (lista exata)
`QuizApp.tsx:55`
```
type Stage = "hero" | "acolhimento" | "questions" | "age" | "alert" | "loading" | "contact" | "result" | "offer";
```
Mapeamento render (`AnimatePresence`):
| Stage | Componente | Linha | v4 tem equivalente? |
|---|---|---|---|
| hero | `HeroScreen` (escolhe "dor") | 752 / def 863 | ❌ v4 começa direto na pergunta `peso` |
| acolhimento | `AcolhimentoScreen` (pede nome) | 764 | ❌ |
| questions | `QuestionScreen` | 774 | ✅ (screen-quiz) |
| age | `AgeScreen` | 789 | ❌ |
| alert | `AlertScreen` | 802 | ❌ |
| loading | `LoadingScreen` | 812 | ✅ (screen-analysis) |
| contact | `ContactGateScreen` | 816 / def 1393 | ⚠️ v4 NÃO desenhou, mas o prompt EXIGE (nome+WhatsApp) |
| result | `ResultScreen` | 831 | ✅ (screen-result) |
| offer | `OfferScreen` | 842 | ✅ (screen-offer) |

**Encaixe crítico:** os intercepts de stage estão **hardcoded por índice+key** dentro de `answer()`:
- `QuizApp.tsx:328` → após `idx===2 && key==="sintoma"` vai pra `age`.
- `QuizApp.tsx:336` → após `idx===4 && key==="frase"` vai pra `alert`.
- `QuizApp.tsx:322` → última pergunta (`idx===QUESTIONS.length-1`) vai pra `loading`.
Se o v4 reordena/renomeia perguntas, esses `idx`/`key` **deixam de casar** e as telas age/alert nunca disparam (ou disparam na hora errada). Decisão de projeto: **remover os intercepts age/alert** (o v4 não os usa) e manter só o `loading` na última pergunta.

### 1.2 Assinaturas das funções-chave
| Função | Linha | Assinatura / efeito |
|---|---|---|
| `answer(value)` | 290 | grava `answers[q.key]=value`, toca reação da guia, faz intercepts de stage, avança `qIndex`. **É aqui que a lista de perguntas é lida** (`QUESTIONS[idx]`). |
| `trackStep(stage, questionKey?)` | 208 | RPC `quiz_funnel_events` (via `push_funnel_event`?) com `p_stage`, `p_quiz_id`. Domain-guard localhost. Stages aceitos no CHECK do banco: `arrival/question/contact/result/offer/cta` (ver 442-444 — `contact_gate` dava 400). |
| `fireViewContent()` | 460 | pixel `ViewContent` + CAPI `track-event` (edge fn) com perfil (archetype/desire/situation). Disparado ao entrar em `offer` (452). |
| `persistLead(ans)` | 519 | RPC `persist_lead` → retorna `leadId`; grava `rdp_lead_id_<eid>`, `sacra_student`; chama `persist_quiz_responses` (uma linha por `QUESTIONS[].key`). |
| `ensureLeadStarted()` | 417 | roda `persistLead` 1× por sessão (cache por `external_id`), guarda em `leadPromiseRef`. Chamado ao entrar em `contact` (435) ou no fim do loading (406-408). |
| `submitContact()` | 580 | await `leadPromiseRef` → `save_lead_contact` (email/whatsapp) → **`enqueueWhatsappResult(leadId)` (613)** → `send-quiz-result` (618) → pixel+CAPI `Lead` (663/678) → `setStage("result")`. Sem contato: vai direto pro result (587). |
| `goToOffer()` | 576 | `setStage("offer")`. |
| `checkout()` | 705 | `sendTrackingBeacon` → `trackStep("cta")` → `trackInitiateCheckout` → redireciona pra Kirvano (`buildKirvanoUrl`) OU Checkout Sacra (`USE_CHECKOUT_SACRA`, 725). |

### 1.3 Persistência / retomada de sessão (chaves localStorage)
| Chave | Origem | Papel |
|---|---|---|
| `sacra_quiz_state_v3` (`SAVED_KEY`) | 86 | estado salvo (stage/qIndex/answers/name/whatsapp/email/savedAt), TTL 48h (87). Salvo em 262-272 (só `questions/contact/result/offer`; nunca hero/acolhimento/loading). |
| `sacra_quiz_reached_result` (`SESSION_RESULT_KEY`) | 90 | sessionStorage; distingue refresh de nova visita p/ decidir se restaura result/offer (119-128). |
| `rdp_lead_id_<external_id>` | 426/543 | cache do lead_id (evita duplicar lead por reload). |
| `sacra_student` | 546 | perfil p/ o App da Aluna (archetype/name/desire/situation/lead_id). |
| `rdp_external_id` | `tracking.ts:7` | external_id da sessão (eixo do funil). |
| `rdp:utm` | `utm.ts:6` | UTMs capturadas. |
| `rdp_meta_click` | `tracking.ts:46` | sessionStorage: fbclid/fbc/fbp. |

`loadSavedState()` (102-143): só restaura stages em `["questions","contact","result","offer"]` (120); se salvou em result/offer mas a aba é nova (`reachedResult===false`), rebaixa pra `contact` (127-128). **Encaixe:** manter o SET de stages restauráveis coerente com os stages novos (todos os 4 já existem).

### 1.4 Fluxo de risco (`risk_flag`)
- `answersHaveRisk(ans)` (`QuizApp.tsx:58-62`): varre `QUESTIONS`, marca true se a opção escolhida tem `risk:true`.
- Só a pergunta `risco` (`quiz.ts:42`, opções `sombrios`/`crise` com `risk:true`, linhas 62-63) ativa.
- Uso: **apenas** `p_risk_flag` em `persist_lead` (`QuizApp.tsx:530`). **NÃO há tela interstitial / redirect pra CVV** neste branch — é só um flag no banco.
- **v4 remove a pergunta `risco` inteira** → `p_risk_flag` vira sempre `false` e o sinal de triagem de saúde mental some. Ver Risco #2.

### 1.5 Preview / `?oferta=` / `?preview=`
- `parsePreview()` (64-82): `?preview=<arquetipo>&stage=<stage>` pula direto pro stage (dev). Também lê `situation/desire` da URL (80). Preview tem prioridade sobre estado salvo (151).
- `offerKey` (188-191): `?oferta=baixa27` → variante de preço passada a `fetchProductPrices` (196) e propagada ao checkout (735).
- **Encaixe:** preservar ambos. Se o v4 mudar nomes de stage/arquétipo, o `parsePreview` continua válido (arquétipos são os mesmos — ver §3).

---

## 2. Contratos de tela (props exatas)

### ResultScreen — `src/components/quiz/ResultScreen.tsx:95-105`
```ts
ResultScreen({ archetype, bridge?, name?, desire?, onContinue })
  archetype: ArchetypeData;  bridge?: string | null;  name?: string;
  desire?: string;           onContinue: () => void;
```
Chamada em `QuizApp.tsx:831-839` (`archetype={arche} bridge={bridge} desire onContinue={goToOffer}`). **Todo o conteúdo emocional do resultado vem de `ArchetypeData` (quiz.ts), não das props.** Já contém CAPI/pixel próprio (ResultScreen.tsx:223+).

### OfferScreen — `src/components/quiz/OfferScreen.tsx:815-833`
```ts
OfferScreen({ archetype, desire?, leadName?, priceCents, anchorCents, freeInstCount, onCheckout, onBack })
```
Chamada em `QuizApp.tsx:842-853`. `priceCents/anchorCents/freeInstCount` vêm do `fetchProductPrices`. `onCheckout={checkout}`.

### ContactGateScreen — `QuizApp.tsx:1393+`
Props: `name/setName, email/setEmail, whatsapp/setWhatsapp, onSubmit(submitContact), onSkip, sending`. **É a tela de captura nome+WhatsApp que o v4 precisa** — já existe e já está fiada ao WhatsApp. Reaproveitar, não reinventar.

### OfferPage / obrigado (pós-compra)
Não fazem parte do fluxo do `QuizApp` (checkout redireciona pra domínio externo Kirvano/Checkout-Sacra). **NÃO serão tocados** por esta migração. Confirmado: nenhuma referência de rota interna de "obrigado" no QuizApp.

> **Decisão-chave:** `ResultScreen` e `OfferScreen` REAIS já implementam o design "Neurofé/3 slides" do branch atual, com CAPI/pixel embutido. O v4 traz um design **diferente** de result/offer. É preciso decidir: (a) **manter as screens reais** e só trocar o CONTEÚDO (arquétipos/copy) — baixo risco, recomendado; ou (b) reescrever as screens no visual v4 — alto risco, replicar todo o tracking interno. **Recomendo (a).**

---

## 3. quiz.ts — as 7 perguntas e a substituição `situacao → peso`
Arquivo: `src/data/quiz.ts` (1093 linhas).

### 3.1 Estrutura real (keys EXATAS, ordem) — `quiz.ts:26-138`
| # | idx | key | meta | scores? | Papel |
|---|---|---|---|---|---|
| 1 | 0 | `situacao` | `situation` | ❌ (sem score) | segmentação (casada/mãe solo/solteira...) |
| 2 | 1 | `risco` | — | ❌ (risk flags) | triagem saúde mental |
| 3 | 2 | `sintoma` | — | ✅ | dispara intercept → `age` |
| 4 | 3 | `comportamento` | — | ✅ | |
| 5 | 4 | `frase` | — | ✅ (peso 4) | dispara intercept → `alert` |
| 6 | 5 | `espiritual` | — | ✅ | |
| 7 | 6 | `desejo` | `desire` | ❌ | usado em DESIRE_CTA/QUOTE/BEAT |

### 3.2 Arquétipos — `quiz.ts:5` e `ARCHETYPES` (264)
```
type Archetype = "vigilante" | "sobrecarga" | "culposa" | "antecipatoria";
```
✅ **Batem 100% com as keys do v4** (`profiles` em HTML:579-648: `sobrecarga/culposa/vigilante/antecipatoria`). Nenhuma renomeação de arquétipo necessária — só os **nomes emocionais de exibição** mudam (ex.: v4 "A Cuidadora em Plantão" vs. `ARCHETYPES.sobrecarga.name` atual), que vivem em `ArchetypeData` e podem ser editados sem tocar em lógica.

### 3.3 Scoring — `computeArchetype()` `quiz.ts:950-974`
Soma `opt.scores` de todas as perguntas; tie-break determinístico por prioridade `["vigilante","sobrecarga","culposa","antecipatoria"]` (969-972). **Agnóstico à ordem** — funciona com qualquer conjunto de perguntas que tenham `scores`. O v4 usa scoring diferente (+1 por resposta, +2 na Q4, secundário se 2º ≥ 1º−1: HTML:764/791) — **descartar o scoring do v4** e manter `computeArchetype`, apenas garantindo que a **nova Q1 `peso` tenha `scores` por opção** (a `situacao` atual não tem scores).

### 3.4 Dependências de `situacao` — cada ponto que quebra ao trocar por `peso`
| Ponto | Arquivo:linha | O que faz | Impacto de remover `situacao` | Adaptação mínima |
|---|---|---|---|---|
| Consistency check | `quiz.ts:990` | `noScoreKeys=Set(["situacao","desejo"])` | dev-warning se `peso` não tiver score | trocar `situacao`→`peso` OU dar score a `peso` e tirar do set |
| Q2 transitionFrom | `quiz.ts:44-58` | transição de `risco` mapeada por valor de `situacao` | some junto com `risco` (v4 não tem nenhuma) | remover o bloco |
| `bridge` | `QuizApp.tsx:281-283` | `arche.bridges[situation]` | `situation` undefined → `bridge=null` (fallback OK, `?? null`) | nenhuma (degrada suave); opcional recolorir por `peso` |
| ViewContent perfil | `QuizApp.tsx:473` | `profile.situation` no custom_data | perde dimensão de audiência (não quebra) | opcional: mandar `peso` |
| persist_lead | `QuizApp.tsx:529` | `p_situation: ans["situacao"]` | vira null (coluna aceita null) | mandar `ans["peso"]` como situation OU deixar null |
| sacra_student | `QuizApp.tsx:552` | grava `situation` p/ App da Aluna | null | idem |
| AlertScreen | `QuizApp.tsx:806, 1700-1702` | `ALERT_HEADLINES[situacao]` | tela `alert` é removida no v4 | some junto com o stage |
| EmotionalProgress | `EmotionalProgress.tsx:15` | pill "situacao" na barra | pill vazia | trocar por `peso` (tem `pill?`) |
| pillSituacao | `QuizApp.tsx:1268` | pill de resumo | idem | idem |
| WhatsApp copy | `whatsapp-copy.server.ts:27` | recebe `situation` mas **usa só `archetype`** | **NÃO quebra** | nenhuma |

**Conclusão §3:** a substituição é **de baixo risco SE** a nova `peso` (Q1) receber `scores` por opção e mantivermos `desejo` como Q final. `situacao` pode virar `peso` no `key` e nos ~7 pontos acima; o único ponto que "sente falta" real é o `p_situation`/segmentação de audiência (perde granularidade, não quebra funil).

---

## 4. tracking.ts / utm.ts / prices.ts — o que o v4 deve chamar e quando

| Função | Arquivo:linha | Quando o v4 deve chamar |
|---|---|---|
| `getOrCreateExternalId()` | `tracking.ts:14` | no mount (já é chamado dentro das outras); nunca regerar. |
| `captureMetaClickData()` | `tracking.ts:60` | 1× na entrada do quiz (mount). |
| `saveTrackingSession(eid)` | `tracking.ts:99` | no mount da tela inicial (`QuizApp.tsx:243`). |
| `sendTrackingBeacon(eid)` | `tracking.ts:154` | no início de `checkout()` antes do redirect (`QuizApp.tsx:709`). |
| `trackStep(stage, qKey?)` | `QuizApp.tsx:208` | `arrival` (248), `question` por pergunta (378), `contact/result/offer` (449), `cta` (710). **Stages permitidos: arrival/question/contact/result/offer/cta.** |
| `trackInitiateCheckout(eid, {value,contentName,em,ph})` | `tracking.ts:205` | dentro de `checkout()` (716), antes do redirect. |
| `trackVslEvent(event, opts)` | `tracking.ts:264` | nos eventos da VSL (impression/play/hook/progress/complete/cta_view/cta_click). **v4 tem VSL nativa `<video>` (HTML:443)** → fiar timeupdate→`trackVslEvent` (hoje quem chama é a OfferScreen; ver §6). |
| `buildKirvanoUrl(base,{archetype,name,email,whatsapp,externalId})` | `utm.ts:29` | dentro de `checkout()` (739). Passa UTMs + fbclid/fbc/fbp reais + `src=external_id`. |
| `fetchProductPrices(offerKey?)` | `prices.ts:25` | no mount, com `offerKey` do `?oferta=` (`QuizApp.tsx:196`). Fallback R$47/R$197 (prices.ts:19). |
| `fetchInstallmentFreeCount()` | `prices.ts:104` | mount (parcelas sem juros). |

**Regra de ouro:** o v4 **não deve inventar** nenhuma dessas chamadas — deve reusar as do `QuizApp` nos mesmos momentos. Todas têm **domain-guard** (`sacra.rotinadepaz.com.br`/`rotinadepaz.com.br`): fora do domínio, viram no-op (é o que faz o preview/localhost não sujar métricas).

---

## 5. WhatsApp resposta automática (CRÍTICO)

### Fila e delay
1. **Quiz** (`~/Quiz-sacra/src/lib/whatsapp-enqueue.ts`): `enqueueWhatsappResult(leadId)` faz `POST {VITE_APP_URL}/api/public/whatsapp/enqueue-result?k=<VITE_WHATSAPP_ENQUEUE_SECRET>`, body `{lead_id}`, `keepalive:true`, `content-type:text/plain` (evita preflight CORS). Fire-and-forget. Chamado em `QuizApp.tsx:613` (dentro de `submitContact`, só se `hasWhatsapp`).
2. **Endpoint** (`~/rotina-de-paz-app/src/routes/api/public/whatsapp/enqueue-result.ts`):
   - secret gate: `?k=` deve bater com **`WHATSAPP_ENDPOINT_SECRET`** (env do app) — ⚠️ nome **diferente** do lado quiz (`VITE_WHATSAPP_ENQUEUE_SECRET`); os **valores** têm de ser iguais.
   - valida lead: precisa existir, ter `whatsapp`, `is_test=false` (skip caso contrário).
   - grava em `whatsapp_sends` (upsert idempotente por `(lead_id, template)`), `status:"pending"`, `send_after = now()+35s`, `template = WHATSAPP_TEMPLATE_RESULT ?? "quiz_resultado"`. **NÃO envia aqui.**
3. **Cron** (`~/rotina-de-paz-app/src/routes/api/cron/whatsapp-dispatch.ts`): a cada minuto (pg_cron), pega `pending` com `send_after<=now`, gera variáveis e envia via WhatsApp Cloud API (`sendTemplate`). Protegido por `CRON_SECRET` (Bearer). Máx 15/run, 3 tentativas.

### Payload / delay / segredo / conteúdo
- **Payload necessário do quiz:** só `{ lead_id }`. O `lead_id` vem de `persistLead` (`QuizApp.tsx:524`), garantido por `await leadPromiseRef` em `submitContact` (595).
- **Delay:** ~**35s** (`enqueue-result.ts:9`), não 30s. É o `send_after`.
- **Segredo:** quiz `VITE_WHATSAPP_ENQUEUE_SECRET` (env Vite) == app `WHATSAPP_ENDPOINT_SECRET` (env Vercel).
- **O que envia:** template `quiz_resultado` com variáveis `{nome, frase_arquetipo}` (`whatsapp-copy.server.ts:5,23`). `generateResultVariables` usa **só `archetype`** para a frase (situation/desire são aceitos mas ignorados) → **remover `situacao` NÃO quebra o WhatsApp.** Colunas lidas de `leads`: `name, whatsapp, is_test, archetype, desire, situation` (dispatch:58).
- **Admin:** `whatsapp_sends` é lido no admin (`admin.crm.tsx`, `admin.leads.tsx`, `admin.analytics.tsx`, `admin.quiz.tsx`).

### Encaixe para o v4
O v4 precisa de tela de captura nome+WhatsApp → **é exatamente `ContactGateScreen` + `submitContact`**, que já existe e já dispara a fila. **Não criar endpoint novo.** Basta manter: (a) o stage `contact` no fluxo, (b) `persistLead` rodando antes (via `ensureLeadStarted`), (c) `submitContact` como `onSubmit`. O único requisito é que o **lead tenha `whatsapp` e `archetype`** gravados — ambos já saem do fluxo real.

---

## 6. HTML v4 — mapa seção→componente + inventário

### Estrutura (4 "screens" via classe `.screen.active`, HTML:75-76)
| Seção HTML | Linha | Componente React alvo | Observação |
|---|---|---|---|
| topbar "prévia navegável" + preview-tabs QUIZ/RESULTADO/OFERTA | 348-357 | **DESCARTAR** | é navegação de protótipo, não produção |
| `#screen-quiz` (progress + question-card) | 359-372 | `QuestionScreen` | Q1 vira card `.first-question` (peso) |
| pergunta `peso` (1ª, card destacado) | 366 + JS 650-660 | nova entrada em `QUESTIONS` key `peso` c/ `scores` | substitui `situacao` |
| micro-validação (mensagens entre perguntas) | JS 766-780 | já existe: `getGuideReaction`/`getTransition` (quiz.ts) | usar o mecanismo real, descartar textos do v4 ou portá-los pra quiz.ts |
| `#screen-analysis` (loader) | 373-387 | `LoadingScreen` | ✅ |
| `#screen-result` (nome, headline, diagnosis, evidence, absolution, áudio, promise) | 388-419 | `ResultScreen` (conteúdo via `ArchetypeData`) | copy do v4 → migrar para `ARCHETYPES` |
| áudio recomendado por arquétipo (Bunny mp3) | 409-413 + JS 587/604/621/638 | campo novo em `ArchetypeData` OU manter só se ResultScreen suportar player | URLs reais Bunny (ver assets) |
| `#screen-offer` intro + trust pills | 421-433 | `OfferScreen` | |
| VSL (2ª dobra, `<video>` Bunny) | 434-450 | `OfferScreen` + `trackVslEvent` | **fiar timeupdate→trackVslEvent** |
| mecanismo (4 cards) | 451-461 | OfferScreen | conteúdo |
| jornada 7 dias | 462-467 + JS 717-725 | OfferScreen | |
| prova do produto / app-preview | 468-483 | OfferScreen | **2 imagens base64 aqui** (480-481) |
| incluído / bônus | 484-500 | OfferScreen | |
| prova de identificação (depoimentos) | 501-506 | OfferScreen | ⚠️ ver contradições |
| autoria (Guilherme/Jaqueline) | 508-521 | OfferScreen | ⚠️ nota de transparência |
| por que começar agora | 522-531 | OfferScreen | sem timer falso (bom) |
| preço R$47 / parcelas / garantia | 532-551 | OfferScreen (**preço via `fetchProductPrices`, NÃO hardcode**) | ver contradição preço |
| FAQ | 552-567 | OfferScreen | |
| sticky-cta | 571-576 + JS 838-846 | OfferScreen (sticky já existe) | |

### Inventário de assets
- **VSL:** `https://cdnrotinadepaz.b-cdn.net/VSL-mecanismo-v2v3-EDITADA.mp4` (HTML:444) — bate com a memória `rotina-vsl-url`. `<video>` nativo, não VTurb/Panda.
- **Áudios por arquétipo (Bunny):** `/rotina-de-paz/aquietar/dia-5|2|6|1.mp3` (HTML:587/604/621/638).
- **Imagens base64:** 2 blobs (HTML:480 = 47.596 chars; 481 = 79.968 chars) na seção "prova do produto". Precisam ser hospedadas (Storage/Bunny) ou embutidas; decidir na implementação. Nenhuma outra imagem externa.
- **Fontes:** Google Fonts `Cormorant Garamond` + `Montserrat` (HTML:13). O app já tem `font-display` (Cormorant) via Tailwind — **não** puxar Google Fonts de novo (perf + o app usa fontes locais).

### Contradições do HTML que DEVEM ser descartadas
1. **Checkout simulado:** `document.querySelectorAll(".buy")... alert("Prévia HTML: conecte...")` (HTML:856-858). **Descartar** → usar `checkout()` real.
2. **Preview tabs / "prévia navegável"** (348-357): protótipo, descartar.
3. **Scoring próprio do v4** (764/789-791): descartar → `computeArchetype`.
4. **Preço/parcelas hardcoded** "R$47 / 10× de R$5,60" (541-543,573): **preço deve vir de `fetchProductPrices`** (prices.ts). Sem âncora "R$228" no v4 (bom — o `NEUROFE_OFFER.anchorCents=22800` de quiz.ts:1079 é do design atual; conferir com dono qual âncora vale).
5. **Depoimentos "Comentário público em anúncio"** (504): apresentados explicitamente como prova de **identificação, não de resultado**, com disclaimer — compliance-safe, mas **confirmar com o dono** se são reais.
6. **Nota Jaqueline "apresentadora visual da marca"** (520): já é uma nota de transparência; manter em produção com CNPJ/suporte visíveis.
7. **Áudio no resultado** (413): a `ResultScreen` real (Neurofé/3-slides) pode não ter player de áudio — decidir se adiciona ou descarta o bloco de áudio.

---

## 7. Os 10 maiores riscos + mitigação

| # | Risco | Gravidade | Mitigação concreta |
|---|---|---|---|
| 1 | Reordenar/renomear perguntas quebra os intercepts `idx===2/sintoma`→age e `idx===4/frase`→alert (`QuizApp.tsx:328,336`) | 🔴 Alta | Remover os dois intercepts (v4 não usa age/alert); manter só `loading` na última pergunta (322). |
| 2 | Remover a pergunta `risco` zera `p_risk_flag` → some a triagem de saúde mental | 🔴 Alta | Decisão explícita do dono. Se manter compliance, **preservar `risco` como pergunta** (mesmo que fora do design v4) OU documentar a remoção. Não é bloqueador técnico, é ético/legal. |
| 3 | `peso` (nova Q1) sem `scores` → `computeArchetype` não pontua a 1ª pergunta e o dev-check `noScoreKeys` avisa | 🟠 Média | Dar `scores` por opção na `peso` (o v4 já mapeia cada opção a 1 arquétipo — HTML:655-658) e ajustar `noScoreKeys` (quiz.ts:990). |
| 4 | Reescrever `ResultScreen`/`OfferScreen` no visual v4 perde o CAPI/pixel embutido (ResultScreen.tsx:223, fireViewContent) | 🔴 Alta | **Não reescrever as screens.** Trocar só o CONTEÚDO (`ARCHETYPES`, copy). Se o visual v4 for obrigatório, portar bloco a bloco mantendo TODAS as chamadas de tracking. |
| 5 | Preço hardcoded do HTML (R$47/10×) diverge do DB → oferta mostra preço errado | 🟠 Média | Ler sempre de `fetchProductPrices(offerKey)` (prices.ts:25); nunca hardcode. |
| 6 | `enqueueWhatsappResult` não dispara se o stage `contact` for pulado ou `whatsapp` inválido | 🟠 Média | Manter `ContactGateScreen`+`submitContact` (613) e a validação `digits.length>=10` (583). Garantir `persistLead` rodou antes (leadPromiseRef). |
| 7 | Segredo WhatsApp divergente: quiz `VITE_WHATSAPP_ENQUEUE_SECRET` ≠ app `WHATSAPP_ENDPOINT_SECRET` → 403 na fila | 🟠 Média | Confirmar que os valores das duas envs batem (Vercel quiz vs. Vercel app). |
| 8 | Perder chaves localStorage (`sacra_quiz_state_v3`, `rdp_lead_id_`, `rdp_external_id`) → duplica leads / regenera external_id / quebra retomada | 🟠 Média | Reusar `tracking.ts`/`loadSavedState` sem trocar nomes de chave. NÃO bumpar `_v3` sem motivo. |
| 9 | VSL nativa do v4 sem `trackVslEvent` → perde analytics de vídeo já existente | 🟡 Baixa | Fiar `timeupdate`/play/complete do `<video>` a `trackVslEvent` (tracking.ts:264), como a OfferScreen atual faz. |
| 10 | Imagens base64 (~127KB somadas) inline no bundle + Google Fonts duplicadas → peso/CLS no público 55+ iPhone | 🟡 Baixa | Hospedar imagens (Storage/Bunny) e usar `<img loading=lazy>`; reusar fontes locais do app, não puxar Google Fonts. |

### Riscos secundários (registrar)
- `trackStep` só aceita stages `arrival/question/contact/result/offer/cta` no CHECK do banco (QuizApp.tsx:442-444) — não inventar nomes novos de stage no tracking.
- Domain-guard: todo tracking é no-op fora de `sacra.rotinadepaz.com.br`/`rotinadepaz.com.br` — testar em produção real, não em preview (bate com a "disciplina de teste" do repo).
- `bridge` vira null sem `situacao` — ResultScreen/e-mail já tratam null; ok.

---

## PRONTO PARA IMPLEMENTAR: **sim, com condições**

Condições (todas verificáveis antes/durante):
1. **Decisão do dono sobre a pergunta `risco`** (manter por compliance vs. remover) — Risco #2.
2. **Manter as screens reais `ResultScreen`/`OfferScreen`** e migrar só conteúdo (`ARCHETYPES`, copy do v4), OU aceitar reescrita com replicação integral do tracking — Risco #4.
3. **Nova Q1 `peso` com `scores` por opção**; `desejo` continua como Q final; ajustar `noScoreKeys`/`transitionFrom`/pills — §3.4.
4. **Remover intercepts age/alert**; manter loading na última pergunta — Risco #1.
5. **Preço sempre via `fetchProductPrices`**, nunca hardcode; descartar checkout simulado (`alert`) e preview-tabs do HTML — §6.
6. **Reusar** `ContactGateScreen`+`submitContact`+`enqueueWhatsappResult` (fila WhatsApp intacta, delay 35s, segredo alinhado) — §5.
7. **Preservar** todas as chaves localStorage e todas as chamadas de `tracking.ts`/`utm.ts` nos mesmos momentos; hospedar as 2 imagens base64; reusar fontes locais.

Sem essas condições o funil (lead → WhatsApp → checkout → CAPI) quebra silenciosamente. Com elas, a migração é segura.
