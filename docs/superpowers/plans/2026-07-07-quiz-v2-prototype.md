# Quiz Sacra v2 — Protótipo "Narrativa de Resgate" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protótipo navegável das 9 telas do Quiz v2 (spec `docs/superpowers/specs/2026-07-07-quiz-v2-narrativa-resgate-design.md`), com placeholders de imagem nas proporções corretas, deployado em preview isolado no Cloudflare Pages, + doc de prompts de imagem para o dono.

**Architecture:** App Vite+React+TS standalone em `prototype-v2/` dentro do repo (produção intocada). Importa `QUESTIONS`, `ARCHETYPES` e `NEUROFE_OFFER` direto de `../src/data/quiz.ts` (dado puro, sem deps) — uma fonte de verdade. Conteúdo novo (hero, dores, feedbacks condicionais, depoimentos) em `prototype-v2/src/content.ts`. Máquina de estados em `useReducer`. Tracking do protótipo = console.log dos stages.

**Tech Stack:** Vite 5, React 18, TypeScript, CSS puro (tokens), vitest. Deploy: `wrangler pages deploy`.

---

## File Structure

```
prototype-v2/
  package.json / vite.config.ts / tsconfig.json / index.html
  src/
    main.tsx          — bootstrap
    styles.css        — tokens (areia #F6F0E4, terracota, ouro) + base
    content.ts        — TODO o conteúdo v2 (hero, dores, feedbacks, depoimentos, loading, dicotomia, oferta-copy)
    state.ts          — máquina de estados + pré-score + feedback (TESTADA)
    state.test.ts     — vitest
    App.tsx           — orquestra as 9 telas
    components/       — Placeholder.tsx, SpeechBubble.tsx, WhatsCard.tsx
    screens/          — Hero, Name, Questions, WhatsGate, Loading, Result, Dicotomia, Offer, Checkout
docs/IMAGE-PROMPTS-V2.md — 7 prompts numerados para o dono
```

---

### Task 1: Scaffold do protótipo

**Files:** Create `prototype-v2/package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/styles.css`

- [ ] **Step 1: package.json**

```json
{
  "name": "quiz-sacra-v2-prototype",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": { "react": "^18.3.1", "react-dom": "^18.3.1" },
  "devDependencies": {
    "@types/react": "^18.3.3", "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1", "typescript": "^5.5.3",
    "vite": "^5.4.0", "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: vite.config.ts** (alias `@prod` → `../src` para importar dados de produção)

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@prod": path.resolve(__dirname, "../src") } },
  build: { target: "es2018" },
});
```

- [ ] **Step 3: tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2018", "lib": ["ES2020", "DOM"], "jsx": "react-jsx",
    "module": "ESNext", "moduleResolution": "bundler", "strict": true,
    "skipLibCheck": true, "noEmit": true,
    "paths": { "@prod/*": ["../src/*"] }
  },
  "include": ["src", "../src/data/quiz.ts"]
}
```

- [ ] **Step 4: index.html** — fonts Playfair+Inter, fundo areia inline (sem flash branco no 4G)

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Quiz Sacra v2 — Protótipo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;1,400&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap" rel="stylesheet" />
  <style>html{background:#F6F0E4}</style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

- [ ] **Step 6: src/styles.css** — tokens e base (mobile-first, shell 480px)

```css
:root {
  --areia: #F6F0E4; --areia-escura: #EDE3D0;
  --terracota: #B0623C; --terracota-suave: #C97E5A;
  --ouro: #C9A24B; --grafite: #3A342C; --grafite-suave: #6B6154;
  --verde-whats: #DCF8C6; --branco: #FFFDF9;
  --serif: "Playfair Display", Georgia, serif;
  --sans: "Inter", -apple-system, sans-serif;
}
* { box-sizing: border-box; margin: 0; }
body { background: var(--areia); color: var(--grafite); font-family: var(--sans); line-height: 1.55; }
.shell { max-width: 480px; margin: 0 auto; min-height: 100dvh; padding: 20px 20px 40px; display: flex; flex-direction: column; }
h1, h2, h3 { font-family: var(--serif); font-weight: 600; line-height: 1.25; }
em { font-family: var(--serif); }
.btn { display: block; width: 100%; border-radius: 14px; padding: 16px 20px;
  font: 500 1.05rem var(--sans); cursor: pointer; text-align: left;
  background: var(--branco); color: var(--grafite); border: 1.5px solid var(--areia-escura);
  transition: transform .12s ease, border-color .12s ease; }
.btn:active { transform: scale(.98); }
.btn-primary { background: var(--terracota); color: var(--branco); text-align: center; border: 0;
  font-weight: 600; letter-spacing: .01em; box-shadow: 0 6px 18px rgba(176,98,60,.28); }
.input { width: 100%; padding: 16px; border-radius: 14px; border: 1.5px solid var(--areia-escura);
  font: 1.05rem var(--sans); background: var(--branco); }
.progress { height: 6px; background: var(--areia-escura); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--terracota), var(--ouro)); transition: width .5s ease; }
.fade-in { animation: fadeIn .4s ease both; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.ph { width: 100%; border-radius: 16px; background: repeating-linear-gradient(45deg, var(--areia-escura), var(--areia-escura) 12px, #E3D7C0 12px, #E3D7C0 24px);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--grafite-suave); }
.ph-n { font-weight: 700; font-size: 1.1rem; color: var(--terracota); }
.ph-label { font-size: .85rem; text-align: center; padding: 0 16px; }
.ph-ratio { font-size: .75rem; opacity: .7; }
.bubble-row { display: flex; gap: 10px; align-items: flex-start; margin: 14px 0; }
.bubble-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--ouro); }
.bubble { background: var(--branco); border-radius: 4px 18px 18px 18px; padding: 12px 16px; font-size: .98rem;
  box-shadow: 0 2px 10px rgba(58,52,44,.07); }
.wa-card { background: var(--verde-whats); border-radius: 10px 10px 10px 2px; padding: 10px 12px 6px; max-width: 320px;
  box-shadow: 0 1px 2px rgba(0,0,0,.12); font-size: .92rem; text-align: left; }
.wa-name { font-size: .8rem; font-weight: 600; color: #E58025; margin-bottom: 2px; }
.wa-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
.wa-time { font-size: .7rem; color: #7A8B74; }
.wa-react { font-size: .75rem; background: #fff; border-radius: 10px; padding: 1px 6px; }
.stories-dots { display: flex; gap: 6px; margin-bottom: 16px; }
.stories-dots span { flex: 1; height: 4px; border-radius: 2px; background: var(--areia-escura); }
.stories-dots span.on { background: var(--terracota); }
.eyebrow { font-size: .78rem; letter-spacing: .08em; text-transform: uppercase; color: var(--grafite-suave); }
.mirror { font-family: var(--serif); font-style: italic; font-size: 1.1rem; border-left: 3px solid var(--ouro); padding-left: 14px; }
.verse { background: var(--grafite); color: var(--areia); border-radius: 14px; padding: 16px; display: grid; gap: 6px; }
.verse span { font-size: .75rem; letter-spacing: .1em; color: var(--ouro); }
.tap-hint { text-align: center; font-size: .78rem; color: var(--grafite-suave); margin-top: 22px; }
.lado-b { background: rgba(201,162,75,.08); border-radius: 14px; padding: 6px; }
.stack { background: var(--branco); border-radius: 14px; padding: 14px; display: grid; gap: 8px; }
.stack-row { display: flex; justify-content: space-between; font-size: .92rem; }
.stack-row s { color: var(--grafite-suave); }
.stack-row.total { border-top: 1px dashed var(--areia-escura); padding-top: 8px; font-weight: 600; }
```

- [ ] **Step 7: instalar** — Run: `cd ~/Quiz-sacra/prototype-v2 && npm install` → sem erros.
- [ ] **Step 8: Commit** — `git add prototype-v2 && git commit -m "feat(proto-v2): scaffold Vite+React do protótipo"`

---

### Task 2: Conteúdo v2 (`content.ts`)

**Files:** Create `prototype-v2/src/content.ts`

Feedbacks condicionais por resposta (nunca citar sintoma não marcado). Sem caps agressivo, sem urgência falsa.

- [ ] **Step 1: escrever o arquivo completo**

```ts
import type { Archetype } from "@prod/data/quiz";

// ---------- HERO (Passo 0) ----------
export const HERO = {
  headline: "Deus não te chamou para viver de plantão.",
  sub: "Sua exaustão não é falta de fé, é o seu corpo pedindo rendição. Descubra em 2 minutos qual padrão está roubando sua paz e como voltar ao colo do Pai.",
  microLabel: "Toque no que mais dói hoje:",
};

export type Dor = {
  id: "cansaco" | "oracao" | "culpa";
  label: string;
  preScore: Partial<Record<Archetype, number>>;
  reply: string; // resposta da Jaqueline na tela do nome
};

export const DORES: Dor[] = [
  {
    id: "cansaco",
    label: "O cansaço que me esmaga",
    preScore: { sobrecarga: 2 },
    reply: "Eu te vejo. Esse peso nos ombros tem nome — é o seu corpo gritando o que a sua boca cala. Vamos entender juntas como esse alarme travou.",
  },
  {
    id: "oracao",
    label: "Minha oração não passa do teto",
    preScore: { vigilante: 2 },
    reply: "Não é que Deus não te ouve. É que existe um ruído por dentro abafando a voz d'Ele. Vamos descobrir de onde vem esse ruído.",
  },
  {
    id: "culpa",
    label: "Sinto culpa por querer sumir",
    preScore: { culposa: 2 },
    reply: "Querer sumir não é falta de amor pela sua família. É um coração que carrega mais do que devia. Ninguém aqui vai te julgar.",
  },
];

export const NAME_ASK = "Antes de darmos nome ao seu padrão, como posso te chamar? Quero falar diretamente com você.";
export const NAME_CTA = "Descobrir meu padrão →";

// ---------- CHAT DE VALIDAÇÃO ----------
/** Exibido após marcar a opção, antes da próxima pergunta. {nome} é substituído. */
export const FEEDBACKS: Record<string, Record<string, string>> = {
  situacao: {
    "casada-filhos-pequenos": "Entendi, {nome}. Quem cuida de filho pequeno raramente tem tempo de escutar a si mesma. Você reservou esses minutos — use com honestidade.",
    "casada-filhos-grandes": "Entendi, {nome}. Mãe de filho grande aprende que reclamar é fraqueza. Aqui não tem ninguém para te julgar.",
    "casada-sem-filhos": "Entendi, {nome}. Existe uma exaustão que aparece quando por fora 'está tudo certo' — e justamente por isso ninguém suspeita.",
    "mae-solo": "{nome}, sustentar uma casa sozinha já é peso suficiente. Algumas perguntas vão ser difíceis, mas só você pode responder por você.",
    "solteira": "{nome}, ansiedade não tem cara nem idade. Mulher solteira sofre em silêncio porque ninguém pergunta. Aqui, alguém está perguntando.",
  },
  risco: {
    funcionando: "\"Cansada, mas funcionando\" — {nome}, essa é a frase de quem segura tudo. Ser sincera é o primeiro passo do alívio.",
    dificil: "Dias difíceis e você continua de pé. Isso diz muito, {nome}. Agora vamos entender o que está drenando essa força.",
    sombrios: "{nome}, obrigada pela coragem de marcar isso. Você não está sozinha — e o que você sente tem caminho. Continua comigo.",
    crise: "{nome}, eu recebi isso com cuidado. Você deu um passo importante ao ser honesta. Vamos com calma, uma pergunta de cada vez.",
  },
  sintoma: {
    madrugada: "Acordar entre 3h e 5h não é insônia comum, {nome}. É o seu sistema fazendo a ronda da casa porque não sente segurança para desligar.",
    tensao: "Ombros, pescoço, mandíbula… {nome}, seu corpo está gritando o que sua boca cala. Esse cansaço mora onde dormir não alcança.",
    estomago: "Quando o estômago trava, é o sistema nervoso falando uma língua que poucos médicos traduzem. Você não está inventando, {nome}.",
    peito: "Peito apertado e a sensação de que algo ruim vem… isso tem nome técnico, {nome} — e tem caminho de saída.",
    todos: "Quando o corpo manifesta tudo, é porque um padrão dominante está disparando os outros. Vamos encontrar o seu, {nome}.",
  },
  comportamento: {
    checagem: "Checar a porta, o gás, a mensagem do filho… {nome}, você virou a sentinela da casa. E sentinela nenhuma aguenta o turno a vida inteira.",
    "aceitar-mais": "Mais uma tarefa, mais um cuidado, e você por último. {nome}, você tenta segurar tudo para nada desabar — e desaba por dentro.",
    oracao: "Você ora, relê, tenta confiar — e não passa. {nome}, isso não é falta de fé. É um alarme que oração nenhuma desliga sem o sinal certo.",
    cenarios: "Criar o diálogo difícil antes de acontecer é a mente tentando se proteger do golpe. Mas ela apanha duas vezes, {nome}: na imaginação e na vida.",
  },
  frase: {
    soltar: "\"Se eu soltar, algo ruim acontece.\" Essa frase é a corrente, {nome}. E correntes não se quebram com esforço — se quebram com verdade.",
    "nao-parar": "\"Não posso parar.\" {nome}, sabia que descansar também é um ato de obediência? Estamos chegando no seu veredito.",
    insuficiente: "\"Nunca sou suficiente.\" {nome}, quem plantou essa frase em você não foi Deus. Vamos arrancar essa raiz pelo nome.",
    pior: "\"E se acontecer o pior?\" — a pergunta que rouba o presente para pagar um futuro que quase nunca chega. Falta pouco, {nome}.",
  },
  espiritual: {
    "mente-nao-desliga": "Você tenta orar e a mente não desliga. Não é que Deus não te ouve, {nome} — é o ruído do alarme abafando a voz d'Ele.",
    "sirvo-muito": "Servir muito e sentir pouco… {nome}, você virou a Marta da casa. E o convite de Jesus continua de pé: escolher a boa parte.",
    "perdao-constante": "Pedir perdão o tempo todo é sinal de um coração sensível — que aprendeu a se acusar. {nome}, condenação não vem de Deus.",
    "medo-abandono": "Medo de abandono não é profecia, {nome}. É um alarme antigo. E alarme se desliga — vou te mostrar como.",
  },
  desejo: {
    dormir: "Dormir a noite inteira… {nome}, guarda esse desejo. Ele vai voltar já já — com um caminho do lado.",
    descansar: "Descansar sem culpa. {nome}, esse desejo é bíblico — e é exatamente para ele que existe um caminho.",
    orar: "Sentir Deus de novo. {nome}, esse é o desejo nº 1 das mulheres que passam por aqui. E ele tem resposta.",
    "parar-pior": "Parar de imaginar o pior. {nome}, a sua mente pode aprender um caminho novo — é literalmente Romanos 12:2.",
  },
};

// ---------- GATE WHATSAPP ----------
export const WHATS_GATE = {
  title: "{nome}, seu diagnóstico está pronto.",
  sub: "Deixa seu WhatsApp para eu te enviar o seu padrão completo e o caminho de saída — e você já vê tudo aqui na tela, agora.",
  cta: "Ver meu diagnóstico agora →",
  privacy: "🔒 Seus dados estão seguros. Nada de spam — apenas o seu resultado.",
};

// ---------- LOADING ----------
export const LOADING = {
  bridge: "{nome}, cada padrão tem um caminho específico de saída. Estou cruzando suas respostas para montar o seu…",
  proof: "Enquanto isso, veja o que aconteceu com mulheres que descobriram o delas:",
  steps: ["Analisando seus sintomas…", "Identificando seu padrão…", "Montando seu caminho de saída…"],
  durationMs: 9000,
};

// ---------- DEPOIMENTOS (MODELOS — ancorar em histórias reais antes de produção) ----------
export type Testimonial = { name: string; time: string; text: string; reactions?: string };
export const TESTIMONIALS: Testimonial[] = [
  { name: "Lúcia", time: "22:47", text: "Gente eu preciso contar. hj é meu décimo dia do protocolo e eu dormi a noite INTEIRA pela primeira vez em anos. acordei e chorei de gratidão viu 🙏❤️", reactions: "🙏 ❤️ 6" },
  { name: "Marta R.", time: "06:12", text: "Fiz a oração da manhã do volume 1 antes de todo mundo acordar. faz 8 dias que não acordo 3h da madrugada. só quem passa sabe o que é isso", reactions: "😭 4" },
  { name: "Ana Paula", time: "21:03", text: "eu confesso que estou sentindo muito forte todo poder que existe na oração. minha mandíbula soltou, meus ombros soltaram. glória a Deus pela sua vida viu ❤️" },
  { name: "Regina", time: "13:28", text: "Meu esposo perguntou o que mudou em mim kkk eu tava mais leve sem gritar com ninguém. mostrei o app pra ele e ele fez a noite comigo 🙏", reactions: "❤️ 8" },
  { name: "Cleide", time: "23:10", text: "sempre achei que era falta de fé minha. quando entendi que era o alarme travado eu chorei. Deus usou esse protocolo na minha vida", reactions: "🙏 3" },
  { name: "Sônia", time: "20:39", text: "no terceiro dia senti a presença de Deus na oração de novo. fazia TEMPO. já estou colhendo os frutos da minha fé viu ❤️🙏" },
];

// ---------- DICOTOMIA ----------
export const DICOTOMIA = {
  title: "{nome}, existe uma escolha na sua frente.",
  ladoA: { tag: "A Mula de Carga", emoji: "🔴", items: ["As sobras de paciência para quem você ama", "O alarme ligado dia e noite", "A fé secando no cansaço"] },
  ladoB: { tag: "A Filha Cuidada", emoji: "🟢", items: ["O turno rendido no colo do Pai", "O sono que volta a ser abrigo", "A Presença que você sente de novo"] },
  fecho: "Deus está rendendo o seu turno agora, {nome}. Você aceita o colo?",
  cta: "Aceito o colo do Pai →",
};

// ---------- OFERTA (copy nova; números de NEUROFE_OFFER/@prod) ----------
export const OFERTA_V2 = {
  chamada: "{nome}, este é o seu caminho de volta.",
  produto: "Rotina de Paz — Protocolo de 14 Encontros",
  passos: [
    { n: 1, titulo: "Render o corpo", texto: "Usamos o fôlego para calar o grito biológico. Se o corpo não silencia, a alma não ouve.", img: 2 },
    { n: 2, titulo: "Resetar a mente", texto: "Tiramos o seu cérebro do 'modo operacional' para sintonizar a paz (Romanos 12:2).", img: 3 },
    { n: 3, titulo: "Habitar no colo", texto: "Com o alarme desligado, a entrega finalmente 'gruda' — e você volta a sentir Deus de perto.", img: 4 },
  ],
  precoFrase: "Um investimento único de R$ 47 para render o seu plantão.",
  garantia: "Faça a sua primeira noite. Se você não sentir a primeira gota de paz, eu devolvo cada centavo — e você ainda fica com os áudios e bônus. Eu não quero o seu dinheiro se você não sentir o alívio que o Pai reservou para você.",
  garantiaDias: 15,
};
```

- [ ] **Step 2: Commit** — `git commit -m "feat(proto-v2): conteúdo completo — hero, feedbacks condicionais, depoimentos, dicotomia, oferta"`

---

### Task 3: Máquina de estados + testes (TDD)

**Files:** Create `prototype-v2/src/state.ts`, `prototype-v2/src/state.test.ts`

- [ ] **Step 1: testes primeiro (`state.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { reducer, initialState, pickFeedback, computeArchetype } from "./state";
import { DORES } from "./content";

describe("fluxo", () => {
  it("hero → name ao escolher dor, guardando pré-score", () => {
    const s = reducer(initialState, { type: "PICK_DOR", dor: DORES[0] });
    expect(s.stage).toBe("name");
    expect(s.preScore.sobrecarga).toBe(2);
  });
  it("name → questions com nome capitalizado", () => {
    let s = reducer(initialState, { type: "PICK_DOR", dor: DORES[1] });
    s = reducer(s, { type: "SET_NAME", name: "maria" });
    expect(s.stage).toBe("questions");
    expect(s.name).toBe("Maria");
  });
  it("última pergunta → whatsgate; whats → loading → result", () => {
    let s = { ...initialState, stage: "questions" as const, qIndex: 6 };
    s = reducer(s, { type: "ANSWER", key: "desejo", value: "orar" });
    expect(s.stage).toBe("whatsgate");
    s = reducer(s, { type: "SET_WHATS", whats: "19999999999" });
    expect(s.stage).toBe("loading");
    s = reducer(s, { type: "LOADING_DONE" });
    expect(s.stage).toBe("result");
  });
});

describe("pickFeedback", () => {
  it("substitui {nome} e usa o valor marcado", () => {
    const fb = pickFeedback("sintoma", "madrugada", "Rita");
    expect(fb).toContain("Rita");
    expect(fb).toContain("3h");
  });
});

describe("computeArchetype", () => {
  it("pré-score da dor desempata para o arquétipo do botão", () => {
    const answers = { sintoma: "todos" }; // 1 ponto para cada
    expect(computeArchetype(answers, { culposa: 2 })).toBe("culposa");
  });
  it("respostas fortes vencem o pré-score", () => {
    const answers = { sintoma: "peito", frase: "pior" }; // antecipatoria 3+4
    expect(computeArchetype(answers, { sobrecarga: 2 })).toBe("antecipatoria");
  });
});
```

- [ ] **Step 2: rodar e ver falhar** — `npm test` → FAIL (state.ts não existe)

- [ ] **Step 3: implementar `state.ts`**

```ts
import { QUESTIONS, type Archetype } from "@prod/data/quiz";
import { FEEDBACKS, type Dor } from "./content";

export type Stage = "hero" | "name" | "questions" | "whatsgate" | "loading" | "result" | "dicotomia" | "offer" | "checkout";

export type State = {
  stage: Stage;
  dor: Dor | null;
  preScore: Partial<Record<Archetype, number>>;
  name: string;
  whats: string;
  qIndex: number;
  answers: Record<string, string>;
};

export const initialState: State = {
  stage: "hero", dor: null, preScore: {}, name: "", whats: "", qIndex: 0, answers: {},
};

export type Action =
  | { type: "PICK_DOR"; dor: Dor }
  | { type: "SET_NAME"; name: string }
  | { type: "ANSWER"; key: string; value: string }
  | { type: "SET_WHATS"; whats: string }
  | { type: "LOADING_DONE" }
  | { type: "NEXT_STAGE" };

const ORDER: Stage[] = ["result", "dicotomia", "offer", "checkout"];

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "PICK_DOR":
      track("hero_intent", a.dor.id);
      return { ...s, dor: a.dor, preScore: a.dor.preScore, stage: "name" };
    case "SET_NAME": {
      const t = a.name.trim();
      return { ...s, name: t.charAt(0).toUpperCase() + t.slice(1), stage: "questions" };
    }
    case "ANSWER": {
      const answers = { ...s.answers, [a.key]: a.value };
      track("question", `${a.key}:${a.value}`);
      const last = s.qIndex >= QUESTIONS.length - 1;
      return { ...s, answers, qIndex: last ? s.qIndex : s.qIndex + 1, stage: last ? "whatsgate" : "questions" };
    }
    case "SET_WHATS":
      track("contact", "whats");
      return { ...s, whats: a.whats, stage: "loading" };
    case "LOADING_DONE":
      track("result", "");
      return { ...s, stage: "result" };
    case "NEXT_STAGE": {
      const i = ORDER.indexOf(s.stage);
      const next = ORDER[Math.min(i + 1, ORDER.length - 1)];
      track(next, "");
      return { ...s, stage: next };
    }
  }
}

export function pickFeedback(qKey: string, value: string, nome: string): string {
  const raw = FEEDBACKS[qKey]?.[value] ?? "";
  return raw.replaceAll("{nome}", nome || "amiga");
}

export function computeArchetype(
  answers: Record<string, string>,
  preScore: Partial<Record<Archetype, number>>
): Archetype {
  const score: Record<Archetype, number> = {
    vigilante: preScore.vigilante ?? 0, sobrecarga: preScore.sobrecarga ?? 0,
    culposa: preScore.culposa ?? 0, antecipatoria: preScore.antecipatoria ?? 0,
  };
  for (const q of QUESTIONS) {
    const v = answers[q.key];
    const opt = q.options.find((o) => o.value === v);
    if (opt?.scores) for (const [k, n] of Object.entries(opt.scores)) score[k as Archetype] += n ?? 0;
  }
  return (Object.entries(score).sort((a, b) => b[1] - a[1])[0][0]) as Archetype;
}

/** Protótipo: stages só no console (no porte vira save-quiz-session). */
export function track(stage: string, detail: string) {
  console.log(`[funnel] ${stage}`, detail);
}
```

- [ ] **Step 4: rodar e ver passar** — `npm test` → PASS (6 testes)
- [ ] **Step 5: Commit** — `git commit -m "feat(proto-v2): máquina de estados + pré-score com testes"`

---

### Task 4: Componentes base

**Files:** Create `prototype-v2/src/components/Placeholder.tsx`, `SpeechBubble.tsx`, `WhatsCard.tsx` (CSS já na Task 1)

- [ ] **Step 1: Placeholder.tsx**

```tsx
export function Placeholder({ n, ratio, label }: { n: number; ratio: "4/5" | "1/1"; label: string }) {
  return (
    <div className="ph" style={{ aspectRatio: ratio }}>
      <span className="ph-n">IMG #{n}</span>
      <span className="ph-label">{label}</span>
      <span className="ph-ratio">{ratio === "4/5" ? "1080×1350 (4:5)" : "1024×1024 (1:1)"}</span>
    </div>
  );
}
```

- [ ] **Step 2: SpeechBubble.tsx** (avatar real da Jaqueline via alias `@prod`)

```tsx
import type { ReactNode } from "react";
import avatar from "@prod/assets/jaqueline-avatar.webp";

export function SpeechBubble({ children }: { children: ReactNode }) {
  return (
    <div className="bubble-row fade-in">
      <img src={avatar} alt="Jaqueline" className="bubble-avatar" />
      <div className="bubble">{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: WhatsCard.tsx**

```tsx
import type { Testimonial } from "../content";

export function WhatsCard({ t }: { t: Testimonial }) {
  return (
    <div className="wa-card">
      <div className="wa-name">{t.name}</div>
      <p className="wa-text">{t.text}</p>
      <div className="wa-meta">
        {t.reactions && <span className="wa-react">{t.reactions}</span>}
        <span className="wa-time">{t.time} ✓✓</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit** — `git commit -m "feat(proto-v2): Placeholder, SpeechBubble e WhatsCard"`

---

### Task 5: Telas 1–4 (Hero, Name, Questions, WhatsGate)

**Files:** Create `prototype-v2/src/screens/Hero.tsx`, `Name.tsx`, `Questions.tsx`, `WhatsGate.tsx`

- [ ] **Step 1: Hero.tsx** — nada bloqueia o clique

```tsx
import { HERO, DORES, type Dor } from "../content";
import { Placeholder } from "../components/Placeholder";

export function Hero({ onPick }: { onPick: (d: Dor) => void }) {
  return (
    <div className="fade-in">
      <div style={{ maxWidth: 220, margin: "0 auto 16px" }}>
        <Placeholder n={1} ratio="4/5" label="Jaqueline — ambiente de paz" />
      </div>
      <h1 style={{ fontSize: "1.7rem", textAlign: "center" }}>{HERO.headline}</h1>
      <p style={{ margin: "12px 0 20px", textAlign: "center", color: "var(--grafite-suave)" }}>{HERO.sub}</p>
      <p style={{ fontWeight: 600, fontSize: ".9rem", textAlign: "center", marginBottom: 10 }}>{HERO.microLabel}</p>
      <div style={{ display: "grid", gap: 10 }}>
        {DORES.map((d) => (
          <button key={d.id} className="btn" onClick={() => onPick(d)}>{d.label}</button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Name.tsx**

```tsx
import { useState } from "react";
import { NAME_ASK, NAME_CTA, type Dor } from "../content";
import { SpeechBubble } from "../components/SpeechBubble";

export function Name({ dor, onSubmit }: { dor: Dor; onSubmit: (name: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="fade-in">
      <SpeechBubble>{dor.reply}</SpeechBubble>
      <SpeechBubble>{NAME_ASK}</SpeechBubble>
      <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v); }}>
        <input autoFocus value={v} onChange={(e) => setV(e.target.value)}
          placeholder="Digite seu primeiro nome" className="input" autoComplete="given-name" />
        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!v.trim()}>{NAME_CTA}</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Questions.tsx** — feedback 2,4s entre perguntas + progresso

```tsx
import { useState } from "react";
import { QUESTIONS } from "@prod/data/quiz";
import { pickFeedback } from "../state";
import { SpeechBubble } from "../components/SpeechBubble";

export function Questions({ qIndex, name, onAnswer }:
  { qIndex: number; name: string; onAnswer: (key: string, value: string) => void }) {
  const q = QUESTIONS[qIndex];
  const [feedback, setFeedback] = useState<string | null>(null);

  const pick = (value: string) => {
    setFeedback(pickFeedback(q.key, value, name));
    setTimeout(() => { setFeedback(null); onAnswer(q.key, value); }, 2400);
  };

  return (
    <div className="fade-in" key={q.key}>
      <div className="progress"><div className="progress-fill" style={{ width: `${((qIndex + 1) / QUESTIONS.length) * 100}%` }} /></div>
      {feedback ? (
        <SpeechBubble>{feedback}</SpeechBubble>
      ) : (
        <>
          <h2 style={{ fontSize: "1.3rem", margin: "18px 0 14px" }}>{q.prompt}</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {q.options.map((o) => (
              <button key={o.value} className="btn" onClick={() => pick(o.value)}>{o.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: WhatsGate.tsx**

```tsx
import { useState } from "react";
import { WHATS_GATE } from "../content";
import { SpeechBubble } from "../components/SpeechBubble";

export function WhatsGate({ name, onSubmit }: { name: string; onSubmit: (w: string) => void }) {
  const [v, setV] = useState("");
  const ok = v.replace(/\D/g, "").length >= 10;
  return (
    <div className="fade-in">
      <SpeechBubble>{WHATS_GATE.title.replaceAll("{nome}", name)}</SpeechBubble>
      <p style={{ margin: "6px 0 14px", color: "var(--grafite-suave)" }}>{WHATS_GATE.sub}</p>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onSubmit(v); }}>
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder="(DDD) 9 9999-9999"
          className="input" inputMode="tel" autoComplete="tel" autoFocus />
        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!ok}>{WHATS_GATE.cta}</button>
      </form>
      <p style={{ fontSize: ".78rem", marginTop: 10, textAlign: "center", color: "var(--grafite-suave)" }}>{WHATS_GATE.privacy}</p>
    </div>
  );
}
```

- [ ] **Step 5: Commit** — `git commit -m "feat(proto-v2): telas Hero, Name, Questions e WhatsGate"`

---

### Task 6: Tela 5 — Loading com ponte + carrossel

**Files:** Create `prototype-v2/src/screens/Loading.tsx`

- [ ] **Step 1: Loading.tsx**

```tsx
import { useEffect, useState } from "react";
import { LOADING, TESTIMONIALS } from "../content";
import { WhatsCard } from "../components/WhatsCard";

export function Loading({ name, onDone }: { name: string; onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [ti, setTi] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const p = Math.min(100, ((Date.now() - t0) / LOADING.durationMs) * 100);
      setPct(p);
      if (p >= 100) { clearInterval(iv); setTimeout(onDone, 400); }
    }, 100);
    const tv = setInterval(() => setTi((i) => (i + 1) % TESTIMONIALS.length), 3000);
    return () => { clearInterval(iv); clearInterval(tv); };
  }, [onDone]);

  const stepIdx = Math.min(LOADING.steps.length - 1, Math.floor((pct / 100) * LOADING.steps.length));

  return (
    <div className="fade-in" style={{ textAlign: "center" }}>
      <p style={{ margin: "24px 0 6px", fontWeight: 500 }}>{LOADING.bridge.replaceAll("{nome}", name)}</p>
      <div className="progress" style={{ margin: "14px 0 6px" }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p style={{ fontSize: ".85rem", color: "var(--grafite-suave)" }}>{LOADING.steps[stepIdx]}</p>
      <p style={{ margin: "26px 0 10px", fontSize: ".9rem", fontWeight: 600 }}>{LOADING.proof}</p>
      <div style={{ display: "flex", justifyContent: "center" }} key={ti} className="fade-in">
        <WhatsCard t={TESTIMONIALS[ti]} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit** — `git commit -m "feat(proto-v2): loading com ponte e carrossel de depoimentos WhatsApp"`

---

### Task 7: Telas 6–9 (Result, Dicotomia, Offer, Checkout)

**Files:** Create `prototype-v2/src/screens/Result.tsx`, `Dicotomia.tsx`, `Offer.tsx`, `Checkout.tsx`

- [ ] **Step 1: Result.tsx** — 3 cenas tap-to-advance com conteúdo real dos ARCHETYPES

```tsx
import { useState } from "react";
import { ARCHETYPES, type Archetype } from "@prod/data/quiz";
import { Placeholder } from "../components/Placeholder";
import { OFERTA_V2 } from "../content";

export function Result({ archetype, name, onDone }: { archetype: Archetype; name: string; onDone: () => void }) {
  const a = ARCHETYPES[archetype];
  const [scene, setScene] = useState(0);
  const next = () => (scene < 2 ? setScene(scene + 1) : onDone());

  return (
    <div className="fade-in" key={scene} onClick={next} style={{ cursor: "pointer" }}>
      <div className="stories-dots">{[0, 1, 2].map((i) => <span key={i} className={i <= scene ? "on" : ""} />)}</div>
      {scene === 0 && (
        <div>
          <p className="eyebrow">Diagnóstico concluído</p>
          <h2 style={{ fontSize: "1.6rem" }}>Seu padrão é <em style={{ color: "var(--terracota)" }}>{a.name}</em></h2>
          <p style={{ margin: "8px 0 16px", color: "var(--grafite-suave)" }}>{a.result.tagline}</p>
          <blockquote className="mirror">“{a.neurofe.espelho}”</blockquote>
          <p style={{ marginTop: 14 }} dangerouslySetInnerHTML={{ __html: a.result.happening }} />
        </div>
      )}
      {scene === 1 && (
        <div>
          <h2 style={{ fontSize: "1.4rem" }}>{a.result.truthTitle} <em style={{ color: "var(--ouro)" }}>{a.result.truthTitleEm}</em></h2>
          <p style={{ margin: "12px 0" }} dangerouslySetInnerHTML={{ __html: a.result.truthBody }} />
          <div className="verse"><span>{a.result.verseRef}</span><em>“{a.result.verseText}”</em></div>
          <p style={{ marginTop: 12, whiteSpace: "pre-line", fontStyle: "italic" }}>{a.result.seal}</p>
        </div>
      )}
      {scene === 2 && (
        <div>
          <h2 style={{ fontSize: "1.35rem", marginBottom: 12 }}>Os 3 passos da NeuroFé</h2>
          {OFERTA_V2.passos.map((p) => (
            <div key={p.n} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <div style={{ width: 88, flexShrink: 0 }}><Placeholder n={p.img} ratio="1/1" label={p.titulo} /></div>
              <div><strong>Passo {p.n} — {p.titulo}</strong><p style={{ fontSize: ".9rem", color: "var(--grafite-suave)" }}>{p.texto}</p></div>
            </div>
          ))}
        </div>
      )}
      <p className="tap-hint">toque para continuar →</p>
    </div>
  );
}
```

- [ ] **Step 2: Dicotomia.tsx**

```tsx
import { DICOTOMIA } from "../content";
import { Placeholder } from "../components/Placeholder";

export function Dicotomia({ name, onAccept }: { name: string; onAccept: () => void }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: "1.35rem", textAlign: "center", marginBottom: 16 }}>
        {DICOTOMIA.title.replaceAll("{nome}", name)}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[DICOTOMIA.ladoA, DICOTOMIA.ladoB].map((lado, i) => (
          <div key={lado.tag} className={i === 1 ? "lado-b" : undefined}>
            <Placeholder n={5 + i} ratio="4/5" label={lado.tag} />
            <p style={{ fontWeight: 600, margin: "8px 0 4px" }}>{lado.emoji} <em>{lado.tag}</em></p>
            <ul style={{ paddingLeft: 16, fontSize: ".82rem", color: "var(--grafite-suave)" }}>
              {lado.items.map((it) => <li key={it}>{it}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p style={{ textAlign: "center", margin: "20px 0 12px", fontFamily: "var(--serif)", fontSize: "1.15rem" }}>
        {DICOTOMIA.fecho.replaceAll("{nome}", name)}
      </p>
      <button className="btn btn-primary" onClick={onAccept}>{DICOTOMIA.cta}</button>
    </div>
  );
}
```

- [ ] **Step 3: Offer.tsx**

```tsx
import { NEUROFE_OFFER } from "@prod/data/quiz";
import { OFERTA_V2, TESTIMONIALS } from "../content";
import { Placeholder } from "../components/Placeholder";
import { WhatsCard } from "../components/WhatsCard";

const brl = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

export function Offer({ name, onBuy }: { name: string; onBuy: () => void }) {
  const total = NEUROFE_OFFER.valueStack.reduce((s, i) => s + i.cents, 0);
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: "1.4rem", textAlign: "center" }}>{OFERTA_V2.chamada.replaceAll("{nome}", name)}</h2>
      <div style={{ maxWidth: 240, margin: "16px auto" }}><Placeholder n={7} ratio="4/5" label="Jaqueline — convite ao colo" /></div>
      <h3 style={{ textAlign: "center", marginBottom: 12 }}>{OFERTA_V2.produto}</h3>
      <div className="stack">
        {NEUROFE_OFFER.valueStack.map((i) => (
          <div key={i.label} className="stack-row"><span>{i.label}</span><s>{brl(i.cents)}</s></div>
        ))}
        <div className="stack-row total"><span>Valor real</span><s>{brl(total)}</s></div>
      </div>
      <p style={{ textAlign: "center", margin: "14px 0 4px", fontSize: "1.05rem" }}>{OFERTA_V2.precoFrase}</p>
      <p style={{ textAlign: "center", fontSize: ".85rem", color: "var(--grafite-suave)" }}>
        ou {NEUROFE_OFFER.installments}× de {brl(NEUROFE_OFFER.installmentCents)}
      </p>
      <button className="btn btn-primary" style={{ margin: "16px 0" }} onClick={onBuy}>Quero render o meu plantão →</button>
      <h3 style={{ margin: "18px 0 10px" }}>Quem já rendeu o turno:</h3>
      <div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
        {TESTIMONIALS.map((t) => <WhatsCard key={t.name} t={t} />)}
      </div>
      <div className="verse" style={{ margin: "20px 0" }}>
        <span>🛡️ GARANTIA DE {OFERTA_V2.garantiaDias} DIAS</span>
        <em>{OFERTA_V2.garantia}</em>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Checkout.tsx**

```tsx
export function Checkout() {
  return (
    <div className="fade-in" style={{ textAlign: "center", paddingTop: 60 }}>
      <h2>✅ Protótipo completo</h2>
      <p style={{ color: "var(--grafite-suave)", marginTop: 8 }}>
        Em produção, este botão abre o CheckoutModal real (Pagar.me) já existente no Quiz-sacra.
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Commit** — `git commit -m "feat(proto-v2): Result stories, Dicotomia, Offer e Checkout placeholder"`

---

### Task 8: App.tsx — orquestração + validação local

**Files:** Create `prototype-v2/src/App.tsx`

- [ ] **Step 1: App.tsx**

```tsx
import { useReducer } from "react";
import { reducer, initialState, computeArchetype, track } from "./state";
import { Hero } from "./screens/Hero";
import { Name } from "./screens/Name";
import { Questions } from "./screens/Questions";
import { WhatsGate } from "./screens/WhatsGate";
import { Loading } from "./screens/Loading";
import { Result } from "./screens/Result";
import { Dicotomia } from "./screens/Dicotomia";
import { Offer } from "./screens/Offer";
import { Checkout } from "./screens/Checkout";

export default function App() {
  const [s, dispatch] = useReducer(reducer, initialState, (i) => { track("arrival", ""); return i; });
  const archetype = computeArchetype(s.answers, s.preScore);

  return (
    <div className="shell">
      {s.stage === "hero" && <Hero onPick={(dor) => dispatch({ type: "PICK_DOR", dor })} />}
      {s.stage === "name" && s.dor && <Name dor={s.dor} onSubmit={(name) => dispatch({ type: "SET_NAME", name })} />}
      {s.stage === "questions" && <Questions qIndex={s.qIndex} name={s.name} onAnswer={(key, value) => dispatch({ type: "ANSWER", key, value })} />}
      {s.stage === "whatsgate" && <WhatsGate name={s.name} onSubmit={(whats) => dispatch({ type: "SET_WHATS", whats })} />}
      {s.stage === "loading" && <Loading name={s.name} onDone={() => dispatch({ type: "LOADING_DONE" })} />}
      {s.stage === "result" && <Result archetype={archetype} name={s.name} onDone={() => dispatch({ type: "NEXT_STAGE" })} />}
      {s.stage === "dicotomia" && <Dicotomia name={s.name} onAccept={() => dispatch({ type: "NEXT_STAGE" })} />}
      {s.stage === "offer" && <Offer name={s.name} onBuy={() => dispatch({ type: "NEXT_STAGE" })} />}
      {s.stage === "checkout" && <Checkout />}
    </div>
  );
}
```

- [ ] **Step 2: build limpo** — `npm run build` → sem erros TS, `dist/` gerado.
- [ ] **Step 3: teste manual local** — `npm run dev` + Chrome DevTools MCP (mobile 390×844): fluxo completo dor→nome→7 respostas→whats→loading→3 cenas→dicotomia→oferta; screenshot por tela.
- [ ] **Step 4: Commit** — `git commit -m "feat(proto-v2): App completo — fluxo das 9 telas navegável"`

---

### Task 9: Deploy preview no Cloudflare Pages

- [ ] **Step 1: build** — `cd ~/Quiz-sacra/prototype-v2 && npm run build`
- [ ] **Step 2: deploy** — `npx wrangler pages deploy dist --project-name=sacra-v2-preview --branch=main`
  - Se pedir auth: avisar o dono para rodar `npx wrangler login` (não contornar).
  - Expected: URL `https://sacra-v2-preview.pages.dev`
- [ ] **Step 3: smoke test na URL pública** — Chrome DevTools MCP mobile, fluxo completo, screenshots.

---

### Task 10: `docs/IMAGE-PROMPTS-V2.md` — prompts para o dono

**Files:** Create `docs/IMAGE-PROMPTS-V2.md`

- [ ] **Step 1: escrever doc completo**

```markdown
# Prompts de Imagem — Quiz v2 (gerar no ChatGPT)

## Bloco de estilo (colar ANTES de cada prompt)
> Fotografia editorial realista, luz dourada suave de fim de tarde, paleta terracota/areia/ouro,
> tom quente e acolhedor, estética de bem-estar premium cristão (sem clichê religioso exagerado),
> mulher brasileira de 45–60 anos, pele com textura real, SEM texto na imagem, SEM marca d'água,
> mãos anatomicamente corretas.

## IMG #1 — Hero: Jaqueline em paz (1080×1350, 4:5)
⚠️ PREFERIR FOTO REAL da Jaqueline (tratada com a paleta). Se gerar:
"Retrato 4:5 de mulher brasileira ~50 anos, sorriso sereno e acolhedor, olhando diretamente
para a câmera, sentada em poltrona de linho cru perto de janela com luz dourada, Bíblia
fechada no colo, fundo desfocado em tons areia."

## IMG #2 — Passo 1 · Render o corpo (1024×1024, 1:1)
"Close 1:1 de mulher brasileira ~50 anos de olhos fechados, respirando fundo com a mão no
peito, expressão de alívio genuíno, luz dourada lateral, fundo areia desfocado."

## IMG #3 — Passo 2 · Resetar a mente (1024×1024, 1:1)
"Imagem 1:1 conceitual suave: perfil de mulher madura em contraluz dourada, partículas de luz
douradas delicadas ao redor da cabeça sugerindo renovação da mente, fundo em degradê
terracota→areia, estilo editorial (não sci-fi)."

## IMG #4 — Passo 3 · Habitar no colo (1024×1024, 1:1)
"Imagem 1:1: mulher madura descansando a cabeça, envolta em manta cor areia, expressão de
paz profunda, luz âmbar de entardecer entrando pela janela, sensação de abraço e segurança."

## IMG #5 — Dicotomia A · Mula de Carga (1080×1350, 4:5)
"Retrato 4:5, luz fria acinzentada: mulher brasileira ~50 anos exausta na cozinha à noite,
apoiada na pia, olhar distante, louça acumulada desfocada ao fundo, ombros caídos,
tom dessaturado (única imagem fria do conjunto)."

## IMG #6 — Dicotomia B · Filha Cuidada (1080×1350, 4:5)
"Retrato 4:5, luz dourada de manhã: a MESMA mulher descansada, tomando café perto da janela
com leve sorriso de paz, plantas e luz natural, postura ereta e leve, paleta areia/ouro."

## IMG #7 — Oferta: convite ao colo (1080×1350, 4:5)
⚠️ PREFERIR FOTO REAL da Jaqueline. Se gerar:
"Retrato 4:5 de mulher brasileira ~50 anos estendendo a mão para a câmera em gesto de
convite, sorriso caloroso, ambiente interno com luz dourada, tons terracota e areia."

## Como entregar
Salve como JPG/WebP com os nomes: `img1-hero.webp`, `img2-corpo.webp`, `img3-mente.webp`,
`img4-colo.webp`, `img5-mula.webp`, `img6-filha.webp`, `img7-oferta.webp` e me envie —
eu substituo os placeholders (que mostram o nº de cada prompt na tela).
```

- [ ] **Step 2: Commit** — `git commit -m "docs(proto-v2): prompts de imagem numerados para geração"`

---

## Self-Review (executado na escrita)

- **Spec coverage:** 9 telas ✓ · `hero_intent` (console no protótipo; real no porte) ✓ · placeholders com proporção ✓ · depoimentos modelo com aviso de ancoragem ✓ · oferta com números reais via `@prod` ✓ · deploy preview ✓ · prompts numerados ✓. Fora de escopo respeitado (CAPI, campanha Meta, quiz atual intocado).
- **Placeholder scan:** nenhum TBD; toda copy escrita por extenso.
- **Type consistency:** `Dor`, `State`, `Action`, `Stage`, `pickFeedback`, `computeArchetype`, `track` consistentes entre Tasks 2/3/5/6/7/8; `Testimonial` entre Tasks 2/4/6/7.
