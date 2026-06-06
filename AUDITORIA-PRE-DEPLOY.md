# Auditoria Pré-Deploy — Commit 8a238bb

Data: 2026-05-31 | Branch: fix/preco-47

---

## 1. Inventário do Commit

| Arquivo | +/- | O que mudou |
|---------|-----|-------------|
| `src/components/quiz/QuizApp.tsx` | +663 / -245 | **Preço** (67→47, âncora 197→129, parcela 10×5,60, value:47 no InitiateCheckout) + **trabalho pré-existente**: redesign completo do ResultScreen (reveal-on-scroll, card escuro, tabs yes/no), remoção do BridgeScreen, NarrationCaption word-by-word com áudio, persistência de sessão (sessionStorage), preview por URL (?preview=), CTA fixo mobile, botão "Voltar", micro-CTA, mockup do produto, bônus com imagem, risk_flag no Supabase, scroll-to-top ao trocar stage, ajuste de timings de transição |
| `src/components/funil/OfferPage.tsx` | +16 / -6 | **Preço** (comentário value=67→47) + import do mockup chave-gratidao-mockup.webp, imagem no OfferCard, ajuste visual do TopBanner (gradiente mais vivo, ícone maior, animação mais rápida) |
| `src/data/funil.ts` | +3 / -1 | **Preço** (comentário R$67→R$47) + bullet "Devocional com Oração de fé" adicionado no upsell E no downsell |

---

## 2. Auditoria de Preço

### Ocorrências do preço ANTIGO (R$67 / 5,59 / R$197) no src/

| Arquivo | Linha | Conteúdo | Produto | Veredicto |
|---------|-------|----------|---------|-----------|
| `funil.ts:101` | `price: "R$ 67"` | Chave da Gratidão (upsell) | Outro produto | CORRETO — não muda |
| `funil.ts:158` | `priceFrom: "R$ 67"` | Chave da Gratidão (downsell, âncora) | Outro produto | CORRETO — não muda |

**Nenhuma ocorrência de R$67, 5,59 ou R$197 do produto Rotina de Paz restou. LIMPO.**

### Ocorrências do preço NOVO (R$47 / 5,60 / R$129)

| Arquivo | Linha | Conteúdo | Consistente? |
|---------|-------|----------|--------------|
| `QuizApp.tsx:1289` | `De R$ 129,00` (âncora) | SIM |
| `QuizApp.tsx:1292` | `47` (display grande) | SIM |
| `QuizApp.tsx:1296` | `10× de R$ 5,60` (parcela) | SIM |
| `QuizApp.tsx:1354` | `R$ 47` + `10× R$ 5,60` (CTA mobile) | SIM |
| `QuizApp.tsx:267` | `value: 47` (InitiateCheckout) | SIM |
| `funil.ts:54` | comentário `(R$47)` | SIM |

**Preço consistente em todos os pontos. Zero divergência.**

---

## 3. Auditoria de Tracking / Pixel

### Evento: InitiateCheckout (quiz principal)

- **Disparado por:** clique no CTA de checkout (`QuizApp.tsx:261-269`)
- **Trigger:** `checkout()` → `trackInitiateCheckout(externalId, { contentName: "Rotina de Paz", value: 47 })`
- **eventID:** `ic_{external_id}` (dedup consistente)
- **value:** 47 (NOVO — antes não enviava value nenhum)
- **Status:** COMPLETO. Sem TODO, sem placeholder, sem valor de teste.
- **Risco de duplicata:** Nenhum — dispara uma vez por clique, com redirect imediato após 300ms.

### Evento: InitiateCheckout (upsell/downsell)

- **Disparado por:** clique no CTA da OfferPage (`OfferPage.tsx:113-123`)
- **value:** `parseFloat(content.offer.price)` → 67 (upsell) ou 37 (downsell)
- **Status:** COMPLETO. Valores corretos para esses produtos (não mudaram).

### Evento: Purchase (pós-compra)

- **Disparado por:** mount da página /obrigado (`OfferPage.tsx:107-111`)
- **value:** lê `?value=` da URL (dinâmico, vem do Kirvano)
- **Dedup:** `transaction_id` + `sessionStorage` guard
- **Status:** COMPLETO. Não há valor hardcoded — depende exclusivamente do Kirvano.
- **Risco:** Se o Kirvano ainda estiver em R$67 quando deployar, o Purchase vai mandar value=67 enquanto o InitiateCheckout manda value=47. **Mismatch temporário até atualizar o Kirvano.**

### Tracking Sessions (Supabase)

- **Salva:** external_id, fbp, fbc, fbclid, user_agent
- **Não salva:** value/preço (correto — preço vem do webhook)
- **Status:** Sem alteração neste commit.

### Pixel ID

- Não há Pixel ID no código-fonte (carregado via tag externa ou GTM). Sem risco de ID de teste.

### Risco de atribuição errada no Meta

- **Risco BAIXO e temporário:** Se deployar o código antes de atualizar o Kirvano, haverá janela onde InitiateCheckout=47 mas Purchase=67. Solução: atualizar Kirvano ANTES ou ao mesmo tempo do deploy.

---

## 4. Build

- **tsc --noEmit:** PASSA (zero erros)
- **npm run build:** PASSA (built in 1.92s, sem warnings de tracking)
- Bundle principal: QuizApp 65.6KB gzipped 20.3KB

---

## 5. Trabalho extra no commit (não-preço)

O commit carrega trabalho pré-existente significativo:

| Feature | Risco | Nota |
|---------|-------|------|
| Redesign ResultScreen (reveal, card escuro, tabs) | BAIXO | Visual, não altera tracking |
| Remoção do BridgeScreen | MÉDIO | Mudança de fluxo — a bridge sumiu, result vai direto pra offer |
| NarrationCaption (word-by-word + áudio) | BAIXO | Feature nova, isolada |
| Persistência sessionStorage | BAIXO | Melhoria de UX, não afeta tracking |
| Preview por URL | NENHUM | Dev-only |
| risk_flag no Supabase | BAIXO | Bug fix — antes era sempre false |
| Bullet "Devocional" no upsell/downsell | NENHUM | Copy, não afeta preço/tracking |
| Mockup chave-gratidao no OfferCard | NENHUM | Visual |
| TopBanner gradiente mais vivo | NENHUM | Visual |

**Nenhum desses introduz risco de tracking ou preço.**

---

## 6. Veredicto

| Dimensão | Status | Detalhe |
|----------|--------|---------|
| Preço consistente? | SIM | R$47 / 10×R$5,60 / âncora R$129 em todos os pontos |
| Sobrou R$67 do produto principal? | NAO | Apenas upsell/downsell (correto) |
| Tracking completo e seguro? | SIM | InitiateCheckout agora envia value:47 (melhoria) |
| Risco de atribuição errada? | BAIXO | Temporário se Kirvano não for atualizado junto |
| Build passa? | SIM | tsc + vite sem erros |
| Pode deployar como está? | SIM | Desde que o Kirvano seja atualizado para R$47 antes ou ao mesmo tempo |

### Sequência recomendada

1. Atualizar preço no Kirvano → R$47
2. Deploy do código
3. Testar no quiz real (preço, parcela, checkout, pixel)
