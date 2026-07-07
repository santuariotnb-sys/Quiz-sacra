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
