// Identidade do quiz (workspaces multi-quiz — Fase 1).
// Resolvida em BUILD via env, não em runtime: cada quiz é 1 bundle por path.
// Defaults = 'sacra' → o build atual continua idêntico sem nenhuma env setada.
// Para um 2º quiz: setar VITE_QUIZ_ID/VITE_PIXEL_ID/VITE_EXTERNAL_ID_PREFIX no
// build daquele path (Fase 4). Ver docs/DESIGN-workspaces-multi-quiz.md.

export const QUIZ_ID =
  (import.meta.env.VITE_QUIZ_ID as string | undefined) || "sacra";

export const PIXEL_ID =
  (import.meta.env.VITE_PIXEL_ID as string | undefined) || "863734499693171";

export const EXTERNAL_ID_PREFIX =
  (import.meta.env.VITE_EXTERNAL_ID_PREFIX as string | undefined) || "qs_";
