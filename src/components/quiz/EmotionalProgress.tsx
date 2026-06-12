import { motion } from "framer-motion";
import { QUESTIONS } from "@/data/quiz";

// G3: Mapa Zeigarnik — progresso inicial rápido, desacelera no fim.
// Índice = qIndex (0-based), loading = QUESTIONS.length.
const PROGRESS_MAP: number[] = [22, 38, 52, 65, 78, 90, 97];

function getProgress(qIndex: number): number {
  if (qIndex >= QUESTIONS.length) return 100; // loading
  return PROGRESS_MAP[qIndex] ?? Math.min(100, ((qIndex + 1) / QUESTIONS.length) * 100);
}

// G2: Extrai pills acumuladas das respostas (nunca inclui risco).
// Mostra a partir da P3 (qIndex >= 2). Máx 3 pills.
const PILL_KEYS_ORDER = ["situacao", "sintoma", "comportamento"];

function getPills(answers: Record<string, string>, qIndex: number): string[] {
  if (qIndex < 2) return [];
  const pills: string[] = [];
  for (const key of PILL_KEYS_ORDER) {
    if (pills.length >= 3) break;
    const val = answers[key];
    if (!val) continue;
    const q = QUESTIONS.find((q) => q.key === key);
    const opt = q?.options.find((o) => o.value === val);
    if (opt?.pill) pills.push(opt.pill);
  }
  return pills;
}

export function EmotionalProgress({
  current,
  total,
  answers,
}: {
  current: number;
  total: number;
  answers: Record<string, string>;
}) {
  const qIndex = current - 1;
  const pct = getProgress(qIndex);
  const pills = getPills(answers, qIndex);

  return (
    <div className="w-full">
      {/* Pills acumulando (G2) */}
      {pills.length > 0 && (
        <div className="mb-2.5 flex flex-wrap justify-center gap-1.5">
          {pills.map((p) => (
            <span
              key={p}
              className="rounded-full bg-[color:var(--lavender)]/20 px-2.5 py-0.5 text-[11px] text-[color:var(--amethyst)]"
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Barra Zeigarnik (G3) */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--milk-warm)]">
        <motion.div
          className="rdp-gradient-progress absolute inset-y-0 left-0 rounded-full"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
        <div className="absolute inset-0 flex">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="flex-1 border-r border-white/60 last:border-r-0"
              aria-hidden
            />
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-xs tracking-wide text-[color:var(--amethyst)]">
        Você está conhecendo sua paz · {Math.max(1, current)} de {total}
      </p>
    </div>
  );
}
