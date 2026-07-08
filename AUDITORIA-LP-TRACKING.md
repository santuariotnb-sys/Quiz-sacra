# AUDITORIA LP TRACKING — Quiz-sacra + CAPI
**Data:** 2026-06-16 | **Status:** Completa + Fix aplicado + CP1 provado

---

## Resumo executivo

A auditoria investigou 3 alertas Meta ativos: fbc lowercased (3% Purchase), preços iguais (ROAS), e EMQ baixo nos eventos de topo. Descobriu um bug crítico não previsto (tracking_session perdida em 82% das compras reais) e corrigiu.

### Resultado por alerta

| Alerta Meta | Causa raiz | Status |
|-------------|-----------|--------|
| fbc lowercased (3%) | **NÃO é lowercase.** CAPI server construía fbc com `Date.now()` do webhook (timestamp errado) quando tracking_session faltava — Meta classifica como "fbc modificado" | Fix aplicado: sessão agora existe → fallback raramente acionado |
| Preços iguais (ROAS) | Pixel Kirvano antigo (valor constante), não o CAPI | Resolve sozinho na janela (pixel desligado, CAPI manda valor real) |
| EMQ 6.1 no topo | PageView/QuizStep não têm Advanced Matching | Esperado — sem fix necessário agora |

---

## Bug crítico descoberto: tracking_session não era salva (82% de perda)

### Antes do fix
- `saveTrackingSession` era fire-and-forget no CTA (`void ... .catch(() => {})`)
- O redirect para Kirvano/Sacra acontecia ~300ms depois, antes do Supabase RPC completar em mobile
- **0/8 compras reais** tinham tracking_session no banco (só 2 testes de desktop tinham)
- CAPI operava sem fbp, fbc, user_agent para todas as compras reais

### Fix aplicado (commit `caa3a2f`)
Duas camadas, zero bloqueio no redirect:

1. **Mount da LP** (`useEffect([], [])`) — `saveTrackingSession()` fire-and-forget no load. Quando o usuário chega no CTA (minutos depois), já está no banco.
2. **CTA** — `sendTrackingBeacon()` via `fetch keepalive:true`. Sobrevive ao redirect, enriquece fbp via COALESCE.

**Nenhum await novo no caminho do redirect.** A venda nunca é bloqueada.

### CP1 provado — compra mobile

| Campo | Antes (0/8 reais) | Depois (teste mobile iPhone) |
|-------|-------------------|------------------------------|
| fbc | null | `fb.1.1781626571048.TESTE_MOBILE_CP1` ✅ |
| fbp | null | `fb.2.1779535186572.660723250391705057` ✅ |
| fbclid | null | `TESTE_MOBILE_CP1` ✅ |
| user_agent | null | `iPhone; CPU iPhone OS 18_7...Safari/604.1` ✅ |
| client_ip | null | Coberto pelo `payload.ip` do Kirvano (IPv6) ✅ |

---

## Auditoria detalhada por bloco

### BLOCO 1 — fbc lowercase (hipótese dos 3%)

**Veredicto: LP e CAPI estão LIMPOS. Nenhum toLowerCase toca fbc/fbclid.**

Varredura completa do Quiz-sacra — 3 usos de `.toLowerCase()`, nenhum no fbc:
- `tracking.ts:146` — normaliza `contentName` para eventID scope
- `QuizApp.tsx:485` — normaliza `email` para Advanced Matching
- `send-quiz-result/index.ts:204` — normaliza `email`

Captura do fbc na LP:
- `captureMetaClickData()` chamada no mount (`QuizApp.tsx:195-198`) ✅ regra Meta #2
- `params.get("fbclid")` preserva caixa exata (`tracking.ts:62`) ✅ regra Meta #1
- `readFbCookies()` lê via regex sem transformação (`tracking.ts:29-30`) ✅
- CAPI: `user_data.fbc = fbc` sem transformação (`meta-capi.server.ts:144`) ✅

Prova no banco: 9 tracking_sessions com fbc — ZERO com caixa alterada.

**Causa real dos 3%:** `meta-capi.server.ts:132` constrói `fb.1.${Date.now()}.${fbclid}` com timestamp do webhook (horas/dias após o clique) quando tracking_session não existe. Meta classifica como "fbc modificado". Com o fix de tracking_session, esse fallback raramente será acionado.

**Kirvano faz lowercase?** Inconclusivo (não há tracking_session anterior para comparar), mas os fbclid da Kirvano têm mixed case (`PAZXh0bg...`, 159 chars) — provavelmente não.

### BLOCO 2 — Eventos de topo + EMQ

| Evento | Arquivo:Linha | Params de match | eventID | fbc/fbp | EMQ |
|--------|--------------|-----------------|---------|---------|-----|
| PageView | `index.html:19-20` | Nenhum | NÃO | NÃO | 6.1 |
| QuizStep | `QuizApp.tsx:304` | Nenhum | NÃO | NÃO | 6.1 |
| Lead | `QuizApp.tsx:484-493` | em, ph, external_id | SIM | Via AM re-init | 7.2 |
| InitiateCheckout | `tracking.ts:160` | content_name, value | SIM | NÃO | ? |
| Purchase | `meta-capi.server.ts:159` | em, ph, fn, ln, fbp, fbc, ip, ua, ext_id | SIM | SIM | 8.2 |
| ViewContent | **NÃO EXISTE** | — | — | — | — |

- EMQ 6.1 no topo é esperado (zero match params manuais)
- ViewContent não é disparado pela LP — se aparece no Events Manager, vem de outra fonte
- Lead `ph` manda `55${digits}` sem `+` (marginal)
- content_ids padronizado: `["rotina-de-paz"]` no IC e Purchase
- Sem violação de hash-once ✅

### BLOCO 3 — Valor / ROAS

| Verificação | Resultado |
|------------|-----------|
| CAPI manda valor real | SIM — `parseBRL(payload?.total_price)` (`meta-capi.server.ts:136`) |
| Valores variam por venda | SIM — R$47, R$59.90, R$66.90, R$67, R$95.70 |
| Alerta "preços iguais" | Pixel Kirvano antigo (valor constante) — não é o CAPI |
| Upsell payload | `total_price` no topo, mesma estrutura do principal |
| Bug R$67 vs R$37 (downsell) | Corrigido por `extractPaidTotalCents` (`kirvano.server.ts:119-133`) |

**Ressalva:** `parseBRL` (CAPI) e `extractPaidTotalCents` (kirvano) são lógicas paralelas — podem divergir se uma for atualizada sem a outra.

---

## Vendas reais — período auditado (08-16/jun)

8 compradores, 19 itens, **R$619,40** bruto, ticket médio R$77,43/comprador.

| Comprador | Data | Produtos | Total | Campanha | Criativo | Placement |
|-----------|------|----------|-------|----------|----------|-----------|
| profejuliveras | 16/jun | Principal + Upsell | R$114 | RDP_ESCALA_kintsugi CBO | kintsugi_R1 | FB Instream Video |
| marycdp92 | 12/jun | Principal + Bump | R$63,90 | RDP_TESTE_kintsugi 1-1-1 | kintsugi_R1 | IG Feed |
| sccc33 | 11/jun | Principal + 3 Bumps + Upsell | R$169,70 | C1 DOR | mente-calibrada_R1 | IG Feed |
| anacaroline | 11/jun | Principal | R$47 | RDP_TESTE_kintsugi 1-1-1 | kintsugi_R1 | IG Feed |
| fabiolaamorim | 11/jun | Principal | R$47 | RDP_TESTE_Precisa-carregar | Precisa-carregar_R1 | IG Feed |
| tahiribnicoletti | 09/jun | Principal + Bump | R$63,90 | C4 OBJEÇÃO | Entreguei-a-Deus_R1 | IG Feed |
| celiaborim | 08/jun | Principal + Bump | R$66,90 | C4 OBJEÇÃO | Entreguei-a-Deus_R1 | IG Stories |
| dra.lucianasobral | 08/jun | Principal | R$47 | C1 DOR | Pede-paz_R1 | IG Feed |

100% utm_source FB. 0% tinham tracking_session antes do fix.

---

## Recomendação: NÃO adotar Parameter Builder SDK

O SDK da Meta não resolve nosso problema (tracking_session perdida). Já estamos em EMQ 8.2 no Purchase com código manual. O "+0,7 EMQ" do doc é média de quem não mandava fbc — ganho real pra nós seria mínimo.

Cumprir as regras manualmente (4 itens restantes, por prioridade):

1. ✅ **FEITO** — tracking_session no mount + beacon keepalive (commit `caa3a2f`)
2. ⏳ `meta-capi.server.ts:132` — `Date.now()` no webhook → usar timestamp da tracking_session (perde importância com o fix 1, pois fallback raramente acionado)
3. ⏳ `QuizApp.tsx:482` — `ph` deveria ser `+55${digits}` (E.164 com `+`)
4. ⏳ ViewContent — decidir se deve existir na página de resultado/oferta

---

## Resultados confirmados no Events Manager (16/jun)

| Evento | Antes | Depois | Fonte | EMQ |
|--------|-------|--------|-------|-----|
| Purchase | 1 | **3** | API de Conversões | **8.4** ↑ |
| PageView | 49 | 57 | Várias | 6.1 |
| QuizStep | 42 | 56 | Várias | 6.1 |
| Lead | 4 | 6 | Várias | 7.2 |
| InitiateCheckout | 2 | 4 | Várias | 6.8 |

- ✅ **EMQ subiu: 8.2 → 8.4** — eventos com fbc/fbp/IP/ua da tracking_session estão casando forte
- ✅ **Dedup limpo** — Purchase = "API de Conversões" (fonte única), sem duplicata da Kirvano
- ✅ **Downsell R$37 entrou** — valor correto no CAPI, bug histórico R$67 não se repetiu
- ✅ **Painel destravou** — todos os eventos atualizaram junto (era lag global, não problema isolado)

**Nota:** EMQ 8.4 mede qualidade dos dados de match (forte ✅). Atribuição real (ligar venda ao clique do anúncio) se confirma na próxima venda orgânica com fbclid real.

## O que acompanhar

- [ ] **Primeira venda orgânica com fbclid real** — confirma atribuição end-to-end
- [ ] **Alerta fbc "modificado"** — deve cair nos próximos dias (tracking_session agora existe)
- [ ] **Alerta "preços iguais"** — resolve na janela (pixel Kirvano desligado, CAPI manda valor real)
- [ ] **tracking_sessions preenchidas** — monitorar que compras reais mantêm fbc+fbp+ua (não mais 0%)

---

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `Quiz-sacra/src/lib/tracking.ts` | Nova `sendTrackingBeacon()` com fetch keepalive; doc atualizado |
| `Quiz-sacra/src/components/quiz/QuizApp.tsx` | Mount: `saveTrackingSession` no load; CTA: `sendTrackingBeacon` |
| `Quiz-sacra/src/components/funil/OfferPage.tsx` | CTA: `sendTrackingBeacon` em vez de fire-and-forget |

## Validação cruzada

3 agentes independentes auditaram as conclusões em paralelo:
- **Auditor fbc:** 7/7 conclusões confirmadas
- **Auditor eventos+valor:** 9/9 confirmadas + 1 ressalva (parseBRL vs extractPaidTotalCents paralelos)
- **Auditor Kirvano:** revelou que 82% das sessões não existiam no banco (bug crítico)
