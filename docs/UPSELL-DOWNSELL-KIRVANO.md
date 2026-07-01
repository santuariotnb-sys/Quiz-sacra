# Upsell & Downsell — One-Click Kirvano (Rotina de Paz)

> Como o funil pós-compra está estruturado e configurado. Documenta a arquitetura,
> a config na Kirvano e os bugs que custaram caro pra descobrir — **leia antes de mexer**.

## Visão geral

O funil pós-compra usa o **one-click da Kirvano** (`upsell.min.js`) embutido na nossa SPA
(TanStack/React, deploy Cloudflare em `rotinadepaz.com.br/sacra`). O cliente compra o
principal, é redirecionado pra a página de upsell, e pode aceitar/recusar ofertas num
**modal de pagamento da Kirvano** (baixa fricção, sem sair da página).

```
Quiz → Checkout principal (Rotina de Paz, R$47, offer 0b6125dc)
   └─ aprovado → /sacra/obrigado?offer=upsell   (A Chave da Gratidão, R$67, offer ca518c06)
        ├─ ACEITA  → modal one-click → app
        └─ RECUSA  → /sacra/obrigado?offer=downsell  (Chave da Gratidão, R$37, offer e6fd35f3)
             ├─ ACEITA → modal one-click → app
             └─ RECUSA → app (/login)
```

UUIDs das ofertas (em `Quiz-sacra/.env`):
- `VITE_KIRVANO_URL`          → `0b6125dc...` (principal R$47)
- `VITE_KIRVANO_UPSELL_URL`   → `ca518c06...` (upsell R$67)
- `VITE_KIRVANO_DOWNSELL_URL` → `e6fd35f3...` (downsell R$37)

## Estrutura técnica (código)

Arquivo central: `src/components/funil/OfferPage.tsx` (usado por `src/routes/obrigado.tsx`
para upsell e downsell via `?offer=`).

Cada página seta as variáveis globais que o `upsell.min.js` lê (equivale aos "scripts por
oferta" que a Kirvano gera) e carrega o script:

```js
window.offer        = content.checkoutUrl.split("/").pop();  // ca518c06 (upsell) | e6fd35f3 (downsell)
window.nextPageURL  = "https://rotina-de-paz-app.vercel.app/app";   // ao ACEITAR
window.refusePageURL = declineTo;   // upsell → downsell ; downsell → app
```

- **Botão comprar**: `<button class="kirvano-payment-trigger">` → o `upsell.min.js` abre o modal.
- **Botão recusar**: `<button class="kirvano-refuse-trigger">` → o `upsell.min.js` navega pro `refusePageURL`.
- O script é injetado **só quando os 2 botões já existem no DOM** (MutationObserver).

## ⚠️ Bugs descobertos (NÃO reintroduzir)

1. **Token `kirvano_upsell` com `+` quebrava tudo.** O token é base64 na URL e pode conter
   `+`. A Kirvano coloca o `+` **literal**, e o `URLSearchParams` converte `+` → espaço →
   o `atob()` do script falha (*"string not correctly encoded"*) → **crasha o script → botões mortos**.
   **Fix:** no `OfferPage`, antes de carregar o script, reverter espaço→`+` e reescrever a URL.

2. **Checkout em iframe é BLOQUEADO.** A Kirvano usa CSP `frame-ancestors pay.kirvano.com` —
   não dá pra embutir `pay.kirvano.com` em iframe no nosso site. **Não usar CheckoutModal/iframe.**

3. **`offer` duplicado no recusar.** O `upsell.min.js` copia os params atuais (`offer=upsell`)
   e anexa ao `refusePageURL` (`offer=downsell`) → URL com `offer` duplicado (array no router).
   **Fix:** o `validateSearch` em `obrigado.tsx` trata array — se contém `downsell`, é downsell.

4. **`whileTap`/framer-motion nos botões** interceptava o toque no mobile antes do `click`.
   **Fix:** botões são `<button>` estáticos (sem `motion.button`/`whileTap`).

5. **Carregar o script cedo demais** (antes dos botões montarem) deixava o `querySelectorAll`
   vazio → listeners não anexados. **Fix:** MutationObserver espera os 2 botões.

6. **Token one-click é de USO ÚNICO por pedido — não dá pra re-testar com link velho.**
   O `kirvano_upsell` (base64 na URL) carrega o `s` = id do pedido original. Depois que o
   pedido é finalizado/pago, aquela sessão one-click está **gasta**: clicar "aceitar" (cartão
   OU PIX) só te joga na `pay.kirvano.com/order/<s>` do pedido concluído — **sem cobrar**.
   Isso parece "botão morto no mobile", mas **não é bug**: é token consumido. **Sintoma
   diagnóstico:** no `list_network_requests` o handler da Kirvano DISPARA (re-fetch de
   `pay-api/installments` + `/offer/v2` + pixel `SubscribedButtonClick`), mas nenhum modal
   renderiza. **Como testar de verdade:** compra NOVA ponta-a-ponta (cada pedido gera 1 token
   fresco). Provado 01/jul: com token fresco, **cartão abre modal e PIX gera o QR certinho**
   no mobile. (Perdemos uma sessão inteira caçando "bug mobile" que era token gasto.)

## Config na Kirvano (painel)

**Produto: Rotina de Paz → Upsell, Downsell e mais**

1. **Oferta principal (0b6125dc) → Editar oferta:**
   - Back Redirect: **DESLIGADO**
   - "Ir para outra página após aprovado": **LIGADO** → `https://rotinadepaz.com.br/sacra/obrigado?offer=upsell`

2. **Estratégia Upsell** (produto: A Chave da Gratidão, oferta upsell R$67):
   - Se **recusar** → Nova oferta → `https://rotinadepaz.com.br/sacra/obrigado?offer=downsell`

3. **Estratégia Downsell** (Chave da Gratidão, oferta downsell R$37):
   - Se **recusar** → app/login

> O script gerado pela Kirvano (por estratégia) é a referência das variáveis `offer`,
> `nextPageURL`, `refusePageURL` — o código replica esses valores por oferta.

## 💳 PIX vs Cartão no one-click (importante)

- **Cartão**: o modal one-click **cobra na hora** — funciona perfeitamente.
- **PIX**: o `upsell.min.js` tem um branch `if(paymentMethod==="PIX" && nextPageURL)` que
  **navega pro `nextPageURL` levando o PIX pendente, SEM gerar o QR**. Com `nextPageURL` =
  URL externa (`/app`), o PIX se perde (vai pro app sem cobrar).
  - **Para o PIX gerar o QR no one-click**, a estratégia deve ser **"Caso aceite → Página de
    obrigado"** (não "Nova oferta → URL externa") — aí o `nextPageURL` aponta pra a finalização
    da própria Kirvano, que gera o QR.
  - Alternativa (mais fricção, sempre funciona): redirect full-page pro checkout da oferta.

## Tracking

- **Purchase**: server-side via **Meta CAPI** no webhook (`rotina-de-paz-app/src/lib/admin/meta-capi.server.ts`),
  `event_id = sale_id`. **Não** disparar Purchase pixel no client (evita dupla contagem).
- **InitiateCheckout**: client, no clique de comprar (`trackInitiateCheckout`), por etapa.
- **external_id**: viaja como `?src=` pro Kirvano e volta em `utm.src` no webhook → cruza com
  `tracking_sessions` (fbp/fbc/ip) pra alimentar o CAPI.
