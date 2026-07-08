# Quiz Sacra v3 — "Noite Sagrada" — Design Brief

**Decisão do dono (07/07):** v2 mantida mas esquecida. v3 do zero — só a estrutura de perguntas/fluxo permanece. Paleta, fonte, motion: tudo novo. Referência de nível: a página de resultado atual de produção (ameixa profundo + ouro + CTA rosé) — print aprovado pelo dono.

## Identidade "Noite Sagrada"

- **Paleta:** fundo ameixa profundo `#241736` → gradiente `#1A0F28`; superfícies `#31204A`; ouro `#E3C77B` (acentos, títulos em itálico); rosé `#E8A0BF` → gradiente CTA `linear-gradient(135deg,#E8A0BF,#D4AF37)`; texto creme `#F5EDE2`; suave `#B9A8CC`.
- **Tipografia:** Fraunces (títulos, itálico expressivo) + Inter (corpo). Google Fonts.
- **Luz:** glow dourado suave atrás de elementos-chave (`box-shadow: 0 0 60px rgba(227,199,123,.25)`), partículas de luz flutuando no hero (CSS puro, 6-8 pontos, `transform` only).
- **Regra de performance:** TODA animação via `transform`/`opacity` (GPU). Nada bloqueia clique. Público usa aparelho antigo em 4G — lição já aprendida em produção.

## Motion (framer-motion)

- **Entre telas:** `AnimatePresence` — slide-up + fade (spring suave, 350ms).
- **Hero:** headline revela palavra por palavra (stagger 80ms); botões de dor entram em stagger com glow pulsante sutil; scale .97 no tap; partículas ambiente.
- **Perguntas = chat vivo:** ao marcar opção → opção pulsa ouro → "Jaqueline está digitando" (3 pontinhos animados, 700ms) → balão do feedback entra com spring. Sensação de conversa real.
- **Barra de progresso:** shimmer dourado contínuo.
- **Loading:** anel circular dourado com % + notificações WhatsApp "chegando" (slide-in com bounce).
- **Resultado (stories):** barras de progresso automáticas estilo Instagram (5s/cena, tap avança); nome do arquétipo revela com tracking-in das letras + glow; cartão do versículo com brilho respirando.
- **Dicotomia = MOMENTO WOW:** comparador interativo before/after — slider arrastável (touch) dividindo Mula de Carga (dessaturado, frio) e Filha Cuidada (dourado, quente). Gostoso de arrastar. Fallback: tap alterna.
- **Oferta:** âncora R$228 risca com animação → R$47 com countup reverso (1s); CTA rosé com pulso respirando (scale 1→1.02); stack entra em cascata no scroll (whileInView).

## Seção WhatsApp REAL (loading + oferta)

Reproduzir a UI do WhatsApp de verdade (dark):
- Header do grupo: foto, "Alunas Rotina de Paz 🕊️", "247 participantes", online.
- Fundo escuro com pattern característico.
- Bolhas verde-escuras (#005C4B) com rabinho, nome colorido, horário + ✓✓.
- 1 mensagem de ÁUDIO mock: play, forma de onda, "1:32".
- Mensagens entram com animação de chegada (slide + fade), badge de reação com bounce.
- Depoimentos: mesmos 6 modelos da v2 (ancorar em histórias reais antes de produção).

## Fluxo (igual v2 — não mudar)

hero(3 dores) → nome → 7 perguntas (dados de @prod/data/quiz) → gate WhatsApp → loading → resultado 3 cenas por arquétipo → dicotomia → oferta (R$228→R$47, 10× R$5,60, 15 dias, Protocolo de 14 Encontros) → checkout placeholder.
Pré-score das dores: cansaço→sobrecarga(2), oração→vigilante(2), culpa→culposa(2). Reusar `state.ts` da v2 (copiar).
Copy: reusar `content.ts` da v2 (copiar) — copy aprovada; o problema era o visual.

## Imagens

Mesmos 7 placeholders numerados (proporções 4:5 e 1:1), com visual glass premium (borda dourada 1px, glow) em vez de listras.

## Stack

`prototype-v3/` — Vite + React + TS + **framer-motion** + CSS puro. Alias `@prod` → `../src`. Deploy: `sacra-v3-preview.pages.dev`.
