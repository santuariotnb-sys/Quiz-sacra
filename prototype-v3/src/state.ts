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
