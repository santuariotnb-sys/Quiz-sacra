# Auditoria — Tela de Resultado do Quiz Sacra

> Mapa completo de todas as combinações de texto que a tela de resultado pode gerar.
> **Nada foi alterado.** Documento só para análise.

---

## 1. Arquivos e funções envolvidas

| Arquivo | Papel |
|---------|-------|
| `src/data/quiz.ts` | Fonte de TODO o conteúdo: perguntas, `ARCHETYPES` (textos fixos por arquétipo + `bridges` por situation), `DESIRE_CTA`, `DESIRE_QUOTE`, `computeArchetype()` |
| `src/components/quiz/QuizApp.tsx` | Monta a tela. `computeArchetype()` → `archetype`; `arche.bridges[situation]` → `bridge`; `ResultScreen` renderiza |

**Funções/variáveis-chave em `QuizApp.tsx`:**
- L47-50 `result = computeArchetype(answers)` → define o arquétipo
- L54 `situation = answers["situacao"]`
- L55 `desire = answers["desejo"]`
- L56 `bridge = arche && situation ? arche.bridges[situation] ?? null : null` ← **único cruzamento archetype × situation**
- L572 `ResultScreen(...)` ← componente que renderiza o texto final

---

## 2. Variáveis e valores possíveis

| Variável | Origem | Valores | Entra no texto do resultado? |
|----------|--------|---------|------------------------------|
| `archetype` | `computeArchetype()` (P3-P6) | `vigilante`, `sobrecarga`, `culposa`, `antecipatoria` | **Sim** — define o bloco fixo inteiro |
| `situation` | P1 `situacao` | `casada-filhos-pequenos`, `casada-filhos-grandes`, `casada-sem-filhos`, `mae-solo`, `solteira` | **Sim** — só a linha `bridge` |
| `desire` | P7 `desejo` | `dormir`, `descansar`, `orar`, `parar-pior` | **Sim** — só o label do botão (CTA) |
| `risk` | P2 `risco` | `true`/`false` | **NÃO** — `risk_flag: false` hardcoded (L135). Flag morta no texto |
| `name` | input | string livre | Sim — só na saudação |

**Espaço total:** 4 archetypes × 5 situations × 4 desires = **80 telas possíveis**.
Mas a variação real está concentrada em **2 fragmentos**: a `bridge` (20 variações) e o `CTA` (4 variações). Todo o resto é **fixo por arquétipo** (4 blocos).

---

## 3. Anatomia da tela (ordem de montagem)

| # | Bloco | Fonte | Cruza com |
|---|-------|-------|-----------|
| 1 | Saudação: *"Encontrei, {NOME}. Você é a {ARQUÉTIPO}."* | template L606 | name + archetype |
| 2 | Eyebrow fixo: *"✦ PADRÃO RAIZ IDENTIFICADO ✦"* | fixo | — |
| 3 | `{archetype.name}` | ARCHETYPES | archetype |
| 4 | `{archetype.subtitle}` | ARCHETYPES | archetype |
| 5 | **`bridge`** (linha personalizada) | `bridges[situation]` | **archetype × situation** |
| 6 | "O que está acontecendo" + `mechanismHtml` (inclui a frase-espelho/blockquote) | ARCHETYPES | archetype |
| 7 | `desarmeHtml` (verdade + versículo + closing) | ARCHETYPES | archetype |
| 8 | "O que esperar" / "O que não esperar" | ARCHETYPES | archetype |
| 9 | Captura de email (fixo) | fixo | — |
| 10 | **CTA** `{DESIRE_CTA[desire]}` | DESIRE_CTA | desire |

> A linha de abertura personalizada que o usuário quer auditar = **bloco 5 (`bridge`)**.

---

## 4. Blocos FIXOS por arquétipo (não variam por situation/desire)

### VIGILANTE — *"O padrão da Mente Que Não Desliga."*
- **Frase-espelho:** "Você não dorme mal porque o barulho te acorda. Não dorme porque, por anos, seu corpo aprendeu que se você desligar — algo escapa."
- **Verdade:** *"Isso não é falta de fé. É um corpo em alerta."* — padrão fisiológico instalável/desinstalável.
- **Versículo:** SALMOS 121 — "Aquele que te guarda não dormirá nem cochilará."
- **Esperar:** dormir mais profundo, acordar menos de madrugada, corpo mais leve.
- **Não esperar:** cura imediata se vem de trauma profundo (demanda terapia).

### SOBRECARGA — *"O padrão da Que Carrega Todos."*
- **Frase-espelho:** "Você se perdeu sendo a pessoa que segura todo mundo. E agora, ninguém segura você — nem você mesma."
- **Verdade:** *"Isso não é fraqueza. É exaustão acumulada."* — descansar também é fé.
- **Versículo:** MATEUS 11 — "Vinde a mim, todos os que estais cansados e sobrecarregados..."
- **Esperar:** sentar 15 min sem disparar culpa, ombro descer.
- **Não esperar:** que resolva sobrecarga externa real (pais idosos, marido que não divide, trabalho abusivo).

### CULPOSA — *"O padrão da Que Não Se Perdoa."*
- **Frase-espelho:** "Essa voz que te diz 'cristã de verdade não sente isso' não é a voz do Espírito Santo. É a voz da insuficiência."
- **Verdade:** *"A condenação que você sente não vem do Pai."* — cortisol não responde a fé consciente.
- **Versículo:** ROMANOS 8 — "Já não há condenação para os que estão em Cristo Jesus."
- **Esperar:** orar sem revisar se "orou direito", sentir paz sem culpa.
- **Não esperar:** apagar anos de cobrança religiosa de uma vez.

### ANTECIPATÓRIA — *"O padrão da Que Antecipa o Pior."*
- **Frase-espelho:** "O futuro te preocupa antes mesmo de chegar. E quando chega — raramente é o que você temia."
- **Verdade:** *"Isso não é frescura. É um padrão neural."* — ~85% do que ansiosos preveem nunca acontece.
- **Versículo:** JEREMIAS 29 — "Eu sei os planos que tenho para vocês — planos de paz, e não de mal."
- **Esperar:** viver o presente sem rodar 5 cenários catastróficos.
- **Não esperar:** que substitua psiquiatria em pânico severo.

---

## 5. As 20 BRIDGES (linha de abertura — archetype × situation) ⚠️ núcleo da auditoria

| | casada-filhos-pequenos | casada-filhos-grandes | casada-sem-filhos | mae-solo | solteira |
|---|---|---|---|---|---|
| **VIGILANTE** | Mãe de filho pequeno acordando às 3h não é insônia. É um corpo que aprendeu: se eu dormir, alguém chora e eu não ouço. | Filho já cresceu — e o corpo continua vigiando. Um padrão antigo que ninguém te avisou que ficaria. | Você não dorme mal porque sua vida está mal. Dorme mal porque seu corpo aprendeu a vigiar. | Sustentar a casa sozinha ensina o corpo a nunca desligar. Se você soltar, o que segura tudo? | Você dorme mal mesmo sem ninguém dependendo de você. Porque o padrão antigo continua agindo. |
| **SOBRECARGA** | 🔴 Mãe de filho pequeno sustenta **duas casas ao mesmo tempo: a sua e a do filho**. Você é a forte porque não tem opção. | Filho cresceu — só mudou o tipo de cuidado. O corpo segue respondendo como se ainda houvesse criança chorando. | Você cuida do marido, da casa, da sua mãe, da família toda. Não tem filho — tem todo mundo. | Mãe solo é a definição de Sobrecarga: a primeira que acorda, a última que dorme. Não existe almoço sem você. | Solteira da família vira a 'que está disponível porque não tem filhos'. E ninguém vê quanto isso custa. |
| **CULPOSA** | Mãe cristã de filho pequeno carrega culpa dobrada: por cansar, por gritar, por querer 5 minutos sozinha — e culpa por ter culpa. | Você revisa cada decisão antiga: 'e se tivesse feito diferente?' 'e se tivesse orado mais?' Culpa por escolhas que já não dá pra mudar. | Cristã casada sem filhos carrega uma culpa que ninguém nomeia: a da ausência. Por não ter, por ter desejado, por não ter desejado. | 🟡 Mãe solo cristã carrega três culpas: **a do divórcio**, a de não ser 'família completa' e a de ser forte demais. | Cristã solteira na igreja carrega a culpa silenciosa de não ter cumprido o 'destino esperado' — e de se perguntar, sozinha, se Deus se esqueceu. |
| **ANTECIPATÓRIA** | Você vê doença em cada espirro, sequestro em cada atraso, ameaça em cada estranho. E a culpa por imaginar pesa tanto quanto o medo. | Agora você antecipa o que já não depende de você — escolhas, casamentos, caminhos. Mas o corpo segue respondendo como se dependesse. | Sua mente antecipa o abstrato — perda do emprego, doença grave, separação. E ninguém vê o objeto do medo pra te validar. | Mãe solo antecipa o pior porque sabe: se algo der errado, só tem uma pessoa pra resolver — você. | Você antecipa envelhecer sozinha, adoecer sem ninguém. E essa antecipação envenena o presente que ainda poderia viver. |

🔴 = incoerência clara · 🟡 = assunção não respondida (ver seção 8)

---

## 6. CTAs por desire (label do botão final)

| desire | DESIRE_CTA |
|--------|-----------|
| `dormir` | "Quero dormir uma noite inteira" |
| `descansar` | "Quero descansar sem culpa" |
| `orar` | "Quero sentir Deus de novo" |
| `parar-pior` | "Quero parar de imaginar o pior" |
| *(fallback se vazio)* | "Quero meu caminho de paz" |

> O CTA é puramente sobre o desejo — **não cruza com archetype nem situation**. Qualquer combinação é gramaticalmente segura. Sem incoerências aqui.

---

## 7. Exemplos montados (combinações críticas)

### Crítico A — SOBRECARGA + casada-filhos-pequenos + dormir
> "Encontrei, Ana. Você é a SOBRECARGA."
> *✦ PADRÃO RAIZ IDENTIFICADO ✦* · **SOBRECARGA** · O padrão da Que Carrega Todos.
> **🔴 "Mãe de filho pequeno sustenta duas casas ao mesmo tempo: a sua e a do filho. Você é a forte porque não tem opção."**
> O que está acontecendo: "Você é a que segura tudo..."
> [CTA] "Quero dormir uma noite inteira"

### Crítico B — CULPOSA + mae-solo + orar
> "Encontrei, Ana. Você é a CULPOSA."
> **🟡 "Mãe solo cristã carrega três culpas: a do divórcio, a de não ser 'família completa' e a de ser forte demais."**
> [CTA] "Quero sentir Deus de novo"

### Controle (coerente) — VIGILANTE + casada-filhos-pequenos + dormir
> "Mãe de filho pequeno acordando às 3h não é insônia. É um corpo que aprendeu: se eu dormir, alguém chora e eu não ouço." ✅ perfeitamente alinhada.

---

## 8. Incoerências encontradas

### 🔴 #1 — SOBRECARGA × casada-filhos-pequenos (a que você achou)
**Origem:** `quiz.ts` L248-249, `ARCHETYPES.sobrecarga.bridges["casada-filhos-pequenos"]`
**Texto:** *"Mãe de filho pequeno sustenta duas casas ao mesmo tempo: a sua e a do filho. Você é a forte porque não tem opção."*
**Por que está quebrada:**
- A metáfora **"duas casas: a sua e a do filho"** pressupõe que o filho tem **casa própria** — ou seja, filho **adulto que mora fora**, ou cenário de **guarda/separação**. Um filho de **0-12 anos** (definição de `casada-filhos-pequenos`) mora na MESMA casa. Logicamente contraditório.
- "Não tem opção" + "duas casas" também ecoa **mãe solo/separada**, contradizendo o estado `casada`.
- Provável causa: fragmento escrito pensando em outro perfil (filhos grandes / mãe solo) e encaixado na célula errada.

### 🟡 #2 — CULPOSA × mae-solo (assunção não respondida)
**Origem:** `quiz.ts` L298-299, `ARCHETYPES.culposa.bridges["mae-solo"]`
**Texto:** *"Mãe solo cristã carrega três culpas: a do divórcio, a de não ser 'família completa' e a de ser forte demais."*
**Por que é problemática:**
- Assume que toda mãe solo é **divorciada**. A opção P1 diz só *"Sou mãe solo — sustento minha casa sozinha"* — pode ser **mãe solteira** (nunca casou), **viúva**, ou produção independente. "A culpa do divórcio" pode não fazer sentido nenhum e até soar acusatório pra quem não se divorciou.

### ⚪ Observações adicionais (não quebram, mas vale revisar)
- **`risk` é flag morta:** P2 marca `risk: true` em "pensamentos sombrios"/"crise", mas `risk_flag: false` está **hardcoded** (L135) e não há nenhum bloco de acolhimento/encaminhamento (CVV/188) na tela de resultado. Risco de produto/ético, não de texto: usuária em crise recebe a mesma copy de venda.
- **`bridge` com fallback silencioso:** se `situation` vier vazio/inválido, `bridges[situation] ?? null` → bloco 5 simplesmente some (sem erro). Hoje seguro porque P1 é obrigatória.
- **CULPOSA × casada-sem-filhos:** *"a da ausência. Por não ter, por ter desejado, por não ter desejado."* — coerente, mas a tripla negação é densa; pode confundir na leitura rápida. (estilo, não bug)
- **Padrão do bug:** ambas incoerências (#1 e #2) nascem da mesma raiz — **bridges escritas assumindo um estado civil/familiar específico** (separação/divórcio) e aplicadas a uma `situation` que não garante esse estado. Ao corrigir, vale varrer toda a coluna `mae-solo` e a célula `sobrecarga × filhos-pequenos` com a regra: *a bridge só pode afirmar o que a situation garante.*

---

## 9. Resumo pra decisão

| Severidade | Combinação | Ação sugerida (quando você decidir) |
|------------|-----------|--------------------------------------|
| 🔴 Alta | SOBRECARGA × casada-filhos-pequenos | Reescrever a bridge sem "duas casas / casa do filho" |
| 🟡 Média | CULPOSA × mae-solo | Remover pressuposto de divórcio; usar linguagem neutra de estado civil |
| ⚪ Produto | `risk` flag morta | Decidir se crise deve disparar acolhimento (fora do escopo de texto) |

Total de fragmentos de texto únicos a auditar: **4 blocos fixos + 20 bridges + 4 CTAs = 28** (não 80 — a maior parte das 80 telas compartilha os mesmos fragmentos).
