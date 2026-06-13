import { motion } from "framer-motion";
import type { MechanismData, ArchetypeChapter } from "@/data/quiz";

function PulsePoint({ fast }: { fast: boolean }) {
  return (
    <span className="relative inline-flex h-3 w-3">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full"
        style={{ backgroundColor: fast ? "#D4A04A" : "#C9A876" }}
        animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
        transition={{
          duration: fast ? 0.9 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <span
        className="relative inline-flex h-3 w-3 rounded-full"
        style={{ backgroundColor: fast ? "#D4A04A" : "#C9A876" }}
      />
    </span>
  );
}

export function AlarmeDiagram({
  mechanism,
  chapters,
}: {
  mechanism: MechanismData;
  chapters: ArchetypeChapter[];
}) {
  const ch1 = chapters[0];
  const ch2 = chapters[1];

  return (
    <div className="space-y-4">
      {/* ALARME LIGADO */}
      <div className="rdp-night rounded-[16px] px-6 py-6">
        <div className="flex items-center gap-2.5">
          <PulsePoint fast />
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#D4A04A]">
            Alarme ligado
          </p>
        </div>
        <ul className="mt-4 space-y-2.5">
          {mechanism.alarmOn.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[16px] leading-relaxed text-[#F4E9EE]/90">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A04A]/70" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* TRANSIÇÃO — nome do mecanismo */}
      <div className="flex flex-col items-center gap-2 py-2">
        <span className="h-6 w-px bg-gradient-to-b from-[color:var(--gold-warm)] to-[color:var(--gold-warm)]/30" />
        <p className="text-center font-display text-[20px] font-semibold text-[color:var(--gold-warm)]">
          O Desligamento do Alarme
        </p>
        <p className="text-center text-[14px] leading-relaxed text-[color:var(--amethyst)]">
          14 sinais em 7 dias — 1 áudio de manhã + 1 à noite
        </p>
        {ch1 && ch2 && (
          <p className="mt-1 text-center text-[13px] leading-relaxed text-[color:var(--amethyst)]/80">
            {ch1.title} (manhã) + {ch2.title} (noite)
          </p>
        )}
        <span className="h-6 w-px bg-gradient-to-b from-[color:var(--gold-warm)]/30 to-[color:var(--gold-warm)]" />
      </div>

      {/* ALARME DESLIGADO */}
      <div className="rounded-[16px] border border-[color:var(--gold-warm)]/20 bg-[color:var(--milk-warm)] px-6 py-6">
        <div className="flex items-center gap-2.5">
          <PulsePoint fast={false} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--gold-warm)]">
            Alarme desligado
          </p>
        </div>
        <ul className="mt-4 space-y-2.5">
          {mechanism.alarmOff.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[16px] leading-relaxed text-[color:var(--deep-purple)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--gold-warm)]" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
