# Auditoria de Preço — Quiz Sacra (R$67 → R$47)

Data: 2026-05-30 | Auditor: Claude | Status: FASE 1+2 (somente leitura)

---

## FASE 1 — AUDITORIA

### 1. Mapa de Arquitetura do Tracking

```
JORNADA DO USUÁRIO:
Quiz → Result → OfferScreen → CTA "Quero minha paz" → Kirvano checkout

PÓS-COMPRA (redirect Kirvano):
/obrigado?offer=upsell → OfferPage (upsell R$67)
                       ↓ (recusa)
/obrigado?offer=downsell → OfferPage (downsell R$37)
                       ↓ (recusa)
redirect → app login
```

#### Fluxo de eventos pixel + CAPI:

```
[1] Quiz OfferScreen → CTA clicado
    └─ trackInitiateCheckout()                    ← src/lib/tracking.ts:68
       ├─ eventID: "ic_{external_id}"
       ├─ content_name: "Rotina de Paz"
       ├─ currency: "BRL"
       ├─ value: NÃO ENVIADO (extras.value não é passado)  ⚠️
       └─ fbq("track", "InitiateCheckout", data, {eventID})

[2] Redirect → Kirvano checkout (externo, preço configurado no painel Kirvano)

[3] Pós-compra → /obrigado?offer=upsell
    └─ firePixelPurchase()                        ← src/components/funil/OfferPage.tsx:48
       ├─ eventID: transaction_id do Kirvano (query param) ou UUID
       ├─ dedup: sessionStorage "rdp_purchase_fired_{eventID}"
       ├─ value: lê de ?value= ou ?amount= da URL (Kirvano redirect)
       ├─ currency: "BRL"
       └─ fbq("track", "Purchase", data, {eventID})

[4] Upsell OfferPage → CTA "Sim, quero A Chave"
    └─ trackInitiateCheckout()                    ← src/components/funil/OfferPage.tsx:118
       ├─ eventID: "ic_{external_id}"
       ├─ value: parseFloat(content.offer.price)  → 67.0 (do funil.ts)
       └─ fbq("track", "InitiateCheckout", ...)

[5] Downsell OfferPage → CTA "Sim, quero por R$37"
    └─ trackInitiateCheckout()                    ← mesmo fluxo
       ├─ value: parseFloat(content.offer.price)  → 37.0 (do funil.ts)
       └─ fbq("track", "InitiateCheckout", ...)
```

**CAPI (server-side):** Não há CAPI implementado NESTE projeto. O tracking_sessions no Supabase (`src/lib/tracking.ts:41`) salva external_id + fbp/fbc/user_agent para cruzamento posterior em webhook externo (presumivelmente processado pelo projeto `rotina-de-paz` backend). O value/preço **não** é armazenado no tracking_sessions.

**Onde o preço entra em cada evento:**

| Evento | Onde o value é definido | Fonte |
|--------|------------------------|-------|
| InitiateCheckout (quiz principal) | **NÃO ENVIADO** — `extras.value` não é passado em `QuizApp.tsx:267` | — |
| InitiateCheckout (upsell/downsell) | `parseFloat(content.offer.price)` | `funil.ts` (hardcoded "R$ 67" / "R$ 37") |
| Purchase (pós-compra) | `?value=` da URL (Kirvano redirect) | Kirvano (externo) |

---

### 2. Inventário Completo de Ocorrências de Preço

#### 2.1 Produto principal (Rotina de Paz — R$67 → R$47)

| # | Arquivo | Linha | Contexto | Tipo |
|---|---------|-------|----------|------|
| 1 | `src/components/quiz/QuizApp.tsx` | 1289 | `De R$ 197,00` (âncora, line-through) | UI/copy |
| 2 | `src/components/quiz/QuizApp.tsx` | 1292 | `67` (preço grande, display) | UI/copy |
| 3 | `src/components/quiz/QuizApp.tsx` | 1296 | `12× de R$ 5,59` (parcela) | UI/copy |
| 4 | `src/components/quiz/QuizApp.tsx` | 1354 | `R$ 67` + `12× R$ 5,59` (CTA fixo mobile) | UI/copy |
| 5 | `src/components/quiz/QuizApp.tsx` | 267 | `trackInitiateCheckout(externalId, { contentName: "Rotina de Paz" })` — **sem value** | Tracking |

#### 2.2 Upsell (Chave da Gratidão — R$67, este NÃO muda)

| # | Arquivo | Linha | Contexto | Tipo |
|---|---------|-------|----------|------|
| 6 | `src/data/funil.ts` | 54 | Comentário: `// Upsell — após compra da Rotina de Paz (R$67)` | Comentário |
| 7 | `src/data/funil.ts` | 100 | `priceFrom: "R$ 197"` | UI/copy (âncora upsell) |
| 8 | `src/data/funil.ts` | 101 | `price: "R$ 67"` | UI/copy |
| 9 | `src/data/funil.ts` | 102 | `installments: "ou 6x de R$ 12,90 sem juros"` | UI/copy |
| 10 | `src/data/funil.ts` | 120 | `value: parseFloat(...)` → lê de `content.offer.price` ("R$ 67") | Tracking |

#### 2.3 Downsell (Chave da Gratidão — R$37, este NÃO muda)

| # | Arquivo | Linha | Contexto | Tipo |
|---|---------|-------|----------|------|
| 11 | `src/data/funil.ts` | 158 | `priceFrom: "R$ 67"` → âncora do downsell (era preço do upsell) | UI/copy |
| 12 | `src/data/funil.ts` | 159 | `price: "R$ 37"` | UI/copy |
| 13 | `src/data/funil.ts` | 160 | `installments: "ou 2x de R$ 19,50 sem juros"` | UI/copy |
| 14 | `src/data/funil.ts` | 161 | `ctaLabel: "Sim, quero A Chave da Gratidão por R$ 37"` | UI/copy |

#### 2.4 Purchase pixel (pós-compra)

| # | Arquivo | Linha | Contexto | Tipo |
|---|---------|-------|----------|------|
| 15 | `src/components/funil/OfferPage.tsx` | 43 | Comentário: `value=67.00` | Comentário |
| 16 | `src/components/funil/OfferPage.tsx` | 67 | `params.get("value")` — lê da URL, NÃO hardcoded | Tracking (dinâmico) |

#### 2.5 Docs/plans (não afetam produção)

| # | Arquivo | Linha | Contexto | Tipo |
|---|---------|-------|----------|------|
| 17 | `docs/plans/2026-05-29-funil-pos-compra.md` | 495 | `value: 67.0` | Doc/plan |

#### 2.6 narration.ts (falso positivo)

Os valores `67.12`, `67.28`, etc. em `src/data/narration.ts` são **timestamps de áudio em segundos**, não preços. Ignorar.

---

### 3. Mapa de Eventos de Conversão por CTA

| CTA / Botão | Localização | Evento disparado | Value | Hardcoded? |
|-------------|-------------|------------------|-------|------------|
| "Eu creio — quero minha paz" (OfferScreen principal) | `QuizApp.tsx:1227` | `InitiateCheckout` | **NENHUM** | N/A — value não enviado |
| "Quero minha paz →" (barra fixa mobile) | `QuizApp.tsx:1361` | `InitiateCheckout` (mesmo handler) | **NENHUM** | N/A |
| CTA resultado → oferta ("Ver oferta") | `QuizApp.tsx:315` | Nenhum evento | — | — |
| "Sim, quero A Chave da Gratidão" (upsell) | `OfferPage.tsx:592-613` | `InitiateCheckout` | `parseFloat("R$ 67")` = 67.0 | **SIM** — lê de string hardcoded em funil.ts |
| "Sim, quero A Chave da Gratidão por R$ 37" (downsell) | `OfferPage.tsx:592-613` | `InitiateCheckout` | `parseFloat("R$ 37")` = 37.0 | **SIM** — lê de string hardcoded em funil.ts |
| Página /obrigado (auto, on mount) | `OfferPage.tsx:107-111` | `Purchase` | `?value=` da URL | **NÃO** — dinâmico (Kirvano) |

---

### 4. Pontos Fortes e Frágeis do Tracking

#### Pontos fortes

- **Dedup do Purchase com eventID**: usa `transaction_id` do Kirvano + `sessionStorage` guard. Sólido.
- **external_id consistente**: `qs_` + UUID, persistido em localStorage, viaja como `src` param para Kirvano.
- **fbp/fbc capturados**: `readFbCookies()` lê os cookies do pixel e salva no Supabase para cruzamento CAPI no webhook.
- **Purchase value dinâmico**: vem do `?value=` que o Kirvano manda no redirect — não é hardcoded no código.
- **Tick de 300ms antes do redirect**: garante que o beacon do InitiateCheckout sai antes da navegação.

#### Pontos frágeis

| Risco | Severidade | Detalhe |
|-------|------------|---------|
| **InitiateCheckout do quiz principal NÃO envia value** | MÉDIO | `QuizApp.tsx:267` chama `trackInitiateCheckout` sem `value`. Meta recebe evento sem valor monetário → EMQ penalizado. |
| **Preços hardcoded como strings em múltiplos locais** | ALTO | "R$ 67", "12× de R$ 5,59", "R$ 197,00" espalhados em QuizApp.tsx e funil.ts. Mudança de preço exige caçar N ocorrências. |
| **Nenhuma constante PRICE centralizada** | ALTO | O preço vive como string de UI em vários lugares. Risco de mismatch se alguém esquece um. |
| **Value do InitiateCheckout (upsell) vem de parseFloat de string de UI** | MÉDIO | `parseFloat("R$ 67".replace(...))` → funciona, mas é frágil. Se a string mudar formato, parseFloat retorna NaN. |
| **Sem CAPI neste projeto** | INFO | O CAPI é feito externamente (webhook). O tracking_sessions não salva o value — se o webhook precisar do valor, depende exclusivamente do Kirvano. Não é um bug, mas é um ponto cego. |
| **Mismatch potencial browser vs CAPI** | BAIXO | Como Purchase value vem do `?value=` (Kirvano) e o CAPI do webhook também recebe do Kirvano, devem ser iguais. Mas se o preço mudar no Kirvano e não no código (ou vice-versa), o InitiateCheckout do upsell pode mandar 67 enquanto o Purchase manda 47. |

---

### 5. Recomendação de Fonte Única de Preço

**Não existe** uma constante centralizada de preço hoje. O preço está espalhado como strings de UI.

**Recomendação:** criar um arquivo `src/data/pricing.ts`:

```ts
export const PRICING = {
  rotinaDePaz: {
    full: 47,
    currency: "BRL" as const,
    installments: { count: 12, value: 3.92 }, // 47/12 = 3.9166...
    anchor: 197, // "De R$ 197"
    formatted: {
      full: "R$ 47",
      anchor: "R$ 197,00",
      installments: "12× de R$ 3,92",
    },
  },
  chaveGratidao: {
    upsell: {
      full: 67,
      currency: "BRL" as const,
      installments: { count: 6, value: 12.90 },
      anchor: 197,
    },
    downsell: {
      full: 37,
      currency: "BRL" as const,
      installments: { count: 2, value: 19.50 },
      anchor: 67, // era preço do upsell
    },
  },
} as const;
```

Todos os pontos (UI, pixel, funil.ts) importariam daqui. Próxima mudança de preço = 1 linha.

---

## FASE 2 — PLANO DE MUDANÇA (R$67 → R$47)

> **Escopo:** apenas o produto principal "Rotina de Paz". Upsell e downsell da Chave da Gratidão **NÃO mudam**.

### Checklist de Mudanças

#### A. UI/Copy — Preço e parcelas

Nova parcela: R$47 ÷ 12 = R$3,92 (ou verifique com o Kirvano se são 12× de R$4,68 com juros — depende da config da plataforma).

| # | Arquivo | Linha | De | Para | Tipo |
|---|---------|-------|----|------|------|
| 1 | `src/components/quiz/QuizApp.tsx` | 1289 | `De R$ 197,00` | **Decisão sua** (ver nota abaixo) | UI âncora |
| 2 | `src/components/quiz/QuizApp.tsx` | 1292 | `67` | `47` | UI preço display |
| 3 | `src/components/quiz/QuizApp.tsx` | 1296 | `12× de R$ 5,59` | `12× de R$ X,XX` (recalcular) | UI parcela |
| 4 | `src/components/quiz/QuizApp.tsx` | 1354 | `R$ 67` | `R$ 47` | UI CTA mobile |
| 5 | `src/components/quiz/QuizApp.tsx` | 1354 | `12× R$ 5,59` | `12× R$ X,XX` | UI CTA mobile parcela |

#### B. Tracking — Pixel events

| # | Arquivo | Linha | De | Para | Tipo |
|---|---------|-------|----|------|------|
| 6 | `src/components/quiz/QuizApp.tsx` | 267 | `trackInitiateCheckout(externalId, { contentName: "Rotina de Paz" })` | Adicionar `value: 47` | Tracking fix |

#### C. Funil pós-compra (ajustes de referência)

| # | Arquivo | Linha | De | Para | Tipo |
|---|---------|-------|----|------|------|
| 7 | `src/data/funil.ts` | 54 | `// após compra da Rotina de Paz (R$67)` | `// após compra da Rotina de Paz (R$47)` | Comentário |
| 8 | `src/components/funil/OfferPage.tsx` | 43 | `// value=67.00` | `// value=47.00` | Comentário |

#### D. Purchase pixel (NÃO precisa mudar)

O `firePixelPurchase()` lê `?value=` da URL (dinâmico do Kirvano). **Basta atualizar o preço no painel do Kirvano** e o valor correto já chega automaticamente. Sem mudança de código.

#### E. Checkout Kirvano (externo)

| # | Onde | De | Para |
|---|------|----|------|
| 9 | Painel Kirvano (produto Rotina de Paz) | R$67,00 | R$47,00 |

**Isso é externo ao código**, mas é o mais crítico — é o preço real cobrado.

#### F. Config/ENV

Nenhuma variável de ambiente contém o valor do preço. `.env` só tem URLs. **Sem mudança.**

---

### Decisões pendentes (para você)

1. **Âncora "De R$197"**: Mantém R$197 ou ajusta?
   - R$197 → R$47 = desconto de **76%** (agressivo mas crível se o valor percebido suporta)
   - Alternativa: "De R$97" → R$47 = desconto de **52%** (mais conservador)
   - Minha recomendação: se o R$197 já estava funcionando e tem justificativa (valor real do programa completo), manter.

2. **Parcela exata**: Preciso saber se o Kirvano calcula juros ou é sem juros.
   - Sem juros: 47/12 = R$3,92
   - Se o parcelamento não faz sentido em 12× (valor muito baixo por parcela), considerar 6× de R$7,83.

3. **Fonte única de preço**: Quer que eu crie o `pricing.ts` centralizado como parte da mudança, ou prefere só trocar os valores diretos por agora?

4. **InitiateCheckout sem value (item #6)**: Aproveitar e corrigir isso agora? É uma melhoria de EMQ independente da mudança de preço.

---

### Resumo: o que NÃO muda

- Upsell Chave da Gratidão (R$67) — produto diferente, preço se mantém
- Downsell Chave da Gratidão (R$37) — se mantém
- `firePixelPurchase()` — dinâmico, vem do Kirvano
- Variáveis de ambiente
- Tracking sessions (Supabase)
- narration.ts (timestamps, não preços)
