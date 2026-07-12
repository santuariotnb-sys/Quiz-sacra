# Plano: Telas de Idade + Alerta

**Data:** 2026-07-11
**Status:** A implementar

---

## Fluxo atual (7 perguntas):

| # | key | Pergunta |
|---|-----|----------|
| 1 | situacao | Situação de vida |
| 2 | risco | Como se sentiu nas últimas 2 semanas |
| 3 | sintoma | Sintoma físico |
| 4 | comportamento | Comportamento ansioso |
| 5 | frase | Frase que aperta |
| 6 | espiritual | Vida com Deus |
| 7 | desejo | O que mudaria hoje |

## Novo fluxo (7 perguntas + 2 telas novas):

| # | key | Tipo | Descrição |
|---|-----|------|-----------|
| 1 | situacao | pergunta | Situação de vida |
| 2 | risco | pergunta | Últimas 2 semanas |
| 3 | sintoma | pergunta | Sintoma físico |
| **→** | **idade** | **TELA NOVA** | Input numérico de idade |
| 4 | comportamento | pergunta | Comportamento ansioso |
| 5 | frase | pergunta | Frase que aperta |
| 6 | espiritual | pergunta | Vida com Deus |
| **→** | **alerta** | **TELA NOVA** | Dados por faixa etária (CDC/Pew) |
| 7 | desejo | pergunta | O que mudaria hoje |
| → | loading | split | Carregamento |

## Tela IDADE

- **Eyebrow:** "SUA IDADE"
- **Headline:** "Qual é a sua idade?"
- **Body:** "Sua idade ajuda a contextualizar os dados reais que você verá na próxima etapa. O objetivo não é diagnosticar, é mostrar que esse alarme interno tem nome."
- **Input:** numérico, centralizado, grande
- **CTA:** "CONTINUAR →"
- **Micro-copy:** "Na próxima tela, você verá uma leitura curta com dados reais para aquecer sua consciência antes de continuar."
- **Inserção no fluxo:** entre pergunta 3 (sintoma) e 4 (comportamento)
- **Stage novo:** `"age"` — não é uma QuizQuestion, é um stage especial
- **Validação:** 18-99, obrigatório

## Tela ALERTA

- **Banner topo:** "⚠ ALERTA: O INIMIGO FOI NOMEADO" (fundo vermelho escuro)
- **Headline:** frase forte baseada na `situacao` respondida
- **Sub:** contextualizado por situação
- **Faixa:** "33 anos · 30 a 44 anos"
- **Card dados:** barras com % animadas por faixa etária
  - Ansiedade na sua faixa etária
  - Sintomas depressivos na sua faixa
  - Mães em sobrecarga silenciosa
- **Bloco emocional:** "O que isso tem causado dentro da sua casa?" + texto contextualizado
- **CTA:** "CONTINUAR O QUIZ →" (dourado, pulsante)
- **Link secundário:** "← Rever minha idade"
- **Disclaimer:** "Fontes: CDC/NCHS 2022 · Pew Research 2023. Não substitui avaliação médica."
- **Inserção:** entre pergunta 6 (espiritual) e 7 (desejo)
- **Stage novo:** `"alert"`

## Faixas etárias (dados estáticos)

| Faixa | Ansiedade | Depressão | Sobrecarga materna |
|-------|-----------|-----------|-------------------|
| 18-29 | 29,4% | 24,6% | 28,0% |
| 30-44 | 20,7% | 21,8% | 33,0% |
| 45-59 | 18,2% | 18,1% | 22,0% |
| 60+ | 11,7% | 14,3% | 12,0% |

## Headlines por situação (para o alerta)

| situacao | Headline |
|----------|----------|
| casada-filhos-pequenos | "Você virou a base de tudo — e ninguém percebe quando você quebra." |
| casada-filhos-grandes | "Seus filhos cresceram. Mas o peso que você carrega, não." |
| casada-sem-filhos | "Por fora está tudo certo. Por dentro, o alarme não para." |
| mae-solo | "Você sustenta a casa sozinha — e ninguém pergunta como você está." |
| solteira | "Ninguém vê a ansiedade de quem não tem pra quem reclamar." |

## Subtextos por situação

| situacao | Sub |
|----------|-----|
| casada-filhos-pequenos | "1 em cada 3 mães nessa faixa vive parentalidade estressante. Você não está exagerando: seu corpo está em alerta há tempo demais." |
| casada-filhos-grandes | "Mãe de filho grande raramente reclama. Mas o corpo continua gritando." |
| casada-sem-filhos | "Sem filhos não significa sem peso. A ansiedade silenciosa é a mais perigosa." |
| mae-solo | "Mães solo têm 2x mais chance de desenvolver burnout parental." |
| solteira | "Mulheres solteiras relatam os maiores índices de solidão e ansiedade não tratada." |

## Blocos emocionais por situação

| situacao | "O que isso tem causado..." |
|----------|-----------------------------|
| casada-filhos-pequenos | "Menos paciência com os filhos. Menos presença no casamento. E a sensação dolorida de amar e estar cansada demais para viver isso em paz." |
| casada-filhos-grandes | "Distância emocional dos filhos. Sensação de missão cumprida mas vazio por dentro. E a culpa de não conseguir aproveitar a fase." |
| casada-sem-filhos | "Tensão no casamento que ninguém entende. Cobrança interna constante. E a sensação de que deveria estar bem mas não está." |
| mae-solo | "Exaustão que não tem fim de semana. Culpa por não dar conta. E medo constante de que algo dê errado." |
| solteira | "Isolamento que parece escolha mas é proteção. Dificuldade de confiar. E a sensação de que ninguém entende." |

## Persistência

- `age` salvo em `answers["idade"]` como string
- Enviado no `persist_quiz_responses` como uma row adicional (key: "idade", value: idade digitada)
- Opcionalmente: novo campo `p_age` na RPC `persist_lead`

## Implementação (arquivos)

1. `src/data/age-data.ts` — dados estáticos das faixas + headlines/subs por situação
2. `src/components/quiz/QuizApp.tsx`:
   - Adicionar `"age" | "alert"` ao type `Stage`
   - Criar `AgeScreen` component
   - Criar `AlertScreen` component
   - Lógica de transição:
     - Após pergunta 3 (qIndex=2, key="sintoma") → stage `"age"`
     - Após input idade → volta pra `"questions"` no qIndex=3
     - Após pergunta 6 (qIndex=5, key="espiritual") → stage `"alert"`
     - Após CTA alerta → volta pra `"questions"` no qIndex=6 (desejo)
3. `src/styles.css` — estilos do banner alerta + barras animadas

## Design

- **AgeScreen:** card branco com input grande centralizado, CTA dourado
- **AlertScreen:** banner vermelho escuro no topo, card creme com barras animadas (Framer Motion), bloco emocional com borda dourada, CTA dourado pulsante
- Barras animadas: `motion.div` com `initial={{ width: 0 }}` → `animate={{ width: "X%" }}`
- Paleta alerta: vermelho escuro `#7A1F1F` no banner, dourado no CTA
- Responsivo mobile-first
