# PROMPT DE AUDITORIA + FIX — Quiz Sacra + Site Rotina de Paz

> Cole isto como primeira mensagem numa sessão NOVA (contexto limpo). É autossuficiente.
> Objetivo: **garantir que o funil funcione PERFEITAMENTE** — auditar, **corrigir responsividade**
> e blindar o **tracking** de ponta-a-ponta, após a migração das telas de resultado + oferta.
> Escopo: o quiz (`~/Quiz-sacra`) **e** o site raiz (`~/rotina-de-paz`, LP + checkout). Gerado 2026-07-03.

---

## PAPEL E MANDATO
Você é um **dev sênior / SRE**. Duas entregas:
1. **AUDITAR** (cético, com evidência — código, build, network, DB, Lighthouse, Meta Events). Nada de "parece OK": **prove**.
2. **CORRIGIR** o que quebra a experiência: **responsividade / layout em todos os aparelhos** e **bugs funcionais** da página. Aplique os fixes (com verificação antes/depois), não só reporte.

**Prioridade nº 1 = TRACKING** (o funil roda com tráfego pago; atribuição quebrada = dinheiro perdido silencioso). **Prioridade nº 2 = a página funcionar 100% em Android e iOS** (responsividade). Reporte achados priorizados por impacto em receita e risco; para cada um: `arquivo:linha`, evidência, correção mínima.

⚠️ **Fixes livres:** responsividade, layout, CSS, overflow, safe-area, quebras visuais, `prefers-reduced-motion`, cleanup de React. **Fixes GATED (só com confirmação explícita do dono):** qualquer coisa que toque pixel/`external_id`/`content_name`/CAPI/redirect de checkout/DDL do banco — reporte e proponha, mas **não altere sem OK**.

---

## CONTEXTO — o que foi feito (para você auditar)
Migração das telas **resultado → oferta** do quiz para um design hi-fi ("Neurofé"), **no lugar** (React in-place), **sem página nova**, preservando o tracking. Já está **em PRODUÇÃO**.

- **Commit:** `86f703e` na branch `feat/resultado-oferta-neurofe` (local, ainda não pushed).
- **Deploy de produção mais recente:** Cloudflare Pages `335e8605` → `https://rotinadepaz.com.br/sacra/`.
- **Design fonte:** `~/Downloads/design_handoff_rotina_de_paz/` (2 `.dc.html` + `arquetipos.js`).

### Arquivos mexidos na migração (o diff a auditar)
| Arquivo | Mudança |
|---|---|
| `src/components/quiz/ResultScreen.tsx` | **Reescrito** — Tela A, motor de "stories" de 5 cenas (Revelação/Verdade/Mecanismo/Imagine/CTA). Canvas de partículas (rAF), transições WAAPI, palavra-a-palavra, Ken Burns, barra de stories, nav teclado. Props: `archetype, bridge?, name?, desire?, onContinue`. |
| `src/components/quiz/OfferScreen.tsx` | **Novo** — Tela B (Como Funciona/Oferta). Scroll + IntersectionObserver (`Reveal`), VSL `<video>` nativo, método, carrossel de volumes, oferta, escassez UI, garantia. Props: `archetype, desire, priceCents, anchorCents, freeInstCount, onCheckout, onBack`. |
| `src/components/quiz/QuizApp.tsx` | Import de `OfferScreen`; **removidos** `OfferScreen`/`NarrationCaption`/`SectionTitle` inline (código morto) + imports órfãos. Call-site render: `stage==="result"` (~584), `stage==="offer"` (~595). Pontos de tracking do PAI: `goToOffer` (~406), `checkout()` (~509-530), `useEffect` de stage (~344-351), `parsePreview` (53-70), `loadSavedState` (74-118). |
| `src/data/quiz.ts` | **Fase 0** — tipos+dados `neurofe.*` nos 4 arquétipos (~180-707), `DESIRE_CTA` (709), `DESIRE_QUOTE` (717), `NEUROFE_OFFER` (~923). |
| `src/styles.css` | `@import` do Google Fonts + **Montserrat**; keyframes `sa-*` (kenburns/breathe/shine/ctaGlow/ringSpin/btnPulse/pinkGlow/vagaBlink). Tailwind v4 (`@import "tailwindcss"` + `@theme`). |
| `src/assets/*.webp` | 8 novos assets convertidos p/ webp (−93%): luz-dourada, descanso, jaqueline, jaqueline-app, bonus-louvores, vol1-despertar, vol2-repouso, logo. |

### Fora do escopo desta migração (não confundir; audite mas não misture no diff)
Hero, as 7 perguntas, loading, captura (ContactGate), `computeArchetype`, `persistLead`/`submitContact`, libs de tracking — **não foram tocados** nesta migração.

---

## REPOSITÓRIOS / TOPOLOGIA (AMBOS no escopo)
- **A) Quiz:** `~/Quiz-sacra` (Vite + React 19 + TS, `base:"/sacra/"`). Roda em `rotinadepaz.com.br/sacra/`.
- **B) Site raiz (LP + checkout):** `~/rotina-de-paz` (Vite; build `tsc -b && vite build && node scripts/post-build.cjs`). Roda em `rotinadepaz.com.br/`. Contém Home, **Checkout (Pagar.me tokenize)**, **Upsell/Downsell (one-click)**, ThankYou, páginas de produto/termos/privacidade, e gera `quiz.html`/`vsl.html`. Tem tracking próprio (`rdp-tracking.js` / script `t.js`, `usePixel`, CAPI de Purchase).
- **Deploy (único p/ os dois):** `~/rotina-de-paz/deploy.sh` lê `apps.manifest`, builda cada app, monta `dist/` combinado, `wrangler pages deploy` (projeto CF `rotina-de-paz`, branch `main`=prod). `--prod` pede confirmação; `--dry-run`/`--check` validam sem subir. Rollback = 1 clique no dashboard CF.
- **DB de produção (compartilhado):** Supabase `cemjibbauvvyfaxilrvm`. ⚠️ **NÃO** rodar `db push` (migrations fora-de-banda; repo em drift). DDL só via Management API (`/database/query`, token `sbp_`) e só com OK.
- ⚠️ **Drift repo↔prod:** prod já aceita `contact_gate`+`p_version` (fora-de-banda). Confirme o schema REAL em prod antes de concluir algo do banco.

---

## O QUE AUDITAR + CORRIGIR (checklist)

### 1) Página funciona perfeitamente (critério de aceite)
- Percorra o funil INTEIRO ponta-a-ponta nos dois apps: LP (`/`) → checkout → upsell/downsell → thankyou; e quiz (`/sacra/`) hero → 7 perguntas → captura → **resultado (Tela A)** → **oferta (Tela B)** → redirect de checkout.
- Zero erro no console, zero request 4xx/5xx inesperado, zero layout quebrado, zero botão morto.
- Matriz das telas novas: `?preview=<vigilante|sobrecarga|culposa|antecipatoria>&stage=<result|offer>&desire=<dormir|descansar|orar|parar-pior>`. ⚠️ `parsePreview` (`QuizApp.tsx:53`) + `if (preview) return` (`:345`) **suprimem o tracking de stage** — preview é só visual.

### 2) Responsividade — CORRIGIR (foco), Android + iOS, todos os tamanhos
- **iOS Safari:** `100dvh`/`svh` (evitar `100vh` que corta com a barra), `env(safe-area-inset-*)` (notch/home indicator), resize da barra de endereço, momentum scroll, `-webkit-tap-highlight`, `maximum-scale`/zoom em inputs (≥16px), `<video playsInline>`.
- **Android:** Chrome, **Samsung Internet**, WebView; `devicePixelRatio` alto; low-end (throttle); **landscape**; fallback de fontes.
- Larguras: 320 (SE antigo) → 768 (tablet). Sem **overflow horizontal**; CTAs fixos não colidindo (`z-index` sticky resultado vs CTA fixo oferta); scrim atrás dos botões; carrossel de volumes (scroll-snap) e barra de stories corretos em toque.
- **Aplique os fixes** e verifique com viewport real/emulado (ideal: BrowserStack ou device físico) — não confie só no devtools.

### 3) TRACKING (prioridade nº 1 — money-critical) — auditar ponta-a-ponta
Mapa: **~21 eventos**; 19 disparam FORA das telas trocadas. Cobre os DOIS apps:
- **Pixel** `863734499693171` (SACRA-ROSE/BM PRIMORDIA) init no `index.html` do quiz **atrás do gate de hostname** (`rotinadepaz.com.br`/`sacra.rotinadepaz.com.br`) — gate replicado em `index.html` + `QuizApp` + `tracking.ts`. Confirmar consistência. **No site raiz:** confirmar o pixel/`VITE_PIXEL_ID` — ⚠️ o build do site avisou "**`.env.production` ausente → pixel EMPTY**": verificar se a LP está subindo SEM pixel (quebra de tracking crítica).
- **external_id** `getOrCreateExternalId()` (`qs_<uuid>`, localStorage `rdp_external_id`) — estável do Lead → InitiateCheckout → **redirect (`?src=`) → checkout na LP → Purchase (CAPI)**. Confirmar continuidade mesma-origem entre quiz e checkout.
- **Funil server:** `track_quiz_step` RPC → `quiz_funnel_events` (⚠️ **CHECK** em `stage`; `vsl_*` é rejeitado — confirmar valores aceitos em PROD) → `analytics_full_funnel` (admin).
- **`checkout()`** (`QuizApp.tsx:509`): `sendTrackingBeacon` → `trackStep("cta")` → `trackInitiateCheckout({contentName:"Rotina de Paz", value: mainPriceCents/100})` → redirect decorado. **Sem** Pixel de `Purchase` no cliente (Purchase = 100% CAPI server, `event_id=sale_id`).
- **VSLProgress** (novo, `OfferScreen`): `fbq('trackCustom','VSLProgress',{percent})` marcos 25/50/75/100, 1×/marco (`Set`), atrás do gate. Confirmar disparo **ao vivo** (Meta Test Events) e que NÃO chama `track_quiz_step("vsl_*")`.
- **Preço data-driven:** `priceCents` do DB (`fetchProductPrices(offerKey)`, default 4700) = `value` do IC; nunca hardcode. Tela B deve exibir o mesmo preço que vai pro IC/Purchase.
- **Purchase / checkout (site raiz):** Pagar.me tokenize → venda → **CAPI Purchase** (`event_id=sale_id`), webhook, `purchases.lead_id` via `src`, lookup `fbp/fbc/ip` em `tracking_sessions` (histórico de `client_ip=null`). Upsell/Downsell one-click (⚠️ token uso-único — bug histórico #6).
- **Dedup Meta:** `eventID` de Lead (`lead_<eid>`) e IC (`ic_<eid>_rotina_de_paz`, deriva do `content_name`); risco de dupla contagem client×CAPI.
- **Validação AO VIVO obrigatória:** passada real (não preview) → **Meta Test Events** + funil do admin + venda de teste. Sem observar o evento real, "tracking OK" é só teoria.
- **Terceiros:** Clarity (`x3jgnsdkx5`), UTMify (`cdn.utmify.com.br`) — overhead e captura de UTMs; falha não pode quebrar o funil.

### 4) Endpoints
- **Supabase RPCs:** `track_quiz_step`, `persist_lead`/`persist_quiz_responses`, `save_lead_contact`, `analytics_full_funnel`, `fetchProductPrices`, `fetchInstallmentFreeCount` — existência, contrato, RLS, latência, erros silenciosos (fire-and-forget nunca bloqueia o quiz).
- **Edge functions:** `send-quiz-result` (quiz) + funções do checkout/webhook Pagar.me (site) — status, timeout, retries, idempotência.
- **CAPI server** (Lead/InitiateCheckout/Purchase) — endpoint, `client_ip`, `fbp`/`fbc`.
- **Checkout redirect** (destino real, `?src=external_id`+utms) e **gateway Pagar.me** (tokenize, 3DS?).
- **CDN da VSL** (BunnyCDN `cdnrotinadepaz.b-cdn.net/...mp4`) — CORS, range requests, disponibilidade.
- **Externos:** `connect.facebook.net/fbevents.js`, `clarity.ms`, `cdn.utmify.com.br`, Pagar.me — falhas não podem quebrar o funil.

### 5) Dependências
- `npm audit` (ambos os repos), desatualizados/duplicados, tamanho no bundle. **`framer-motion`** ainda importado no quiz? (Tela A migrou p/ WAAPI). Imports mortos. `tsc --noEmit` verde nos dois. Versões: Vite 7, React 19, TS. Quiz **sem** ESLint/Biome configurado (recomendar).

### 6) Estrutura / arquitetura
- Componentização: `ResultScreen`/`OfferScreen` grandes (JSX inline) — avaliar extração de cenas/blocos (smell "Large File"). Dados (`quiz.ts`) vs view. Palette hex inline (fidelidade 1:1) documentada. Código morto após remover `NarrationCaption` (`@/data/narration`, `narracao.mp3`).

### 7) Velocidade (Core Web Vitals)
- **Lighthouse mobile** em `/` e `/sacra/`: LCP, CLS, INP, TBT.
- **Fontes:** `@import` do Google Fonts é **render-blocking** (warning de ordenação no build). Avaliar `preconnect`+`<link>`/self-host/`font-display: swap`.
- **Canvas de partículas** (`ResultScreen`, 46×`dpr`, rAF sempre ligado): bateria/jank em low-end; **não pausa** em `visibilitychange` nem respeita `prefers-reduced-motion`.
- **VSL** `<video preload="metadata">`: peso do MP4, poster, autoplay iOS, dados.
- Bundle: `QuizApp` ~101KB (gzip ~31KB); chunk `check-*.js` (341KB) do site.

### 8) React (correção de hooks)
- **Cleanup:** rAF do canvas, listeners `keydown`/`resize`, `IntersectionObserver`, WAAPI, `setTimeout` da transição — limpos no unmount? Vazamento entre stages (AnimatePresence)?
- Deps de `useEffect`/`useCallback` (`go` depende de `cur`; listener de teclado re-vincula). Re-render/`useMemo`/`key`.

---

## ITENS DE DEV SÊNIOR (arquitetura a garantir)
9. **Acessibilidade — `prefers-reduced-motion`:** ⚠️ **NÃO tratado** no motor de stories/partículas/WAAPI — provável achado **alto** (afeta usuários iOS/Android com "reduzir movimento"; pode causar mal-estar). Gestão de foco entre cenas, `aria-label`/roles, ordem de leitura, contraste (dourado sobre creme), foco visível, nav por teclado sem "trap". **Corrigir o reduced-motion** (fallback estático/sem partículas).
10. **Segurança:** **CSP/headers** no Cloudflare Pages; **RLS** nas tabelas de leads/vendas (banco compartilhado) + escopo da **anon key** do Supabase; `dangerouslySetInnerHTML` (`verdadeCorpo`/`proximoPasso`/`truthBody` — hoje estático, confirmar); exposição de `VITE_*` (nada sensível); segurança do **checkout Pagar.me** (tokenize client-side, sem chave secreta no bundle).
11. **Resiliência / erros:** `QuizErrorBoundary` cobre as telas novas? Unhandled rejections em RPC/CAPI? Falha de rede em `<video>`/imagens/fontes degrada com elegância? Checkout resiliente a timeout do gateway?
12. **Persistência de sessão:** `sacra_quiz_state_v3` (TTL 48h) — quota cheia, **modo privado do Safari (lança exceção)**, restauração no stage certo, colisão de `key`.
13. **Observabilidade:** sem error tracking (Sentry?), source maps em prod, logs de CAPI, **alertas de queda de conversão/venda**.
14. **Testes:** repos **sem testes**. Recomendar: teste de fiação de tracking (onContinue/onCheckout/external_id/Purchase), snapshot/visual regression das telas, smoke E2E do funil completo (quiz→checkout).
15. **CI/deploy:** deploy manual sem gate de CI; sem preview obrigatório antes de prod; rollback = 1 clique no CF. Considerar `--dry-run` no CI e gate de `tsc`/build.
16. **Pendências conhecidas (memória do projeto):** `#4` funil conta checkout de teste (falta coluna `is_test`); `#5` upsert de dedup falha se `txid` null. Verificar se ainda valem.

---

## ENTREGÁVEL
Relatório em `~/Quiz-sacra/docs/AUDITORIA-QUIZ-SACRA-<data>.md` com:
- **Sumário executivo** (3-5 achados que mais importam pra receita/risco).
- Tabela de achados: `severidade | área | arquivo:linha | evidência | correção`.
- **Fixes de responsividade/UX aplicados** (antes/depois, arquivos tocados, verificação em dispositivos).
- Resultados objetivos: `npm audit`, `tsc`, Lighthouse (scores+métricas), matriz de dispositivos testados, prints do Meta Test Events + funil do admin + venda de teste.
- O que foi **verificado ao vivo** vs **só no código** (seja honesto — nada de "100%" sem observar o evento real).

## GUARDRAILS
- **Pode aplicar:** fixes de responsividade, layout, CSS, overflow, safe-area, `prefers-reduced-motion`, cleanup de React — sempre com `tsc` verde e verificação. Trabalhe em branch; não deploye/commite sem pedido.
- **NÃO altere sem OK explícito do dono:** pixel/`external_id`/`content_name`/CAPI/redirect de checkout/gateway Pagar.me/DDL do banco. Não rode `db push`.
- **Fact-Forcing Gate** no repo: antes do 1º Bash e de cada Edit/Write, apresente "fatos" (importadores, API afetada, schema, instrução do usuário verbatim) e re-tente.
- Se o **CodeScene MCP** não estiver conectado, **não invente scores** — reporte como pulado.
