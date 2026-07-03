# Plano — Alterar Resultado + Oferta do Quiz Sacra (design Neurofé)

> 2026-07-02. Auditado por 2 agentes contra o código real. Alvo ÚNICO: `~/Quiz-sacra`
> (roda em produção em `rotinadepaz.com.br/sacra/quiz`, deploy via `~/rotina-de-paz/deploy.sh`).
> Alterar **só da sessão de resultado pra frente**. NÃO é página nova. NÃO envolve o app Vercel.
> Supersede o doc antigo `PLANO-MIGRACAO-VENDAS-DESIGN` (aquele mirava o repo errado).

## Simplificação-chave
Estamos editando o quiz **no lugar** (componentes React). Arquétipo e desejo **já chegam como props**
(`archetype`, `desire=answers["desejo"]`, `bridge`, `name`, preços). O design vira **2 componentes
React novos** alimentados por essas MESMAS props. **Sem `?padrao=`/`?desejo=` na URL, sem cross-repo,
sem Vercel.** O eixo desejo já está fiado hoje — a gente PRESERVA.

## O SEAM (confirmado, `arquivo:linha`)
- Substituir: **`src/components/quiz/ResultScreen.tsx` inteiro** + **`OfferScreen`** (`QuizApp.tsx:1451-1731`) + `NarrationCaption` (`1247-1449`) + `SectionTitle`.
- Renderizados em `QuizApp.tsx:588-597` (result) e `599-610` (offer). Corte a partir de `setStage("result")`.
- **NÃO tocar:** Hero, Questions (7), Loading, ContactGate (captura), `computeArchetype`, `QUESTIONS`, `persistLead`/`submitContact`, libs de tracking.

## Design → telas
- **Tela A (Apresentação, 5 cenas: Revelação/Verdade/Mecanismo/Imagine/CTA)** substitui `ResultScreen.tsx`.
- **Tela B (Como Funciona + Oferta)** substitui `OfferScreen`.

## Dados (`src/data/quiz.ts` → `ARCHETYPES`) — o que muda
Muitos campos do design JÁ existem no quiz (só nome diferente):
`espelho=result.mirror` · `verdadeTitulo1/2=truthTitle/truthTitleEm` · `verdadeCorpo=truthBody` · `versiculoRef/versiculo=verseRef/verseText`.
**Adicionar** (novos, do `arquetipos.js`), por arquétipo: `boxes[]` (Corpo/Mente/Espírito, 3×4=12 textos), `dores[]`, `versiculoNota1/2`, `tentouCorpo`, `proximoPasso`, nome do mecanismo **"Neurofé"**.
**Manter** (o design não fornece, mas usamos): `chapters[]` (capítulos do método por arquétipo — usados na oferta e no email), `esperar`/`naoEsperar`, `bridges` (por situação), `mechanism`/`mirrorChecks`.
⚠️ **Compliance:** ao portar a copy do design, reescrever "sistema nervoso"/"neuroplasticidade" na versão compliant. "Neurofé" aprovado.
> **CORREÇÃO (Fase 0, 2026-07-02):** a suposição de que "o quiz já removeu os termos clínicos" era **FALSA**. O `quiz.ts` LIVE ainda tem 15 hits no conteúdo ANTIGO — incl. **claim de cortisol** (`result.happening`/`desarme`, linhas ~483/568: "Cortisol responde a treino corporal, não a fé consciente"), **"ansiedade"** como rótulo nas **7 perguntas** (52–94) e em `chapters` ("Ansiedade Vigilante/Culposa/…"), **"insônia comum"** (85), **"sistema nervoso"** (88/323/443/681), **"Purificação Neural"** (570). O conteúdo NOVO (`neurofe`) é limpo. Os que MORREM no redesign: campos de `result`/`desarme` (cortisol some). Os que SOBREVIVEM e precisam de decisão: (a) 7 perguntas/narração — zona "não tocar", exige OK do dono; (b) `chapters[]` — o plano manda manter, mas a oferta nova vai re-renderizar os termos → limpar `chapters` também.

## Eixo DESEJO × ARQUÉTIPO (decisão do dono, 2026-07-02) — SPLIT
**Decisão travada: CORPO/CONTEÚDO por ARQUÉTIPO · CTA por DESEJO.**
- **Corpo por arquétipo:** cena Imagine (Tela A cena 3, animação palavra-a-palavra) e `proximoPasso` (cena 4) usam os campos NOVOS do design `mudaTitulo`/`mudaCorpo`/`proximoPasso` (`arquetipos.js`), migrados por arquétipo. NÃO usar `DESIRE_BEAT` no corpo do resultado.
- **CTA por desejo:** os labels de botão (Tela A cena 4 e Tela B) usam `DESIRE_CTA[answers["desejo"]]` (4 chaves: dormir/descansar/orar/parar-pior), fallback `"Eu creio — quero minha paz"`.
- Bloco "Você lembra do seu desejo…" (Tela B) → `DESIRE_QUOTE[desejo]` (já existe, `QuizApp.tsx:1651-1655`) — mantém.
- Consequência: `DESIRE_BEAT`/`DESIRE_BEAT_FALLBACK` deixam de alimentar o corpo (viram reserva). `getBridgeCopy` (bridge por situação) NÃO tem slot no design → decidir manter como beat extra ou aposentar (default: aposentar no visual novo, dados preservados).

## Preço / oferta (decisões do dono)
- Garantia: **15 dias** (hoje 7 — `QuizApp.tsx:1694`). Mudar.
- Âncora "de": **R$228** (hoje R$197 do DB `anchorCents`). Ajustar (DB ou constante do value stack).
- Parcelas: **10× de R$5,60** — CONFIRMADO pelo dono (10× COM juros; R$56 total no parcelado ≠ R$47 à vista é esperado). Exibição pode ser constante/`freeInstCount`, mas o preço "por" (R$47) do CTA/checkout continua **data-driven do DB** (`priceCents`), nunca hardcode — é o `value` do InitiateCheckout/CAPI.
- Value stack (Vol I+II R$127 / e-books R$37+R$37 / Louvores R$27 = R$228) = conteúdo novo.
- **Escassez ADOTADA (decisão do dono):** "TURMA LIMITADA · 100 MULHERES", contador de vagas restantes (design: "37 vagas") e barra animando 0→63%. Portar da Tela B (`Como Funciona.dc.html:145,304`). ⚠️ Se os números forem estáticos/fabricados, manter consistentes e revisar claim de escassez (compliance de publicidade). Sem back-end de estoque real — é elemento de UI.

## Tracking — mapa completo e regras à prova de falha (auditado por 2 agentes)
**Insight-chave:** dos ~21 eventos do funil, **19 disparam FORA do que trocamos** (em `index.html`, no mount de `QuizApp`, ou nos `useEffect` de stage do PAI `QuizApp`) → **intocados pelo redesign**. Só **2 pontos** precisam de fiação correta. Risco de tracking = pequeno e bem delimitado.

**Inventário (resumo):** PageView (`index.html`) · captureUtms / captureMetaClickData / saveTrackingSession (mount) · trackStep `arrival`/`question` · QuizStep custom · persist_lead + persist_quiz_responses (loading) · trackStep `contact_gate` · save_lead_contact · send-quiz-result (edge) · AM init + `Lead` (`lead_<eid>`) · **trackStep `result`/`offer`** (useEffect de stage no pai) · [dentro de `checkout()`] sendTrackingBeacon · trackStep `cta` · `InitiateCheckout` (`ic_<eid>_rotina_de_paz`) · redirect decorado `src=external_id`+utms.

**Os 2 pontos SAGRADOS (classe A — só isto precisa fiação nas telas novas):**
1. Botão de avançar do **resultado novo** → chamar a prop **`onContinue`** (=`goToOffer`). Se esquecer: usuário não chega na oferta → perde offer/cta/IC/venda. **FATAL.**
2. Botão(ões) de compra da **oferta nova** → chamar a prop **`onCheckout`** (=`checkout()`). Se esquecer: perde beacon + `cta` + InitiateCheckout + redirect com `src` → venda **órfã de external_id**. **CRÍTICO.**

**Regras "não quebre" (servidor + cliente):**
- **Não fundir** result+offer num stage só — `trackStep("result")`/`("offer")` disparam no `useEffect` de stage do pai (`QuizApp.tsx:348-355`); manter os 2 stages vivos.
- **Não recriar** external_id na tela nova — sempre `getOrCreateExternalId()` (`qs_<uuid>`, localStorage `rdp_external_id`). É o ELO com a venda: webhook lê `src` → `purchases.lead_id` + `user_data.external_id` cru no CAPI + lookup fbp/fbc/ip em `tracking_sessions`.
- **Não mudar** o `contentName "Rotina de Paz"` do InitiateCheckout (o `eventID ic_<eid>_<scope>` deriva dele — muda o texto, quebra a dedup do IC).
- **Não adicionar** Pixel de Purchase no cliente (Purchase é 100% CAPI server, `event_id=sale_id`; um Purchase client duplicaria — o Meta não deduplica).
- **Não mexer** no gate de hostname (`rotinadepaz.com.br`/`sacra.rotinadepaz.com.br`) — replicado em `index.html` + `QuizApp` + `tracking.ts`; fora dele TODO o tracking desliga silenciosamente.

**VSL (novo) — como plugar:**
- `fbq('trackCustom','VSLProgress',{percent})` nos marcos 25/50/75/100, **atrás do gate de hostname** (padrão do `QuizStep`), 1× por marco (Set de refs). Sem GTM.
- Player: hoje é áudio (`NarrationCaption`, já calcula `progress`); se virar vídeo VTurb/Panda, usar callbacks de progresso do player.
- **Pra aparecer no funil do admin** (`analytics_full_funnel`) precisa também de `track_quiz_step("vsl_50"…)`, MAS `quiz_funnel_events.stage` tem CHECK `IN (arrival,question,contact,result,offer,cta)` → `vsl_*` seria **silenciosamente rejeitado**. ⚠️ Antes de plugar: **confirmar o CHECK atual em PROD** (repo está em drift — prod já aceita `contact_gate`+`p_version`, aplicados fora-de-banda) e, se preciso, ampliar CHECK+RPC via Management API (ver memória `rotina-de-paz-db-prod`).

## Compliance — lista COMPLETA validada (decisão do dono: validar tudo, com segurança e eficiência)
**Princípio:** remover só o que afirma (a) mecanismo fisiológico/científico "comprovado", (b) tratamento de condição médica (insônia/ansiedade como diagnóstico), (c) substituição de remédio. **NÃO** sanitizar as metáforas de marca nem a linguagem devocional — elas convertem e não são claim clínico. Troca cirúrgica, preservando ritmo e gancho. "Neurofé" e Romanos 12:2 ficam.

### A — Claim clínico/científico → REESCREVER (risco alto)
| Termo | Onde (`arquetipos.js` / `Como Funciona.dc.html`) | Reescrita compliant |
|---|---|---|
| `sistema nervoso` | boxes **Corpo** dos 4 arquétipos (`:20, :45, :70, :95`) | "o seu corpo" / "o corpo em alerta". Ex: "o sinal biológico que seu sistema nervoso precisa" → "o sinal que o seu corpo cansado precisa". |
| `neuroplasticidade` | boxes **Mente** dos 4 (`:21, :46, :71, :96`) + Método (`html:88`) | "treinar a mente, com constância, a aprender um novo caminho". Manter âncora "renovação de Romanos 12:2". |
| `neurociência` + `cérebro de instalar novos caminhos neurais` | Método Tela B (`html:88`) | "com a técnica certa e a constância, **a mente aprende** novos hábitos de paz — é a renovação da mente que Paulo já testificava". Remove neurociência/cérebro/neural. |
| `Renovação Neural` (nome Volume I) | `html:115, :384` | **"Renovação da Mente"** (on-brand Romanos 12:2). |

### B — Medicamento / rótulo diagnóstico → SUAVIZAR (risco médio)
| Termo | Onde | Reescrita |
|---|---|---|
| `melatonina` | vigilante `tentouCorpo` (`:43`) | generalizar: "Chá, técnica atrás de técnica, orar até tarde" (tira nome de suplemento). |
| `insônia comum` | vigilante `verdadeTitulo1` (`:36`) | "Isso não é só uma noite mal dormida." (mantém o reframe, tira o rótulo clínico). |
| `ansiedade` ("ansiedade demais"/"ansiedade é pecado") | vigilante `tentouCorpo` (`:43`); antecipatoria `tentouCorpo` (`:93`) | tirar o rótulo: "Alguém disse que era falta de fé, que bastava confiar." **Manter** a refutação "Isso é mentira" (é anti-estigma, saudável). |

### C — MANTER (risco baixo — não sanitizar, é o DNA que converte)
Metáforas de arquétipo: `Modo Operacional`, `modo de plantão`, `modo sentinela`, `radar`, `ronda mental`, `tribunal interno`, `cinema de tragédias`, `sentinela da casa`. · `Neurofé` (mecanismo aprovado). · `Selagem Profunda` (Volume II, devocional). · Versículos e Romanos 12:2. — São metáforas/fé, não afirmam condição médica. **Não mexer.**

> Aplicar tudo isto na **Fase 0** (dados), antes de qualquer visual. Total: 4 termos classe A (×4 arquétipos onde repetem) + 3 classe B + 1 nome de volume.

## Fases (incremental, sem quebrar)
- **Fase 0 — Dados.** Estender `quiz.ts` (campos novos + Neurofé + garantia 15d + âncora 228), copy compliant. Sem visual → risco zero.
- **Fase 1 — Tela A (Apresentação).** Novo componente (engine de cenas/stories, canvas de partículas, keyframes, Ken Burns, animação palavra-a-palavra). Props: archetype+desire+name. Cena Imagine/CTA por desejo. CTA→onContinue.
- **Fase 2 — Tela B (Como Funciona/Oferta).** Novo componente: VSL slot (embed VTurb/Panda + fbq VSLProgress), método, o que recebe, carrossel volumes, bônus, card oferta (preço DB + value stack + 15d + 10×), honestidade (esperar/naoEsperar por arquétipo), garantia. CTAs→checkout.
- **Fase 3 — Fiação + verificação + PREVIEW.** Manter stages; testar 4 arquétipos × 4 desejos; conferir trackStep/InitiateCheckout/params. **Deploy PREVIEW primeiro** (`~/rotina-de-paz/deploy.sh` sem `--prod` → URL `*.pages.dev`); validar tracking no Meta Test Events + funil do admin; só então promover (`--prod`). Backup já existe (`backup-resultado-oferta-2026-07-02/`), rollback = 1 clique no CF.

## Decisões de subida (dono, 2026-07-02)
- **Não recriar design** — PORTAR o handoff (`~/Downloads/design_handoff_rotina_de_paz/`) para React (CSS quase-verbatim, animações em `useEffect`). Fonte de verdade = os `.dc.html`, não o README.
- **Fidelidade Tela A = 1:1** — portar TODAS as animações (partículas canvas, Ken Burns, palavra-a-palavra, transição de cenas WAAPI, barra de stories).
- **Preview antes de produção** (ver Fase 3).
- **Não usar iframe/HTML cru** — quebraria external_id/checkout/beacon (atribuição/CAPI). Tem que ser React in-place.

## Assets
`~/Downloads/design_handoff_rotina_de_paz/src/assets/*` → `~/Quiz-sacra/src/assets/` (otimizar webp). NÃO portar `support.js`/`image-slot.js`.

## Referências
- Backup do resultado/oferta ATUAL: `~/Quiz-sacra/backup-resultado-oferta-2026-07-02/` + `CONTRATO-PERSONALIZACAO.md`.
- Design: `~/Downloads/design_handoff_rotina_de_paz/` (README + `src/arquetipos.js` + 2 `.dc.html`).
