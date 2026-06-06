# Configuração correta do funil Kirvano — Rotina de Paz

> Análise dos prints (2026-06-05) + docs Kirvano + código. Define a config exata.
> Produto na Kirvano: `09494a43-e1e0-41d8-b3e0-7d8c6c54b1c1` (Rotina de Paz).

## Fluxo desejado

```
Quiz → Checkout principal (R$47, 0b6125dc)
  └─ aprovado → /sacra/obrigado?offer=upsell  (Chave da Gratidão R$67, ca518c06)
       ├─ ACEITA  → cobra R$67 → APP (login)
       └─ RECUSA  → /sacra/obrigado?offer=downsell  (Chave da Gratidão R$37, e6fd35f3)
            ├─ ACEITA → cobra R$37 → APP (login)
            └─ RECUSA → APP (login)
```

URLs canônicas:
- App: `https://rotina-de-paz-app.vercel.app/login`
- Upsell: `https://rotinadepaz.com.br/sacra/obrigado?offer=upsell`
- Downsell: `https://rotinadepaz.com.br/sacra/obrigado?offer=downsell`

---

## 🔴 BUGS encontrados nos prints

### BUG 1 (CRÍTICO) — oferta principal pula o upsell
Print "Editar oferta" (oferta principal):
- **Ir para outra página após aprovado** = `https://rotina-de-paz-app.vercel.app/login` ❌

Após pagar o principal, o cliente vai **direto pro app** e **nunca vê o upsell**.
É a causa real do "não direcionou pro upsell" (vale pra PIX **e** cartão).

**Correto:** `https://rotinadepaz.com.br/sacra/obrigado?offer=upsell`

### BUG 2 — Back Redirect infla conversão
**Back Redirect** = `.../sacra/obrigado?offer=upsell` (ON) ❌
"Back Redirect" dispara ao **sair/abandonar** o checkout (sem pagar). Quem desiste cai na
página de obrigado do upsell — que mostra "liberando acesso" e **dispara o Purchase pixel**
→ conversão falsa no Meta + experiência confusa.

**Correto:** **DESLIGAR** o Back Redirect (ou apontar pra uma LP de recuperação, nunca pra `/obrigado`).

### BUG 3 — ao aceitar o upsell não vai pro app
Print "Editar estratégia" (21 dias):
- **Caso o cliente aceite a oferta** = "Página de obrigado" (da Kirvano) ⚠️

Cliente paga R$67 e cai numa página genérica da Kirvano, não no app com o conteúdo.

**Correto:** trocar para **"Nova oferta"** com URL = `https://rotina-de-paz-app.vercel.app/login`

### BUG 4 — falta a estratégia/snippet de DOWNSELL
Print da lista de estratégias: só existe **1** (Upsell R$67). O downsell (R$37, `e6fd35f3`)
não tem estratégia. O `refusePageURL` do upsell leva pra `/sacra/obrigado?offer=downsell`,
mas essa página precisa do **snippet do downsell** + estratégia pra cobrar one-click.

**Correto:** criar estratégia **Downsell** (Chave da Gratidão, `e6fd35f3`), aceitar→app, recusar→app.

### BUG 5 (código) — `nextPageURL` nulo
`OfferPage.tsx:114` → `w.nextPageURL = null`. Ao **aceitar**, o JS não tem destino próprio e
depende 100% da estratégia Kirvano. Setar explicitamente pro app fecha a brecha.

**Correto:** `w.nextPageURL = "https://rotina-de-paz-app.vercel.app/login"`

---

## ✅ Configuração correta — passo a passo

### 1. Oferta PRINCIPAL (Rotina de Paz, `0b6125dc`) → "Editar oferta"
| Campo | Valor |
|---|---|
| Back Redirect | **DESLIGADO** |
| Ir para outra página após aprovado | **LIGADO** → `https://rotinadepaz.com.br/sacra/obrigado?offer=upsell` |
| Modelo de cobrança do upsell | **Pagamento imediato a cada upsell** (recomendado — 1 venda/webhook por produto) |

> "Imediato a cada upsell" gera um webhook por produto aceito → o webhook libera o
> entitlement certo por `transaction_id`. "Acumulativo" junta tudo num pagamento final e
> atrasa o redirect. Para one-click com cartão, **imediato** é mais previsível.

### 2. Estratégia UPSELL (Chave da Gratidão, `ca518c06`, R$67)
| Campo | Valor |
|---|---|
| Tipo | Upsell |
| Produto / oferta | A Chave da Gratidão — upsell R$67 |
| Caso o cliente **aceite** | **Nova oferta** → `https://rotina-de-paz-app.vercel.app/login` |
| Se **recusar** | **Nova oferta** → `https://rotinadepaz.com.br/sacra/obrigado?offer=downsell` ✅ (já está) |

### 3. Estratégia DOWNSELL (Chave da Gratidão, `e6fd35f3`, R$37) — CRIAR
| Campo | Valor |
|---|---|
| Tipo | Downsell |
| Produto / oferta | A Chave da Gratidão — downsell R$37 |
| Caso o cliente **aceite** | **Nova oferta** → `https://rotina-de-paz-app.vercel.app/login` |
| Se **recusar** | **Nova oferta** → `https://rotina-de-paz-app.vercel.app/login` |

---

## Snippets (o código já gera dinâmico; confira os valores)

**Página de upsell** (`/sacra/obrigado?offer=upsell`):
```html
<script>
  var offer = "ca518c06-88d8-44a7-9487-7ca71d3e86d3";        // upsell ✅
  var nextPageURL = "https://rotina-de-paz-app.vercel.app/login";   // aceita → app
  var refusePageURL = "https://rotinadepaz.com.br/sacra/obrigado?offer=downsell"; // recusa → downsell ✅
</script>
<script src="https://snippets.kirvano.com/upsell.min.js"></script>
```

**Página de downsell** (`/sacra/obrigado?offer=downsell`):
```html
<script>
  var offer = "e6fd35f3-ad96-4121-b6a9-1123468d5f9f";        // downsell ✅
  var nextPageURL = "https://rotina-de-paz-app.vercel.app/login";   // aceita → app
  var refusePageURL = "https://rotina-de-paz-app.vercel.app/login"; // recusa → app
</script>
<script src="https://snippets.kirvano.com/upsell.min.js"></script>
```

> No código (`OfferPage.tsx:112-117`) o `offer` é derivado da `checkoutUrl` e o `refusePageURL`
> vem do `declineTo`. Falta só trocar `nextPageURL = null` (linha 114) pela URL do app.

---

## ⚠️ One-click só funciona com CARTÃO
O upsell/downsell one-click cobra usando o cartão do checkout principal. Em compra via **PIX**
não há cartão salvo → a cobrança instantânea não acontece e o fluxo de upsell não roda como
esperado. **Teste sempre com cartão de crédito** para validar upsell/downsell.

---

## Checklist de validação (com cartão)
- [ ] Principal aprovado → cai em `/sacra/obrigado?offer=upsell` (não no app)
- [ ] Aceitar upsell → cobra R$67 → app/login
- [ ] Recusar upsell → `/sacra/obrigado?offer=downsell`
- [ ] Aceitar downsell → cobra R$37 → app/login
- [ ] Recusar downsell → app/login
- [ ] Webhook cria entitlement de cada produto comprado
- [ ] Purchase pixel dispara 1x (não no abandono / não no downsell)
