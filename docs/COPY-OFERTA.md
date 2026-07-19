# Copy da Página de Oferta — Quiz Sacra

> Extraído do código em 2026-07-18. Fontes: [`src/components/quiz/OfferScreen.tsx`](../src/components/quiz/OfferScreen.tsx) e [`src/data/quiz.ts`](../src/data/quiz.ts).
> Toda copy aqui é **verbatim do código**. Onde há ênfase inline (`<em>`, `<mark>`, `<b>`), mantive a marcação visual.
>
> **Docs vizinhos:** `AUDITORIA_RESULTADO.md` cobre a tela de *resultado*. `backup-resultado-oferta-2026-07-02/CONTRATO-PERSONALIZACAO.md` está **desatualizado** — é anterior ao commit `e40885b`, que introduziu as headlines por arquétipo.

---

## 1. Como a página varia

A oferta tem **dois eixos independentes** de variação:

| Eixo | Origem | Nº de variações | O que muda |
|---|---|---|---|
| **Arquétipo** | resultado do quiz | 4 | Headline (H1) + subheadline + bloco "O que esperar / não esperar" |
| **Desejo** | pergunta `meta: "desire"` | 4 | Label do CTA principal + eco do desejo |

→ **16 combinações possíveis** da página.

**Resolução no código** ([OfferScreen.tsx:836-840](../src/components/quiz/OfferScreen.tsx#L836-L840)):
```ts
const ctaLabel = (desire && DESIRE_CTA[desire]) || "Eu creio — quero minha paz";
const quote    = (desire && DESIRE_QUOTE[desire]) || null;
const offerH   = OFFER_HEADLINE[archetype.name] ?? OFFER_HEADLINE["SOBRECARGA"];
```

**Fallbacks:** sem desejo → CTA `"Eu creio — quero minha paz"` e o bloco de eco **some** (`quote = null`). Arquétipo desconhecido → cai em `SOBRECARGA`.

---

## 2. Variações por ARQUÉTIPO

### 2.1 Headline + Sub (`OFFER_HEADLINE`)

#### VIGILANTE
- **Eyebrow:** EM 7 NOITES
- **H1:** Sua mente / vai aprender / a *desligar.*
- **Small:** E a paz vai durar `a noite toda,` após desligar o alarme da vigilância e da exaustão.
- **Sub:** Vigilante: um cérebro preso em modo de guarda. O **Protocolo Neurofé** aplica a Palavra pra render essa guarda e cuidar de você inteira — 10 minutos por sessão, e o alarme desliga.

#### SOBRECARGA *(padrão de fallback)*
- **Eyebrow:** JÁ NA PRIMEIRA SESSÃO
- **H1:** Você vai / sentir o / *peso saindo.*
- **Small:** E o descanso vai chegar `de verdade,` após desligar o alarme da sobrecarga e do esgotamento.
- **Sub:** Sobrecarga: um corpo em alerta que gasta energia até parada. O **Protocolo Neurofé** desliga esse alerta com a Palavra — cuidando de você inteira, 10 minutos por sessão, nenhuma tarefa a mais na sua lista.

#### CULPOSA
- **Eyebrow:** A PARTIR DE HOJE
- **H1:** Você vai / descansar / *sem pedir desculpa.*
- **Small:** E a paz da sua oração vai durar `o dia todo,` após desligar o alarme da culpa e do stress.
- **Sub:** Culposa: não é falta de fé, é um alarme neural que religa depois que você ora. O **Protocolo Neurofé** acalma o corpo pra Palavra alcançar você inteira — e manter o que a oração começa.

#### ANTECIPATÓRIA
- **Eyebrow:** A PARTIR DE HOJE
- **H1:** Sua mente / vai parar de / *ensaiar o pior.*
- **Small:** E o hoje vai voltar a ser `seguro,` após desligar o alarme da antecipação e do medo.
- **Sub:** Antecipatória: um cérebro treinado a sofrer adiantado. O **Protocolo Neurofé** usa a Palavra pra trazer você de volta pro hoje, inteira — onde dá pra descansar.

### 2.2 Bloco "Com honestidade, pra você decidir bem"

Seção fixa; o conteúdo vem de `ARCHETYPES[x].esperar` / `.naoEsperar`.

| Arquétipo | O que esperar | O que **não** esperar |
|---|---|---|
| **Vigilante** | Começar a dormir mais profundo, acordar menos vezes de madrugada, sentir o corpo mais leve. | Cura imediata se a hipervigilância vem de trauma profundo. Trauma demanda terapia direcionada. Esse método é o começo do caminho, não o fim. |
| **Sobrecarga** | Conseguir sentar sem fazer nada por 15 minutos sem disparar culpa. Sentir o ombro descer pela primeira vez em anos. | Que o método resolva a sobrecarga externa real. Se você cuida de pais idosos sozinha, se o marido não divide, se o trabalho é abusivo — essas conversas precisam acontecer fora daqui. |
| **Culposa** | Começar a orar sem ficar revisando se "orou direito". Sentir paz sem se culpar por estar sentindo paz. | Apagar de uma vez anos de cobrança religiosa internalizada. Esse trabalho continua — em terapia, em direção espiritual saudável. O método é o primeiro empurrão. |
| **Antecipatória** | Começar a perceber que consegue viver o presente sem rodar 5 cenários catastróficos em paralelo. Mente mais quieta, futuro mais leve. | Que substitua psiquiatria em casos de pânico severo. Se você tem várias crises por semana, o caminho saudável é fazer esse método em paralelo a acompanhamento profissional — não em vez de. |

---

## 3. Variações por DESEJO

| Chave | CTA principal (`DESIRE_CTA`) | Eco do desejo (`DESIRE_QUOTE`) |
|---|---|---|
| `dormir` | QUERO DORMIR EM PAZ → | dormir em paz |
| `descansar` | QUERO VOLTAR A DESCANSAR DE VERDADE → | descansar de verdade |
| `orar` | QUERO VOLTAR A ORAR SEM CULPA → | orar sem culpa |
| `parar-pior` | QUERO PARAR DE IMAGINAR O PIOR → | parar de imaginar o pior |
| *(nenhum)* | Eu creio — quero minha paz | — bloco não renderiza — |

**Onde o eco aparece** (só se `quote` existir):
> **[Nome],** você lembra do seu desejo: *"[quote]"*
> Esse é o caminho específico pra ele.

Sem nome capturado, vira: *"Você lembra do seu desejo: ..."*.

---

## 4. Copy fixa — na ordem da página

### 4.1 Abertura
- **Chips:** `10 min por sessão` · `nenhuma tarefa a mais`
- **Prompt da VSL:** ▶ Aperte o play — em poucos minutos você entende **por que nada antes funcionou.**
- **Botão âncora:** IR PARA A OFERTA →

### 4.2 Método
- **Eyebrow:** MÉTODO COMPLETO · 7 DIAS
- **H2:** Você já tentou de tudo. / Mas nunca tentou *você inteira*.
- Terapia cuida da mente. Remédio cuida do corpo. A fé, com o corpo em alarme, não alcança por completo. **Cada método tratou só um pedaço de você.**
- A **Neurofé** cuida das três camadas ao mesmo tempo — **corpo, mente e espírito, com Deus no centro.** A respiração acalma, a Palavra alcança, a repetição abre um caminho novo. A neurociência chama de neuroplasticidade. Paulo chamava de outra coisa:
- **Versículo:** *"Transformai-vos pela renovação da vossa mente."*
- O método que acalma o corpo pra Palavra alcançar você inteira — dentro do app **Rotina de Paz**.

### 4.3 Prova social (`ShotsCarousel`)
Prints reais de WhatsApp + comentários do Facebook. Alt-texts: descoberta do padrão · Julia · alarme interno desligado · Ana · Ana (2º) · comentários de leitoras sobre o método Neurofé.

### 4.4 O que você recebe
**14 sessões guiadas em áudio**: 7 capítulos pra usar de manhã e 7 à noite. Cada sessão tem de **8 a 12 minutos** — cabe entre uma tarefa e outra, antes de dormir, antes da casa acordar.

| Item | Descrição |
|---|---|
| Método completo dentro do APP | — |
| App guiado | tudo organizado e didático no seu celular. Você abre, e ele sabe onde você parou. |
| Volume I — Despertar | 7 Manhãs de Renovação Neural |
| Volume II — Repouso | 7 Noites de Selagem Profunda |
| Acesso vitalício pelo app | você ouve quando quiser, quantas vezes precisar. |

### 4.5 Bônus
🎁 **Bônus para fortalecer sua Rotina de Paz**

| Bônus | Micro-copy |
|---|---|
| 148 Louvores em Salmos | playlist para o quarto virar altar |
| E-book Dormir Melhor Hoje | protocolo de sono em 3 passos |
| Devocional 30 Dias com Jesus | para orar como filha, não como funcionária |

De presente, dentro do app **Rotina de Paz**.

### 4.6 Card de oferta
- **Escassez:** Para `suporte` no app, limitamos a **100 mulheres de fé**. *(+ `ScarcityBar`)*
- **Selo:** Garantia de 15 dias · o risco é meu

**Value stack** (`NEUROFE_OFFER.valueStack`) — âncora total **R$228,00**:

| Item | Valor |
|---|---|
| Volume I + II · 14 sessões guiadas | R$127,00 |
| E-book · Dormir Melhor Hoje | R$37,00 |
| E-book · 30 Devocionais com Jesus | R$37,00 |
| Louvores do Reino · 148 em Salmos | R$27,00 |

- **Justificativa de preço:** Por que tão acessível? Porque tem mulher que segura tudo sozinha — viúvas, mães solo — e todas elas merecem esse alívio.
- menos de R$7 por dia na sua primeira semana
- **10× de R$5,60**
- pagamento único · sem mensalidade · acesso imediato
- **Inclui:** Volume I + Volume II · 14 sessões guiadas · E-book 30 Devocionais · E-book Dormir Melhor Hoje · Louvores do Reino (148) · Acesso vitalício
- **Selo pós-CTA:** 🔒 Pagamento seguro · Acesso imediato · Garantia de 15 dias

> Nota: o preço "por" (`R$[priceReais]`) vem do banco via `fetchProductPrices`, não daqui. Só a âncora e o parcelamento são hardcoded em `NEUROFE_OFFER`.

### 4.7 Garantia
**Garantia incondicional de 15 dias — e repara na conta.**

A jornada inteira é de 7 dias. A garantia é de 15. Você faz o método completo, sente na pele — e ainda sobram 8 dias pra decidir com calma se quer ficar. Você experimenta de verdade, e só depois decide. Se sentir que não é pra você, me escreve e devolvo cada centavo. Sem formulário, sem pergunta, sem julgamento.

### 4.8 Fecho
- Tudo isso te esperando dentro do app **Rotina de Paz**.
- 🔒 Acesso imediato · Garantia de 15 dias
- **Rodapé:** ROTINA DE PAZ / HAJA LUZ / ← voltar ao resultado

### 4.9 CTA fixo mobile
Aparece só após os depoimentos. `R$[preço] ou 10× R$5,60` / ACESSO IMEDIATO / botão **Quero minha vaga →**

---

## 5. Inconsistência a decidir

A página tem **3 botões de compra**, mas só **um** usa o CTA personalizado por desejo:

| Posição | Label | Personaliza? |
|---|---|---|
| Card de oferta | `{ctaLabel}` → | ✅ varia por desejo |
| Fecho (pós-garantia) | QUERO NEUROFÉ → | ❌ hardcoded |
| CTA fixo mobile | Quero minha vaga → | ❌ hardcoded |

Os dois hardcoded ignoram o desejo que ela declarou no quiz. O CTA fixo mobile é provavelmente o **mais clicado** (persistente na tela) — e é justamente o mais genérico. Vale propagar `ctaLabel` para os três.

Nota: "Quero minha vaga" apoia a moldura de escassez ("limitamos a 100 mulheres"), o que conflita com a diretriz de não vender por urgência artificial.

---

## 6. Referências rápidas de código

| O quê | Onde |
|---|---|
| `OFFER_HEADLINE` | [quiz.ts:852-869](../src/data/quiz.ts#L852-L869) |
| `DESIRE_CTA` | [quiz.ts:844-849](../src/data/quiz.ts#L844-L849) |
| `DESIRE_QUOTE` | [quiz.ts:872-877](../src/data/quiz.ts#L872-L877) |
| `esperar` / `naoEsperar` | [quiz.ts:392, 537, 681, 825](../src/data/quiz.ts#L392) |
| `NEUROFE_OFFER` (preços/stack) | [quiz.ts:1078-1093](../src/data/quiz.ts#L1078-L1093) |
| `ENTREGAS` / `INCLUI` | [OfferScreen.tsx:796-815](../src/components/quiz/OfferScreen.tsx#L796-L815) |
| Resolução das variações | [OfferScreen.tsx:836-840](../src/components/quiz/OfferScreen.tsx#L836-L840) |

> **Fora deste doc:** `DESIRE_BEAT` ([quiz.ts:889-926](../src/data/quiz.ts#L889-L926)) tem 4 blocos emocionais por desejo, mas é consumido por `getBridgeCopy` na **tela de resultado**, não na oferta.
