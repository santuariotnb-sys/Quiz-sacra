# Verificação de encaixes — Quiz Sacra v4 como workspace novo (PRÉ-implementação)

**Data:** 2026-07-19 · **Modo:** somente leitura (código), sem migrations/commits.
**⚠️ ACHADO 0 (bloqueia a auditoria se ignorado):** a branch pedida do admin, `feat/emq-purchase-capi`,
está **100% mergeada e 19 commits atrás de `origin/main`** (`git log feat/emq-purchase-capi..origin/main`
= 19 commits; o inverso = 0). Main já inclui as 3 migrations de workspaces (`20260709_*`), o seletor de
quiz no admin (Fase 3, commit `2805009`) e o sistema de WhatsApp inteiro (commits `634a8f5`…`2aee916`),
**nenhum dos quais existe no working tree da branch pedida**. Como `push na main = deploy automático em
produção` (CLAUDE.md do repo), auditei contra **`origin/main`** — é o que está de fato no ar. Todos os
`arquivo:linha` abaixo são de `origin/main` salvo indicação contrária.

---

## 1. Criar workspace novo

**Schema de `public.quizzes`** (`supabase/migrations/20260709_workspaces_multi_quiz.sql:14-24`):
```
id text PK · nome text NOT NULL · workspace text NOT NULL DEFAULT 'sacra' (metadado, não usado em filtro)
pixel_id text (nullable) · external_id_prefix text NOT NULL DEFAULT 'qs_' · base_path text (nullable)
status text NOT NULL DEFAULT 'active' CHECK IN ('active','paused','archived') · created_at timestamptz
```
FKs: `leads.quiz_id`, `quiz_funnel_events.quiz_id`, `quiz_responses.quiz_id` → `quizzes(id)` (linhas 46-56).
`purchases` **não tem** `quiz_id` — a venda é ligada por join `src ∈ leads_reais(quiz_id)` nas RPCs
(comentário explícito em `20260709_workspaces_multi_quiz_rpcs.sql:11-15`).

**Insert mínimo para o v4** (via Management API, não `db push`):
```sql
insert into public.quizzes (id, nome, pixel_id, external_id_prefix, base_path)
values ('v4', 'Quiz Sacra v4', '863734499693171', 'v4_', '/sacra/quiz');
```
Escolher um `id` estável (ex. `'v4'`) — é o slug gravado em `leads.quiz_id` para sempre; não reaproveitar
`'sacra'` (isso é o workspace antigo/histórico).

**Descoberta pelo seletor do admin — automática, ZERO código.** Fluxo confirmado ponta a ponta:
- `getQuizzes()` (`src/lib/admin/quiz-catalog.functions.ts:8-19`) faz `select("id, name:nome") .order("created_at")` — sem filtro, pega toda linha nova.
- `AdminQuizProvider` (`src/lib/admin/quiz-context.tsx:22-43`) busca via `useQuery(["admin-quizzes"], getQuizzes)`.
- `AdminTopbar.tsx:80-92` renderiza `<option>` para cada item de `quizzes` (mapeado direto) + uma opção fixa `<option value="">Todos os quizzes</option>` (linha 89).

**"Todos os quizzes" = `quizId === null` = sem filtro.** Confirmado em `AdminTopbar.tsx:84-85`
(`value={quizId ?? ""}` / `onChange` converte `""` → `null`) e propagado como `p_quiz_id: quizId ?? null`
em **todas** as server fns (`analytics.functions.ts:28,41,63,76,93`; `checkout-funnel.functions.ts:27,41`;
`quiz-funnel.functions.ts:27`; `conversion.functions.ts:17`) → nas RPCs, `(p_quiz_id is null or col = p_quiz_id)`
(ex. `20260709_workspaces_multi_quiz_analytics.sql:29`) = combina dados de todos os workspaces.

**QueryKeys já incluem `quizId`** em `admin.quiz.tsx:87,93,111,117,123,129`, `admin.leads.tsx:46`,
`admin.tracking.tsx:118,138`, `admin.analytics.tsx:74,79,84,89,94` — a "armadilha silenciosa" que o design
doc (`docs/DESIGN-workspaces-multi-quiz.md:66`) alertava **já foi corrigida**. Fase 0-3 do design doc estão
100% implementadas e corretas em produção.

**Propagação frontend (Quiz-sacra) — já pronta, config-only.** `src/lib/quiz-config.ts:7-14` resolve
`QUIZ_ID`/`PIXEL_ID`/`EXTERNAL_ID_PREFIX` via `VITE_QUIZ_ID`/`VITE_PIXEL_ID`/`VITE_EXTERNAL_ID_PREFIX`
(default `'sacra'`/`'863734499693171'`/`'qs_'`), e as 3 RPCs de escrita já mandam `p_quiz_id: QUIZ_ID`
(`src/lib/tracking.ts:291`, `src/components/quiz/QuizApp.tsx:221,532,568`). Para o v4: só setar
`VITE_QUIZ_ID=v4` (e opcionalmente `VITE_EXTERNAL_ID_PREFIX=v4_`) no build do path `/sacra/quiz`.

---

## 2. Impacto do `question_key` novo `peso` (no lugar de `situacao`)

Levantamento de TODOS os hardcodes de `'situacao'` como **question_key** (excluí `leads.situation`/coluna
e variáveis locais chamadas `situacao` que guardam o *valor* da resposta, não a chave — são independentes):

| # | Local | O que quebra para o v4 | Fix mínimo |
|---|---|---|---|
| 1 | `20260709_workspaces_multi_quiz_analytics.sql:116-127` (`analytics_quiz_funnel`, CASE `e.question_key`) | `CASE` **sem `ELSE`** → question_key `'peso'` cai em `label=NULL`, `sort_order=NULL`. Na CTE `ordered` (linha 163-165), `lag() over (order by sort_order)` empurra a linha do Q1 pro fim (NULLS LAST) e quebra a cadeia de `drop_pct` de TODO o funil quando filtrado por `p_quiz_id='v4'`. | Adicionar `ELSE 'Q' \|\| dense_rank... \|\| ' · ' \|\| initcap(question_key)` genérico, OU (mais simples/seguro) mover o mapeamento label/ordem para uma tabela `quiz_questions(quiz_id, question_key, label, sort_order)` consultada via `JOIN`, mantendo retrocompat total pro `'sacra'` |
| 2 | `20260709_workspaces_multi_quiz_analytics.sql:257-261` (`analytics_full_funnel`, `q_q1`) | `e.question_key = 'situacao'` hardcoded — para `p_quiz_id='v4'` essa contagem **sempre retorna 0** (nenhum evento do v4 tem key `'situacao'`), mesmo com tráfego real chegando no Q1 | Parametrizar a key do "Q1" por quiz (mesma tabela `quiz_questions`, ou um `CASE p_quiz_id WHEN 'v4' THEN 'peso' ELSE 'situacao' END`) |
| 3 | `admin.quiz.tsx:38-46` (`QUESTION_LABELS`) e `:48-56`/`:225-233` (`QUESTION_ORDER`, duplicado) | Hardcoded no frontend; respostas com `question_key='peso'` do v4 **não aparecem** na tabela "Distribuição de respostas por pergunta" (`questionReach`, linha 224-246) — ficam invisíveis, sem label, sem % | Tornar `QUESTION_LABELS`/`QUESTION_ORDER` dependentes de `quizId` (mapa por quiz, ou vir do banco via a mesma tabela de config sugerida acima) |
| 4 | `admin.analytics.tsx:41` (`SITUATION_LABELS`) e uso em `:121` | Mapeia **valores** da coluna `leads.situation` (não question_key) — baixo risco; se o v4 gravar valores novos em `leads.situation` a partir da resposta de `'peso'`, só cai no fallback `?? s.situation` (mostra o raw value). Cosmético, não bloqueia. | Adicionar entradas ao dicionário quando os valores de `peso` forem definidos (não bloqueante para o go-live) |
| 5 | Quiz-sacra: `src/data/quiz.ts:27-28,44-45` (`key: "situacao"`, `questionKey: "situacao"`) | Isso é a definição da própria pergunta no quiz — presumo que o branch `feat/resultado-3-slides` (ou uma branch v4 dedicada) já troca isso para `"peso"` no código do quiz. **Confirmar que existe uma branch/worktree separada** com essa troca — não vi essa mudança na working tree atual do Quiz-sacra (ainda mostra `"situacao"`) | N/A — é trabalho de produto/copy, fora do escopo desta verificação de encaixe |
| 6 | Quiz-sacra: `QuizApp.tsx:281,529,552` (`ans["situacao"]` → `p_situation`) | Se a Q1 virar `'peso'`, esse código precisa ler `ans["peso"]` em vez de `ans["situacao"]` — senão `leads.situation` (coluna) fica sempre `null` para o v4 | Atualizar a leitura da resposta no componente do quiz (mesma branch do item 5) |

**RPC que NÃO precisa mudar:** `analytics_quiz_conversion` (`20260709_..._analytics.sql:72-94`) agrupa por
`qr.question_key` genericamente, sem CASE/hardcode — funciona para `'peso'` sem alteração.

**Recomendação (mais simples e segura):** criar uma tabela pequena `quiz_question_meta(quiz_id text,
question_key text, label text, sort_order int, primary key(quiz_id, question_key))`, seed com as 7 linhas
atuais para `quiz_id='sacra'` + as 7 do v4 (com `'peso'` em vez de `'situacao'`), e trocar os 2 `CASE`
hardcoded (itens 1-2) por `JOIN`. Isso resolve os itens 1, 2 e 3 de uma vez (o frontend passa a buscar
label/ordem via uma nova RPC leve `get_quiz_question_meta(p_quiz_id)` em vez de constante local). É mais
trabalho que um `CASE p_quiz_id WHEN 'v4' THEN ...` remendado, mas é o único caminho que não quebra ao
adicionar um 3º quiz depois.

---

## 3. CHECK de stage — allowlist da RPC (8) vs CHECK da tabela (6, suspeita)

**RPC `track_quiz_step` (estado vigente, `20260709_workspaces_multi_quiz_rpcs.sql:68`):**
```sql
if p_stage not in ('arrival', 'hero_intent', 'question', 'contact', 'contact_gate', 'result', 'offer', 'cta') then return; end if;
```
8 stages — confirmado.

**CHECK real da TABELA — não está em nenhuma migration do repo do admin.** A `CREATE TABLE IF NOT EXISTS`
em `20260630_b5_tracking_schema_and_indices.sql:19-27` documenta o schema vivo capturado via
`information_schema` **sem nenhum CHECK** (porque `IF NOT EXISTS` é no-op numa tabela existente — quem
escreveu a migration não precisou capturar a constraint pra isso funcionar, só as colunas).

A origem real do CHECK **está no repo do quiz** (marcado como "drift"/lixo histórico pelo próprio design
doc, `DESIGN-workspaces-multi-quiz.md:18`): `~/Quiz-sacra/supabase/migrations/002_quiz_funnel_events.sql:7`:
```sql
stage text NOT NULL CHECK (stage IN ('arrival', 'question', 'contact', 'result', 'offer', 'cta'))
```
**6 valores** — sem `hero_intent` nem `contact_gate`. Isso bate com o item 4 do design doc
(`DESIGN-workspaces-multi-quiz.md:80`): *"Bug contact_gate (RPC aceita, CHECK rejeita — código morto, 0
ocorrências): NÃO consertar junto"* — ou seja, **o próprio time já sabia disso em 2026-07-09 e decidiu não
mexer**. E o quiz **emite `hero_intent` ativamente hoje** (`QuizApp.tsx:757`, `trackStep("hero_intent", slug)`)
e `contact_gate` (`admin.quiz.tsx:219-221,253,444-445` trata como se tivesse dados — mas o design doc diz
"0 ocorrências").

**Risco real para o v4:** se a constraint de produção ainda for a de 6 valores, TODO evento
`hero_intent`/`contact_gate` falha no INSERT com `23514` dentro da função (sem try/catch no
`track_quiz_step`) — a chamada RPC retorna erro pro cliente (best-effort, não deveria travar o quiz, mas
**os dados nunca chegam**: KPI "Deram WhatsApp" (`admin.quiz.tsx:421-425`, fonte `contact_gate`) e qualquer
funil baseado em `hero_intent` ficam artificialmente zerados para QUALQUER workspace, inclusive o v4. Isso
não é introduzido pelo v4 — é uma dívida pré-existente — mas **precisa ser confirmado antes do go-live**
porque o v4 vai depender do mesmo KPI de WhatsApp capturado pro funil novo.

**Query read-only pra confirmar contra o banco vivo (rodar via Management API `/database/query`):**
```sql
-- 1) Definição exata da constraint hoje
select con.conname, pg_get_constraintdef(con.oid)
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where rel.relname = 'quiz_funnel_events' and nsp.nspname = 'public' and con.contype = 'c';

-- 2) Confirma se hero_intent/contact_gate JÁ conseguiram gravar alguma vez
select stage, count(*) from public.quiz_funnel_events group by stage order by 2 desc;
```
Se a query 1 mostrar só 6 valores e a query 2 mostrar `hero_intent`/`contact_gate` ausentes ou zerados,
**o fix é**: `ALTER TABLE public.quiz_funnel_events DROP CONSTRAINT <nome>; ADD CONSTRAINT ... CHECK (stage
IN ('arrival','hero_intent','question','contact','contact_gate','result','offer','cta'));` — aditivo,
zero risco de dado existente (só amplia o allowlist). Recomendo fazer ISSO antes do go-live do v4, já que
o v4 depende do KPI de WhatsApp que hoje está mudo.

---

## 4. WhatsApp — endpoint, filas, admin

**Endpoint `/api/public/whatsapp/enqueue-result`** existe em `src/routes/api/public/whatsapp/enqueue-result.ts`
(só em `origin/main`, ausente na branch pedida — ver Achado 0). Gate por secret (`WHATSAPP_ENDPOINT_SECRET`,
linhas 17-20), resolve o lead por `id` e **já grava `quiz_id: lead.quiz_id ?? null`** na fila (linha 51) —
ou seja, **já é quiz-aware sem precisar de mudança**.

**Tabela `whatsapp_sends`** (`supabase/migrations/20260714_whatsapp_sends.sql:3-16`): coluna `quiz_id text`
nullable (sem FK), populada automaticamente a partir do lead no momento do enqueue.

**Cron `whatsapp-dispatch`** (`src/routes/api/cron/whatsapp-dispatch.ts`): lê `leads.archetype/desire/situation`
(colunas, não `question_key`) para gerar as variáveis do template — **não depende de `situacao` vs `peso`**,
funciona igual para o v4 sem alteração.

**O que o admin mostra das mensagens enviadas: NADA.** Busquei `whatsapp_sends` em todas as rotas
`admin.*.tsx` de `origin/main` — zero ocorrências fora do próprio enqueue/cron. Não existe tela/aba que
liste o status da fila (pending/sent/failed/skipped). Isso é uma lacuna pré-existente, não causada pelo v4,
mas o dono deve saber que hoje é 100% caixa-preta (só dá pra inspecionar via SQL direto).

**Funcionará pro v4 sem mudança:** sim, porque a fila já carrega `quiz_id` dinamicamente do lead
(não hardcoded), e o cron não filtra/depende de quiz_id para operar (dispara pra todos, indistintamente,
o que é o comportamento correto já que é 1 fila única compartilhada).

---

## 5. Webhook / entitlements — não assume `quiz_id`/`'sacra'` em lugar nenhum

Busquei `"quiz_id"` e `"sacra"` em `src/lib/admin/kirvano.server.ts` e `meta-capi.server.ts` (`origin/main`):
**zero ocorrências**. Resolução de lead é puramente por `external_id`:
```
kirvano.server.ts:335-348 — utmSrc = payload.utm.src; leads.select("id").eq("external_id", utmSrc)
kirvano.server.ts:391-398 — purchases.src = utm?.src ?? null (mesma chave, sem tocar quiz_id)
```
Entitlements (`kirvano.server.ts:269-302`) chaveiam por `user_id`/produto, também sem qualquer noção de
quiz. CAPI Purchase (chamado logo após, mesmo arquivo) usa os dados da purchase/lead já resolvidos, mesma
lógica. **Conclusão: uma venda do v4 (mesmos produtos Kirvano, `external_id` com prefixo novo, ex. `v4_`)
flui idêntico** — o join lead↔venda por `external_id` funciona para qualquer prefixo, contanto que seja
único o suficiente pra não colidir com `qs_` (ver risco #5 abaixo).

---

## 6. Deploy `/sacra-v2/` — pipeline unificado

**`~/rotina-de-paz/apps.manifest:27-28`** hoje só tem 1 entrada de quiz:
```
sacra | build | $HOME/Quiz-sacra | /sacra/ | quiz,obrigado
```
**`deploy.sh` builda o `path` declarado, em lugar; não builda a mesma pasta duas vezes com bases
diferentes.** O guard de `base` é um `grep -q "base: \"$base\"" "$path/vite.config.ts"` (linha 92-93) —
**um único `vite.config.ts` só pode ter um `base` por vez**, então **não dá pra ter `/sacra/` e
`/sacra-v2/` saindo do mesmo diretório** sem trocar o arquivo entre builds (frágil, não é o padrão do
manifesto). `~/Quiz-sacra/vite.config.ts:8` tem `base: "/sacra/"` hardcoded, sem env.

**Solução recomendada (zero mudança em `deploy.sh`, só dados):**
1. Criar um segundo diretório físico congelado no commit atual (antes das mudanças do v4) — via
   `git worktree add ~/Quiz-sacra-v2 <branch-ou-commit-atual>` (ou clone simples), com seu próprio
   `vite.config.ts` alterado para `base: "/sacra-v2/"`.
2. `~/Quiz-sacra` (o diretório principal, de trabalho contínuo) vira o v4 — a mudança de `'situacao'`→`'peso'`
   e `VITE_QUIZ_ID=v4` entram ali, continua com `base: "/sacra/"` (inalterado).
3. `apps.manifest` ganha 1 linha:
   ```
   sacra-v2 | build | $HOME/Quiz-sacra-v2 | /sacra-v2/ | quiz,obrigado,resultado
   ```
   (nota: incluí `resultado` — ver achado extra abaixo.)

**`_redirects` — sem risco de colisão de ordem.** `deploy.sh:157-165` gera `/sacra/*` e `/sacra-v2/*` como
prefixos literais distintos (Cloudflare Pages casa por segmento; `/sacra/*` não intercepta `/sacra-v2/...`
porque falta a barra depois de "sacra"). A ordem das entradas no manifesto não importa aqui.

**Achado extra (bug pré-existente, não causado pelo v4):** `apps.manifest:28` declara subrotas físicas
`quiz,obrigado` para o app `sacra`, mas o Quiz-sacra JÁ TEM uma 4ª rota client-side, `/resultado`
(`~/Quiz-sacra/src/routes/resultado.tsx`, `routeTree.gen.ts:20`, presente na branch atual
`feat/resultado-3-slides` como arquivo novo/staged). Sem a subrota física `resultado` no manifesto, um
hard-refresh em `rotinadepaz.com.br/sacra/resultado` cai no fallback errado sob o pipeline `deploy.sh`
(diferente do `deploy-quiz.sh`, que já inclui `resultado` na linha 68 — os dois scripts estão dessincronizados
entre si). **Corrigir isso é pré-requisito do go-live do v4 de qualquer forma** (a rota `/resultado` é nova
neste ciclo), independente do workspace novo.

**Risco #1 do lançamento: `deploy-quiz.sh` derruba o `/sacra-v2/` — CONFIRMADO e quantificado.**
`~/Quiz-sacra/deploy-quiz.sh:62-78`:
- Reconstrói `$RDP_DIR` (site) do zero (`npm run build`, linha 60) e copia só `$QUIZ_DIR/dist` → `dist/sacra/`
  (linhas 63-64) — **nunca toca em `/sacra-v2/`**.
- Sobrescreve `_redirects` inteiro (linhas 75-78) com **apenas** `/sacra/* ` + catch-all — **apaga
  qualquer regra `/sacra-v2/*`** que o `deploy.sh` unificado tivesse gerado antes.
- Resultado: se alguém rodar `./deploy-quiz.sh --prod` depois do go-live do v4 (hábito antigo, ou um
  agente que não sabe do novo pipeline), o próximo deploy **derruba `/sacra-v2/` silenciosamente**
  (vira catch-all → serve a home do site, não o quiz antigo).

**Fluxo de deploy final seguro proposto:**
1. Deletar (ou renomear para `.bak` com um `exit 1` logo no topo e comentário grande) `deploy-quiz.sh` —
   ele já é redundante desde que `deploy.sh` existe; junto com o achado do item 6 acima, ele é hoje uma
   arma carregada apontada para `/sacra-v2/`.
2. Único comando de deploy dali em diante: `~/rotina-de-paz/deploy.sh --prod` (ou `--dry-run` antes).
   Quem builda o quê: `deploy.sh` chama `npm run build` em CADA `path` do manifesto (`Quiz-sacra` e
   `Quiz-sacra-v2`, cada um com seu próprio `.env`/`VITE_QUIZ_ID`/`vite.config.ts base`), monta o dist
   combinado, gera `_redirects` com as 2 (+ site) entradas, valida, e só então `wrangler pages deploy`.
3. Adicionar ao `apps.manifest` um comentário grande avisando que `deploy-quiz.sh` foi descontinuado.

---

## 7. Top 10 riscos deste lançamento

| # | Risco | Área | Mitigação |
|---|---|---|---|
| 1 | `deploy-quiz.sh` sobrescreve `_redirects` e derruba `/sacra-v2/` num deploy futuro (confirmado, §6) | Deploy | Deletar/desativar o script antes do go-live |
| 2 | CHECK de 6 valores na tabela `quiz_funnel_events` rejeita `hero_intent`/`contact_gate` — KPI de WhatsApp do v4 nasce zerado (§3) | Dados | Confirmar via query read-only e aplicar `ALTER ... DROP/ADD CONSTRAINT` aditivo antes do go-live |
| 3 | `CASE` sem `ELSE` em `analytics_quiz_funnel`/`analytics_full_funnel` quebra ordenação e zera Q1 para `question_key='peso'` (§2, itens 1-2) | Analytics | Parametrizar label/ordem por quiz (tabela `quiz_question_meta` ou CASE por quiz_id) antes de rotear tráfego pro v4 |
| 4 | `admin.quiz.tsx` `QUESTION_LABELS/QUESTION_ORDER` hardcoded — respostas de `'peso'` ficam invisíveis na UI (§2, item 3) | Admin UI | Tornar dependente de `quizId` |
| 5 | Prefixo `external_id` do v4 colidir/confundir com `qs_` do workspace antigo se não for escolhido com cuidado | Atribuição | Escolher prefixo claramente distinto (ex. `v4_`) e único — já é parametrizável (`VITE_EXTERNAL_ID_PREFIX`) |
| 6 | `apps.manifest` não tem subrota física `resultado` — hard-refresh em `/sacra/resultado` quebra sob `deploy.sh` (§6, achado extra) | Deploy | Adicionar `resultado` à coluna de subrotas antes do primeiro deploy com a rota nova |
| 7 | `vite.config.ts` com `base` hardcoded por diretório — build errado (base trocada, ex. alguém editar o arquivo errado) sobe assets 404 | Deploy | Manter 2 diretórios físicos separados (worktree), nunca alternar o `base` no mesmo diretório |
| 8 | Zero visibilidade admin da fila de WhatsApp (§4) — se o v4 gerar volume e algo falhar (token, template), ninguém percebe pelo admin | Operação | Fora de escopo do go-live, mas registrar como pendência pós-lançamento |
| 9 | `quiz_id` em `leads`/`quiz_funnel_events`/`quiz_responses` é `NOT NULL DEFAULT 'sacra'` com FK pra `quizzes(id)` — se o insert do catálogo (`insert into quizzes ...`) falhar ou for esquecido, qualquer INSERT que já mande `p_quiz_id='v4'` explicitamente falha com FK violation (não cai no default, já que é explícito) | Dados | Rodar o insert do catálogo ANTES de qualquer deploy que troque `VITE_QUIZ_ID` |
| 10 | Migrations do repo do quiz (`~/Quiz-sacra/supabase/migrations`) estão em "drift" reconhecido (não refletem produção) — qualquer novo dev pode se confundir e aplicar DDL do lugar errado | Processo | Reforçar (já documentado no design doc) que só `~/rotina-de-paz-app/supabase/migrations` + Management API é fonte de verdade |

---

## PRONTO PARA IMPLEMENTAR: **não**, com estas condições antes de seguir

1. Rodar as 2 queries read-only do §3 contra produção e decidir o fix do CHECK constraint.
2. Resolver o `CASE` sem `ELSE` em `analytics_quiz_funnel`/`analytics_full_funnel` (§2) — sem isso o
   funil do v4 nasce com números errados, o que é exatamente o que esta verificação foi pedida para evitar.
3. Atualizar `QUESTION_LABELS`/`QUESTION_ORDER` no admin (§2, item 3) para não esconder as respostas do
   v4 na tela de Analytics do Quiz.
4. Criar o worktree/diretório físico separado para `/sacra-v2/` e desativar `deploy-quiz.sh` (§6) —
   sem isso, o próximo deploy do quiz antigo por hábito derruba a página histórica.
5. Adicionar a subrota `resultado` ao `apps.manifest` (§6, achado extra) — necessário de qualquer forma
   pela rota nova `/resultado`, independente do workspace.
6. Confirmar que a branch/worktree do código do v4 (com `'peso'` em vez de `'situacao'`) já existe ou
   será criada separadamente do que hoje está em `~/Quiz-sacra` (§2, itens 5-6) — não localizei essa
   troca na working tree atual.

Nenhum desses é grande (a infraestrutura de workspaces em si — banco, RPCs, admin, propagação do quiz —
já está pronta e correta em produção); são ajustes cirúrgicos e bem localizados. Depois desses 6 pontos,
o encaixe está seguro para implementar.
