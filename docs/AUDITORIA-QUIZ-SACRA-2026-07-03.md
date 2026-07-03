# Auditoria + Fix — Quiz Sacra · Telas A/B (Resultado/Oferta Neurofé)

**Data:** 2026-07-03 · **Branch:** `fix/telas-ab-responsivo-a11y` (a partir de `feat/resultado-oferta-neurofe` / `86f703e`)
**Escopo desta sessão:** só o Quiz (`~/Quiz-sacra`), Telas A (`ResultScreen`) e B (`OfferScreen`).
Fixes **livres** aplicados (responsividade/a11y/cleanup React). **Tracking não foi tocado** (gated).

---

## Sumário executivo

1. **`prefers-reduced-motion` era ignorado nas maiores fontes de movimento** (achado ALTO, saúde do usuário).
   O bloco CSS existente (`styles.css:395`) já matava as animações CSS inline (`sa-*`) via `[style*="animation"]`,
   **mas não cobria** (a) o canvas de partículas (rAF em JS), (b) as transições de cena WAAPI (scale+blur full-screen),
   nem (c) as transições inline `transition:` dos `Reveal`/`ScarcityBar`. Essas três são justamente as que causam
   mal-estar vestibular. **Corrigido** nas três frentes.
2. **Canvas de partículas nunca pausava** (bateria/CPU em mobile low-end): rodava rAF mesmo com a aba oculta.
   **Corrigido** com pausa em `visibilitychange`.
3. **`setTimeout` da transição de cena vazava no unmount** (setState após desmontar). **Corrigido** com `timeoutRef` + cleanup.

Sem mudança de contrato de props, de tracking (`onContinue`/`onCheckout`/`VSLProgress`) ou de layout para
usuários sem "reduzir movimento". `tsc --noEmit` = 0. `vite build` = sucesso.

---

## Fixes aplicados (antes → depois)

| # | Área | Arquivo:linha | Antes | Depois |
|---|------|---------------|-------|--------|
| 1 | a11y / reduced-motion | `styles.css:401` (bloco `@media reduce`) | só `[style*="animation"]` neutralizado | + `[style*="transition"] { transition: none !important }` → mata as transições inline de `Reveal`/`ScarcityBar`/VSL/dots |
| 2 | a11y / reduced-motion | `ResultScreen.tsx` — `prefersReducedMotion()` helper + guarda no `useEffect` de entrada de cena | cena entrava sempre com WAAPI scale(.97)+blur(8px) | reduced-motion → estado final direto (opacity 1, sem blur/scale), `return` antes do `el.animate` |
| 3 | a11y / reduced-motion | `ResultScreen.tsx` — `go()` | transição de saída sempre com scale(1.04)+blur(6px), delay 380ms | reduced-motion → sem WAAPI, troca imediata (delay 0) |
| 4 | a11y / reduced-motion | `ResultScreen.tsx` — `useEffect` das partículas | rAF sempre ligado | reduced-motion → `return` cedo (sem partículas animadas) |
| 5 | perf / bateria | `ResultScreen.tsx` — partículas | rAF nunca pausava | pausa em `visibilitychange` (cancela quando `document.hidden`, retoma ao voltar) |
| 6 | React / leak | `ResultScreen.tsx` — `go()` + `timeoutRef` | `window.setTimeout` sem cleanup → setState após unmount | `timeoutRef` + `useEffect` de cleanup no unmount |
| 7 | a11y / reduced-motion | `OfferScreen.tsx` — `goTo()` do carrossel | `scrollTo({behavior:"smooth"})` sempre | `behavior: reduced ? "auto" : "smooth"` |

Diff: 3 arquivos, +77/−12.

---

## Verificado ao vivo vs só no código (honesto)

- **`tsc --noEmit`**: exit **0** ✅ (verificado).
- **`vite build`**: **sucesso** ✅ (verificado; bundle `QuizApp` 102.94 KB / gzip 31.10 KB — sem regressão de tamanho).
- **Emulação de `prefers-reduced-motion` no browser**: **NÃO executada ao vivo** ⚠️.
  Motivo honesto: as ferramentas de browser desta sessão (chrome-devtools MCP e preview MCP) estão escopadas ao
  diretório da sessão (`/projects/rotina-de-paz-app`), não a `~/Quiz-sacra`; o chrome-devtools estava com o perfil
  travado por outra instância; e o Playwright não está instalado no repo. A lógica de reduced-motion é determinística
  e foi validada por análise de caminho de código, não por observação ao vivo.
- **Passe manual recomendado** (5 min): DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion:
  reduce" → abrir `/sacra/?preview=sobrecarga&stage=result`. Esperado: **sem partículas**, cenas aparecem **sem
  blur/scale**, navegação instantânea; e `/sacra/?preview=sobrecarga&stage=offer` revela blocos **sem** fade/slide.

---

## Achados NÃO corrigidos (fora do escopo livre / precisam de OK ou device real)

### Tracking (GATED — só reportado, nada alterado)
- `OfferScreen.VslSlot` dispara `fbq('trackCustom','VSLProgress',{percent})` em 25/50/75/100 atrás do gate de hostname.
  **Confirmar ao vivo** no Meta Test Events (não observado nesta sessão) e que NÃO chama `track_quiz_step("vsl_*")`.
- Continuidade `external_id` `qs_…` do Lead → IC → redirect `?src=` → Purchase (CAPI): auditar ponta-a-ponta no app
  raiz `~/rotina-de-paz` (alerta do prompt: `.env.production` ausente → pixel EMPTY na LP). **Não auditado** aqui.
- Preço data-driven (`priceCents` do DB) vs preço exibido na Tela B: a Tela B mostra `R${priceReais}` de `priceCents`,
  mas as **parcelas/âncora** vêm de `NEUROFE_OFFER` (hardcode do design), não da prop. Revisar se âncora/parcelas
  devem sair do DB para não divergir do `value` do IC/Purchase.

### Responsividade (precisa de device físico/BrowserStack — não apliquei às cegas)
- Botão "voltar" (`ResultScreen.tsx:437`, top-left) pode encostar na barra de progresso em larguras ~320px. Verificar.
- Cenas com `overflowY:auto` + CTA `position:absolute bottom:0`: confirmar em iOS Safari com barra de endereço dinâmica
  e em landscape.

### A11y (não-movimento — menor, não aplicado)
- Dots do carrossel e da barra de stories são `<span onClick>`: sem role/tabindex/teclado. Sugerir `<button>`.

---

## Estado
Branch `fix/telas-ab-responsivo-a11y` local, **não commitada, não deployada** (aguardando revisão do dono).
