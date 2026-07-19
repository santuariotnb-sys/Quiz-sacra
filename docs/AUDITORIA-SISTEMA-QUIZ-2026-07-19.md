# Auditoria completa — Quiz Sacra (código + produção) · 2026-07-19

> Objetivo: base de verdade para **substituir o quiz mantendo o mesmo link** (`rotinadepaz.com.br/sacra/quiz/`),
> mesmos anúncios, mesmo esquema de tracking/eventos e admin no app Vercel (`rotina-de-paz-app`).
> Tudo abaixo foi **verificado na fonte**: git local, GitHub, bundle servido em produção, banco vivo (requests reais) e Meta (dataset stats do pixel).

---

## 1. Estado código × GitHub × produção (VERIFICADO — com surpresas)

### O que está no ar
- Produção serve o build de **16/jul 20:13** do **worktree local** da branch `feat/resultado-3-slides` (`~/Quiz-sacra`).
  Prova: hashes idênticos entre `dist/` local e o site vivo — `QuizApp-Nlypu1n4.js`, `index-CFdgLnJc.js`, `check-BTCrakBZ.js`.
- Rotas vivas (todas 200, mesmo bundle): `/sacra/quiz/`, `/sacra/resultado/`, `/sacra/obrigado/`.
- Hero no ar = "4 padrões de esgotamento" com 3 botões de dor (commits da feat branch).

### ⚠️ Divergências git (corrigir ANTES de mexer no quiz novo)
| Item | Estado | Risco |
|---|---|---|
| `src/routes/resultado.tsx` | **UNTRACKED** — mas está EM PRODUÇÃO (`resultado-Df1heOQy.js` no ar) | Produção contém código que não existe no git. Um `git clean`/clone novo perde a rota `/sacra/resultado` (link enviado por WhatsApp). |
| `deploy-quiz.sh` | Modificado sem commit (adiciona subrota física `resultado/`) | Deploy de outro clone quebra `/sacra/resultado` |
| `src/routeTree.gen.ts` | Modificado sem commit (registra a rota) | idem |
| Commit `bfeedf5` (ViewContent pixel+CAPI) | Local, **não pushado** (`ahead 1` de `origin/feat/resultado-3-slides`) | GitHub desatualizado vs produção |
| `origin/main` (`e442c32`) | **~30 commits ATRÁS** do que roda em produção | Quem clonar `main` do GitHub NÃO obtém o quiz atual |
| `main` local | 3 commits atrás de `origin/main` | ruído |

**Ação recomendada:** commitar `resultado.tsx` + `deploy-quiz.sh` + `routeTree.gen.ts`, pushar `bfeedf5`, e fazer merge de `feat/resultado-3-slides` → `main` (é o que está provado em produção). Só então começar o quiz novo em branch a partir daí.

### Estrutura Cloudflare (deploy)
- Host: **Cloudflare Pages**, projeto `rotina-de-paz`, domínio `rotinadepaz.com.br`.
- **Script canônico do quiz: `~/Quiz-sacra/deploy-quiz.sh`** — builda Quiz-sacra **e** o site `~/rotina-de-paz`, copia `Quiz-sacra/dist` → `rotina-de-paz/dist/sacra/`, remove `sacra/sacra` (artefato do `base:"/sacra/"`), cria subrotas físicas (`quiz/`, `obrigado/`, `resultado/` — CF Pages não faz fallback SPA nested), reescreve `_redirects` e publica `rotina-de-paz/dist` inteiro via `wrangler pages deploy --branch=main`. Deployar só o quiz isolado = incidente de tela branca (já aconteceu).
- **`~/rotina-de-paz/deploy.sh` + `apps.manifest`** (pipeline unificado) coexistem. ⚠️ **O manifesto está desatualizado**: linha do sacra lista subrotas `quiz,obrigado` — **falta `resultado`**. Se alguém deployar via `./deploy.sh`, refresh/deep-link em `/sacra/resultado` quebra. Corrigir a linha para `quiz,obrigado,resultado`.
- `_redirects` raiz atual: `/sacra/* → /sacra/index.html 200` antes do catch-all `/* → /index.html 200`. Redirects internos do sacra: `/` e `/sacra` → 302 `/sacra/quiz/`.
- Vite `base: "/sacra/"` (validado pelo deploy-quiz.sh, aborta se ausente). Build target `es2019/safari12` (compat aparelhos antigos — não regredir no quiz novo). Manual chunks: `vendor-react`, `vendor-motion`, `vendor-supabase`.

---

## 2. Produção viva — o que carrega e o que dispara (VERIFICADO no browser + Meta)

- **Pixel Meta único: `863734499693171`** (PRIMORDIA/SACRA-ROSE) — init no `index.html` com **domain guard** (só `rotinadepaz.com.br` / `sacra.rotinadepaz.com.br`; dev/preview não dispara).
- Scripts adicionais no ar: **Microsoft Clarity** (`x3jgnsdkx5`), **UTMify** (`cdn.utmify.com.br`), Cloudflare Insights.
- Banco vivo: quiz chama `upsert_tracking_session` e `track_quiz_step` no `cemjibbauvvyfaxilrvm` já no load; preços vêm de `products` + `product_offers` + `checkout_config` (4 produtos: main/upsell/downsell).
- `localStorage`: `rdp_external_id = qs_<uuid>` (confirmado ao vivo).
- **Meta recebendo (últimos 7 dias, dataset stats do pixel 863):** `PageView`, `QuizStep`, `ResultSlide`, `Lead`, `ViewContent`, `InitiateCheckout`, `VSLReady/Start/Progress/Unmute/Complete` e **1 Purchase (15/jul)**. Tráfego caiu forte após 16/jul ~17h (campanhas pausadas).

---

## 3. Esquema de tracking (o "mesmo raciocínio" a replicar no quiz novo)

### Pixel + eventos client-side (todos com domain guard)
| Evento | Onde dispara | Dedup / matching |
|---|---|---|
| `PageView` | load (`index.html`) | — |
| `QuizStep` (custom) | cada pergunta exibida (`QuizApp.tsx:369`) | `{step, total, question}` |
| `ResultSlide` (custom) | cada slide do resultado (`ResultScreen.tsx:224`) | `{slide, label, archetype}` |
| `Lead` (trackSingle) | captura de contato (`QuizApp.tsx:663`) | **eventID `lead_<eid>`** + re-init com `{em, ph, external_id}` |
| `ViewContent` (trackSingle) | entrada na oferta (`QuizApp.tsx:481`) | **eventID `vc_<eid>`** + `{em, ph, external_id}`; payload com archetype/desire/value |
| `VSL*` (custom) | mini-VSL da oferta (`OfferScreen.tsx`) | também empurra `dataLayer` |
| `InitiateCheckout` | clique no CTA checkout (`tracking.ts:251`) | **eventID `ic_<eid>_<scope>`** (scope separa principal/upsell/downsell), `content_ids:["rotina-de-paz"]` |

### CAPI (server-side)
- Cliente → Edge Function **`track-event`** (projeto `~/rotina-de-paz`) → grava `tracking_events` (dedup por `event_id`) → **`capi-relay`** → Graph API `v20.0`.
- `Lead` e `ViewContent` têm espelho CAPI client-disparado com o **mesmo `event_id`** do pixel (dedup perfeito). `InitiateCheckout` é só pixel. `Purchase`/`AddPaymentInfo` são server-side via webhook Kirvano (app Vercel, Graph `v22.0`).
- Token/pixel do CAPI ficam em **env do Supabase** (`META_PIXEL_ID`+`META_CAPI_TOKEN`, 2º pixel opcional via `META_PIXEL_ID_2`). Hash SHA-256 no server (`em/ph/fn/ln/ct/st/zp/country`); `external_id` do Purchase vai **cru** (casa com o pixel) + `sha256(CPF)`.

### Identidade / atribuição
- **`external_id` = `qs_<uuid>`** gerado em `getOrCreateExternalId` (`tracking.ts:14-24`), persistido em `localStorage` (`rdp_external_id`, namespaceado por quiz).
- Propagado ao checkout como **`?src=`** → Kirvano devolve em `utm.src` no webhook → `purchases.src`.
- Cadeia: `leads.external_id == purchases.src == tracking_sessions.external_id`. Joins do admin são SEMPRE por essa chave (nunca email).

### Envs de build do quiz (`VITE_*`)
`VITE_QUIZ_ID` (default `sacra`) · `VITE_PIXEL_ID` (default `863734499693171`) · `VITE_EXTERNAL_ID_PREFIX` (default `qs_`) · `VITE_SUPABASE_URL/ANON_KEY` · `VITE_KIRVANO_URL` + `_UPSELL_URL` + `_DOWNSELL_URL` · `VITE_APP_URL` (app Vercel) · `VITE_WHATSAPP_ENQUEUE_SECRET` · `VITE_USE_CHECKOUT_SACRA` (flag) + `VITE_CHECKOUT_SACRA_URL`.

### Fluxo de telas (máquina de estados em `QuizApp.tsx`)
`hero → acolhimento → questions (7) → [age após P3] → [alert após P5] → loading → contact → result (3 slides) → offer (mini-VSL) → checkout redirect (Kirvano com utm_* + fbclid/fbc/fbp + arquetipo/nome/email/whatsapp + src)`.
Side-effects: `send-quiz-result` (email via Resend) + `enqueue-result` WhatsApp (`POST {VITE_APP_URL}/api/public/whatsapp/enqueue-result?k=<secret>`).

---

## 4. Contrato backend/admin que o quiz novo DEVE cumprir (senão o admin quebra)

### RPCs (escrita — assinaturas são o contrato)
1. `persist_lead(p_name, p_archetype, p_scores jsonb, p_desire, p_situation, p_risk_flag, p_utm_*×5, p_fbclid, p_gclid, p_external_id, p_quiz_id default 'sacra') → uuid` — guardar o uuid para o passo 2.
2. `persist_quiz_responses(p_rows jsonb, p_quiz_id)` — rows com `lead_id, question_key, answer_value, answer_text, time_to_answer`.
3. `save_lead_contact(p_lead_id, p_email, p_whatsapp "55…", p_consent_timestamp)`.
4. `track_quiz_step(p_session_id=external_id, p_stage, p_question_key, p_version, p_quiz_id)`.
5. `upsert_tracking_session(p_external_id, p_fbp, p_fbc, p_fbclid, p_user_agent, p_client_ip)` — é daqui que o CAPI Purchase recupera fbp/fbc/ip/ua.
6. `track_vsl_event(...)` — grava `vsl_events` (⚠️ consumida só por analytics próprios; o admin do app Vercel ainda não tem tela de VSL).

### Pontos de ruptura duros (hard-coded no admin + RPCs SQL)
- **`question_key` EXATOS:** `situacao, risco, sintoma, comportamento, frase, espiritual, desejo` (7). Hard-coded em `admin.quiz.tsx:38-56`, `analytics_quiz_funnel` e `analytics_full_funnel` (usa `situacao`/`desejo` como Q1/Q7). Mudou nome → etapa some do funil.
- **`stage` allowlist:** RPC (migration `20260709`) aceita `arrival/hero_intent/question/contact/contact_gate/result/offer/cta`; **porém** o CHECK da tabela em PROD foi confirmado (02/jul, ao vivo) só com `arrival/question/contact/result/offer/cta`. ⚠️ **Verificar no banco vivo antes do quiz novo** — usar stages fora do CHECK = insert falha/descartado silenciosamente (`contact_gate` já deu erro 23514 no passado).
- **"Quiz completo" = lead com ≥ 7 respostas** (`admin.quiz.tsx:151-153`). Menos de 7 perguntas → completion rate quebra.
- **Registrar o quiz em `quizzes`** (`id` slug, `nome`, `pixel_id`, `external_id_prefix`, `base_path`) se usar `quiz_id` novo — senão FK falha. Se for substituição do mesmo funil, **manter `quiz_id='sacra'`** preserva histórico e o seletor de workspace do admin.
- `session_id` compartilhado quiz↔checkout é pré-requisito do funil ponta-a-ponta.

### Views/RPCs que o admin lê
`leads_reais` (is_test=false + pós-floor), `vendas_reais` (purchases confirmed, is_test=false), `receita_real()`, `analytics_full_funnel(p_days, p_quiz_id)`, `analytics_funnel/cohort/top_segments/revenue_breakdown` — todos joinando `l.external_id = p.src`.

### CAPI Purchase (app Vercel, branch atual `feat/emq-purchase-capi`)
- `event_id = transaction_id` (dedup), pixel/token via env Vercel (`META_PIXEL_ID`/`META_CAPI_TOKEN`), `META_CAPI_TEST_CODE` vazio em prod.
- EMQ novo no branch: `ct/st/zp/country` (normalização NFD + strip, "São Paulo"→`saopaulo`) + `sha256(CPF)` no `external_id[]`, junto do `qs_*` cru.
- Gate de QA: email na denylist `checkout_config.test_emails` → `purchases.is_test=true` + `capi_status='skipped_test'` (nunca reenviado pelo cron).

---

## 5. Pendências abertas (confirmadas no código atual)

1. **#4** — `analytics_full_funnel`: ramo checkout (`checkout.checkout_funnel_events`) **não filtra is_test** (coluna não existe lá). TODO(dono) explícito nas migrations.
2. **#5** — dedup de `purchases` falha se `transaction_id` null (`kirvano.server.ts:390-412`, NULL nunca conflita) — retry de webhook sem txid duplicaria venda. Latente.
3. `admin.quiz.tsx:87-94` lê `quiz_responses` cru **sem filtro is_test** → KPIs incluem teste.
4. **`docs/sql-staging/` (F2–F5) NÃO aplicados** no banco: F2 dedup `leads_reais` por external_id, F3 relógio BRT, F4 join CRM, F5 overlay Meta.
5. `apps.manifest` sem a subrota `resultado` (ver §1).
6. Estado git de produção não versionado (ver §1) — **maior risco da substituição**.

---

## 6. Checklist para subir o quiz NOVO no mesmo link

1. **Congelar o atual**: commit + push de `resultado.tsx`/`deploy-quiz.sh`/`routeTree.gen.ts`, push `bfeedf5`, merge `feat/resultado-3-slides` → `main` (produção provada). Tag `prod-2026-07-16`.
2. Branch nova a partir daí; desenvolver o quiz novo **dentro do mesmo repo/estrutura** (base `/sacra/`, mesmas envs `VITE_*`).
3. Replicar o esquema §3 (pixel 863 + domain guard, external_id `qs_`, eventos com eventID de dedup, CAPI via `track-event`) e o contrato §4 (RPCs, question_keys, stages, ≥7 perguntas).
4. Antes do go-live: verificar CHECK de `stage` no banco vivo; atualizar `apps.manifest` (`quiz,obrigado,resultado` + novas rotas); testar deploy em `--branch=preview`.
5. Go-live com `deploy-quiz.sh` (ou `deploy.sh --prod` com manifesto corrigido); validar no ar: bundle novo, pixel 863 disparando, `track_quiz_step` gravando, Events Manager recebendo.
6. QA sem poluir: usar email da denylist `test_emails` p/ compras de teste; lembrar que pixel client dispara mesmo em QA (domain guard não distingue).

---

*Nota: esta auditoria gerou 1 sessão de tracking de teste no banco prod (`qs_59b25ba8-…`, stage arrival, 19/jul) — visita de verificação via browser.*
