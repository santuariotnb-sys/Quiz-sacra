# PROMPT DE EXECUÇÃO — Resultado + Oferta do Quiz Sacra (design Neurofé)

> Cole isto como primeira mensagem numa sessão NOVA (contexto limpo). É autossuficiente.
> Gerado 2026-07-02 após auditoria de 3 vias (design × código × plano) + Fase 0 concluída.

---

## PAPEL
Você é um dev sênior React/TypeScript. Vai **portar um design pronto** para dentro de um quiz React que já roda em produção, **sem quebrar tracking nem a página no ar**. Você NÃO redesenha nada — traduz o HTML/CSS/JS do handoff para componentes React com fidelidade 1:1. Antes de agir, leia os 2 docs de referência (abaixo) e confirme o estado do git.

## LEIA PRIMEIRO (fonte de verdade)
1. `~/Quiz-sacra/docs/PLANO-ALTERACAO-RESULTADO-OFERTA-QUIZ.md` — o plano completo (seam, tracking, decisões, compliance).
2. Design handoff: `~/Downloads/design_handoff_rotina_de_paz/` — **os `.dc.html` são a fonte de verdade, NÃO o README** (README tem 4 divergências conhecidas: label do botão cena 0, `jaqueline.png` vs `respiro.jpg`, `tentouCorpo` não-renderizado, `ctaLabel` computado-mas-não-usado).
3. Memória do projeto: `rotina-vendas-design-migracao`, `rotina-de-paz-db-prod`, `rotinadepaz-deploy-cloudflare`.

---

## CONTEXTO / TOPOLOGIA (verificado)
- **Repo alvo:** `~/Quiz-sacra`. Roda em produção em `rotinadepaz.com.br/sacra/quiz`.
- **Build:** Vite com `base:"/sacra/"`. Deploy via `~/rotina-de-paz/deploy.sh` (copia o build p/ `~/rotina-de-paz/dist/sacra/` e sobe o site inteiro no Cloudflare Pages, projeto `rotina-de-paz`).
- **Preview:** `deploy.sh` SEM `--prod` → URL `*.pages.dev`. **Produção:** `--prod`.
- **DB prod (compartilhado):** `cemjibbauvvyfaxilrvm`. NÃO rodar `db push` (migrations aplicadas fora-de-banda). DDL só via Management API se estritamente necessário.
- **Backup do estado atual:** `~/Quiz-sacra/backup-resultado-oferta-2026-07-02/`. Rollback CF = 1 clique no dashboard.

## ALVO E LIMITES (escopo travado pelo dono — NÃO EXPANDIR)
- **Alterar SÓ:** a sessão de **resultado** e a de **oferta** — tudo que vem **depois da captura do WhatsApp**.
- **NÃO TOCAR:** hero, as 7 perguntas, loading, ContactGate (captura), `computeArchetype`, `QUESTIONS`, `ARCHETYPES` (valores existentes), `persistLead`/`submitContact`, libs de tracking. As perguntas/narração **ficam como estão** (mesmo com termos legados — decisão do dono).

---

## JÁ FEITO — FASE 0 (dados, concluída e verificada)
Em `src/data/quiz.ts` já existem (aditivo, dormente, compila verde):
- **`archetype.neurofe`** nos 4 arquétipos, com a copy do design **já compliance-aplicada** (Classe A/B reescritas):
  `dores[2]`, `espelho`, `verdadeTitulo1`, `verdadeTitulo2`, `verdadeCorpo` (HTML), `versiculoRef`, `versiculo`, `versiculoNota1`, `versiculoNota2`, `tentouCorpo` (HTML), `boxes[3]` (`{icone,titulo,texto}` = Corpo/Mente/Espírito), `mudaTitulo`, `mudaCorpo` (HTML), `proximoPasso` (HTML).
- **`NEUROFE_OFFER`** (export const): `anchorCents:22800`, `guaranteeDays:15`, `installments:10`, `installmentCents:560`, `valueStack[4]`, `metodo`, `volumes[2]`.
- **Já existem de antes:** `DESIRE_CTA[desire]`, `DESIRE_QUOTE[desire]` (chaves: `dormir`/`descansar`/`orar`/`parar-pior`).

**Consuma esses dados nas telas novas.** Não recrie copy — ela já está pronta e compliant.

---

## DECISÕES TRAVADAS (do dono — não reabrir)
1. **Split desejo × arquétipo:** CORPO/CONTEÚDO **por arquétipo** (`neurofe.mudaTitulo`/`mudaCorpo`/`proximoPasso`, `boxes`, etc.). **CTA por desejo** (`DESIRE_CTA[answers["desejo"]]`, fallback `"Eu creio — quero minha paz"`). `DESIRE_QUOTE[desire]` no bloco "Você lembra do seu desejo…". `DESIRE_BEAT` NÃO alimenta mais o corpo.
2. **Escassez ADOTADA:** "TURMA LIMITADA · 100 MULHERES", contador de vagas (design: 37), barra animando 0→63%. É UI (sem back-end de estoque). Manter números consistentes.
3. **Preço:** exibir **10× de R$5,60** (com juros — confirmado) + âncora **"de R$228"** (de `NEUROFE_OFFER`). O preço "por" **R$47 vem do DB** (`priceCents`, via prop) — é o `value` do InitiateCheckout. **NUNCA hardcode o preço "por".**
4. **Garantia:** **15 dias** (`NEUROFE_OFFER.guaranteeDays`), não 7.
5. **Compliance:** Classe A/B já reescritas no `neurofe`. Classe C mantida (metáforas de arquétipo, `Neurofé`, versículos). **`chapters[]` ainda tem termos clínicos** ("Ansiedade Vigilante", "sistema nervoso", "Purificação Neural") e a **oferta nova renderiza chapters** → limpe `chapters` ao montar a Fase 2 (mesmo padrão do `neurofe`).
6. **Fidelidade Tela A = 1:1** (todas as animações). **Preview antes de produção.** **NÃO usar iframe/HTML cru** (quebraria external_id/checkout/beacon).

---

## O SEAM (arquivo:linha — confirmado por 3 auditorias)
- Substituir **`src/components/quiz/ResultScreen.tsx` inteiro** e o **`OfferScreen`** em `QuizApp.tsx:1451-1731` (+ `NarrationCaption` `1247-1449` e `SectionTitle`).
- Renderizados em `QuizApp.tsx:588-597` (result) e `599-610` (offer), dentro de `<AnimatePresence mode="wait">`, gated por `stage === "..." && arche`.
- Transições: `onContinue` = `goToOffer` (`:410-412`, faz `setStage("offer")`) · `onCheckout` = `checkout()` (`:509-536`) · `onBack` = `() => setStage("result")`.

### Props que as telas recebem (mantenha a mesma interface; adicione o que precisar via pai)
- **ResultScreen** (`ResultScreen.tsx:43-55`): `archetype: ArchetypeData`, `bridge`, `name`, `desire` (= `answers["desejo"]`), `onContinue`. Dentro: `archetype.neurofe.*` para todo o corpo.
- **OfferScreen** (`QuizApp.tsx:1451-1467`): `archetype`, `desire`, `priceCents` (DB, default 4700), `anchorCents`, `freeInstCount`, `onCheckout`, `onBack`. Use `NEUROFE_OFFER` para âncora/garantia/stack/parcelas; use `priceCents` (prop) para o preço "por".
- Se precisar de mais dados por resposta, passe **nova prop do pai** — o filho NÃO tem acesso a `answers`.

---

## TRACKING — REGRAS À PROVA DE FALHA (não negociáveis)
**19 de ~21 eventos disparam FORA do que você troca** (em `index.html`, no mount do `QuizApp`, e no `useEffect` de stage do pai `QuizApp.tsx:347-355`). Só **2 pontos** dependem de você:

1. **SAGRADO #1:** o CTA de avançar do resultado novo **DEVE** chamar a prop `onContinue`. Esquecer = usuário não chega na oferta. FATAL.
2. **SAGRADO #2:** o(s) botão(ões) de compra da oferta nova **DEVEM** chamar a prop `onCheckout` (= `checkout()` do pai). **Nunca** montar URL de checkout próprio. Esquecer = perde beacon + `InitiateCheckout` + `src=external_id` no redirect → venda órfã. CRÍTICO.

**Não quebre:**
- Não fundir `result`+`offer` num stage só (o `useEffect` de stage dispara `trackStep("result")`/`("offer")`). Mantenha os 2 stages com os nomes `result`/`offer` (também usados no `localStorage` `sacra_quiz_state_v3` — renomear quebra restauração de sessão).
- Nunca recriar `external_id` — sempre `getOrCreateExternalId()` (`qs_<uuid>`, `localStorage rdp_external_id`).
- Não mudar `content_name: "Rotina de Paz"` do InitiateCheckout (o `eventID ic_<eid>_rotina_de_paz` deriva do slug dele — muda o texto, quebra dedup).
- **Não adicionar** Pixel de `Purchase` no cliente (Purchase é 100% CAPI server, `event_id=sale_id`; duplicaria).
- Não mexer no gate de hostname (`rotinadepaz.com.br`).
- O `value` do IC = `mainPriceCents/100` (do pai). Se a oferta exibir preço, use a **prop** `priceCents` — não hardcode, senão o `value` diverge do mostrado.

**VSL (novo):** `fbq('trackCustom','VSLProgress',{percent})` nos marcos 25/50/75/100, **atrás do gate de hostname**, 1× por marco (Set de refs). **Sem GTM/dataLayer** (o design usa `dataLayer.push` — remova, use só `fbq`). Prefira callbacks nativos do player (VTurb/Panda) ao polling de `<video>`. Para aparecer no funil do admin precisaria `track_quiz_step("vsl_*")`, MAS o CHECK de `quiz_funnel_events.stage` rejeita `vsl_*` silenciosamente → **confirme o CHECK real em PROD antes** (repo em drift); só amplie via Management API se o dono quiser VSL no admin.

---

## FASE 1 — TELA A (Apresentação / Resultado) — substitui `ResultScreen.tsx`
Componente React "stories" de **5 cenas** (fonte: `Apresentação Sacra.dc.html`), fidelidade 1:1:
- **Cena 0 Revelação** (fundo `luz-dourada.jpg`, Ken Burns): kicker "ROTINA DE PAZ" → selo "100%" (respira) → "DIAGNÓSTICO CONCLUÍDO · SEU PADRÃO É" → `archetype.name` → `tagline` → "VOCÊ SE RECONHECE?" + `neurofe.dores[]` → `neurofe.espelho` → botão "CONTINUAR ▸".
- **Cena 1 Verdade** (roxo radial): "A VERDADE QUE VOCÊ PRECISA OUVIR" → `verdadeTitulo1` + `verdadeTitulo2` (dourado) → `verdadeCorpo` (HTML) → box versículo (`versiculoRef` upper + `versiculo`) → `versiculoNota1`/`2` → botão.
- **Cena 2 Mecanismo (Neurofé)**: "O SINAL CERTO SILENCIA O GRITO" → 3 `neurofe.boxes[]` (Corpo/Mente/Espírito, com fio de luz `circuit`) → "Tem um nome pra isso: Neurofé." → botão.
- **Cena 3 Imagine** (fundo `descanso.jpg`, Ken Burns): `neurofe.mudaTitulo` → `neurofe.mudaCorpo` animado **palavra-a-palavra** (remover `<b>` na animação) → botão. **CTA label = `DESIRE_CTA[desire]`**.
- **Cena 4 CTA** (creme, glow): imagem `jaqueline.png` → `neurofe.proximoPasso` (HTML) → **link/botão que chama `onContinue`** (label por desejo) → "Leva 3 minutos · Sem compromisso".

**Animações a portar (rodar em `useEffect`/rAF, não no runtime do protótipo):** canvas de partículas (46 douradas + ~18% roxas, twinkle/drift, `devicePixelRatio`); transição de cenas WAAPI (saída fade+scale(1→1.04)+blur / entrada fade+scale(.97→1)+de-blur); cascata `data-anim` (translateY 30px + blur, delay 250+i·220ms, `cubic-bezier(.22,.8,.3,1)`); palavra-a-palavra (60ms); fio de luz `circuit` (altura); barra de progresso de stories (5 segmentos); Ken Burns; keyframes `breathe/ringSpin/shine/ctaGlow/btnPulse`. Navegação: →/Espaço avança, ← volta, clique em `[data-next]`. **Descartar** o "kick" manual de WAAPI (`anim()`/`kickCss()`) — desnecessário em React.

## FASE 2 — TELA B (Como Funciona / Oferta) — substitui `OfferScreen`
Página de scroll (fonte: `Como Funciona.dc.html`), coluna `max-width:640px`, fundo creme, blocos revelam via IntersectionObserver:
1. Cabeçalho (logo + "Jaqueline · online agora").
2. Abertura: H1 "Como a Neurofé desliga o alarme no seu padrão *`archetype.name`*".
3. **VSL slot**: container aspect 9/13; embed VTurb/Panda substitui o placeholder; disparar `VSLProgress` (ver regras de tracking). **Isso remove o caminho de áudio `NarrationCaption`/`@/data/narration`** — pode virar código morto (remover depois).
4. Método: usar `NEUROFE_OFFER.metodo` (já compliant) + box "ROMANOS 12:2".
5. O que recebe: parágrafo + `entregas[]` (global; 5 itens).
6. Volumes (carrossel scroll-snap-x + dots): `NEUROFE_OFFER.volumes` ("Renovação da Mente"/"Selagem Profunda").
7. Bônus (card roxo, `bonus-louvores.png`).
8. **Oferta** (card premium): preço "por" = `priceCents` (prop, DB); âncora = `NEUROFE_OFFER.anchorCents`; parcelas = `10× de R$5,60`; value stack = `NEUROFE_OFFER.valueStack`; **escassez** (turma 100 / vagas 37 / barra 0→63%).
9. Desejo: "Você lembra do seu desejo: *`DESIRE_QUOTE[desire]`*."
10. Honestidade: `archetype.esperar`/`archetype.naoEsperar` (já existem).
11. Garantia (card + selo SVG): **15 dias** (`NEUROFE_OFFER.guaranteeDays`).
12. App/avatar (`jaqueline-app.png`) + CTA.
13. Rodapé.

**CTAs (todos):** chamar **`onCheckout`** (prop). Label por `DESIRE_CTA[desire]`. **Limpar `chapters[]`** (compliance) se forem renderizados aqui.

## FASE 3 — Fiação + Verificação + PREVIEW
- **Matriz de teste:** 4 arquétipos × 4 desejos (`dormir`/`descansar`/`orar`/`parar-pior`). Para cada: resultado renderiza a copy certa, `onContinue`→oferta, `onCheckout`→redirect com `src=external_id`+utms.
- **Tracking (Meta Test Events + funil admin):** confirmar `trackStep result/offer/cta`, `InitiateCheckout` (`ic_<eid>_rotina_de_paz`, value = preço DB), `VSLProgress` 25/50/75/100. `external_id` estável entre quiz e checkout.
- **Cuidados de UI:** sticky CTA `z-50` (resultado) vs CTA fixo mobile `z-40` (oferta) — evitar colisão. `arche` pode ser `null` (mantenha o gate). `scrollTo(top)` no pai já cuida do scroll de entrada.
- **Deploy:** build local → `~/rotina-de-paz/deploy.sh` (SEM `--prod`, preview `*.pages.dev`) → validar tracking ao vivo → só então `deploy.sh --prod`.

## ASSETS
`~/Downloads/design_handoff_rotina_de_paz/src/assets/*` → `~/Quiz-sacra/src/assets/` (otimizar p/ webp). **NÃO portar** `support.js`/`image-slot.js`. Fontes: Cormorant Garamond (títulos/preço/versículos) + Montserrat (corpo) — já devem estar carregadas ou adicionar. VSL: **falta o código do embed real** (VTurb/Panda) — pedir ao dono antes de fiar o `VSLProgress`.

## GUARDRAILS (segurança)
- Trabalhe incremental; a Fase 0 já é dado dormente. Nada quebra até você fiar as props.
- **Não commitar nem deployar sem o dono pedir.** Se on `main`, criar branch antes.
- Não rodar `db push`; não tocar as 7 perguntas/captura; não adicionar Pixel de Purchase.
- Hook do repo pode exigir "fatos" antes do 1º Bash/Edit — apresente e siga.
- Ao terminar cada fase, rode `npx tsc --noEmit` (verde) e reporte diff enxuto.
