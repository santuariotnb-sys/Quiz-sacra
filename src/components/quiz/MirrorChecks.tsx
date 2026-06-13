import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { MirrorChecks as MirrorChecksData } from "@/data/quiz";

function CheckItem({ text, delay }: { text: string; delay: number }) {
  return (
    <motion.li
      className="flex items-start gap-3"
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <motion.span
        className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] border-2 border-[color:var(--gold-warm)]"
        initial={{ backgroundColor: "transparent" }}
        whileInView={{ backgroundColor: "var(--gold-warm)" }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: delay + 0.4 }}
      >
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.2, delay: delay + 0.5 }}
        >
          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        </motion.span>
      </motion.span>
      <span className="text-[16px] leading-relaxed text-[color:var(--deep-purple)]">
        {text}
      </span>
    </motion.li>
  );
}

export function MirrorChecksSection({
  mirrorChecks,
  bridge,
}: {
  mirrorChecks: MirrorChecksData;
  bridge: string | null;
}) {
  const checks = [
    mirrorChecks.symptom,
    bridge || mirrorChecks.behavior,
    bridge ? mirrorChecks.behavior : null,
  ].filter(Boolean) as string[];

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--deep-purple)]">
        {"Me diz se não é assim:"}
      </p>
      <ul className="mt-5 space-y-4">
        {checks.map((text, i) => (
          <CheckItem key={i} text={text} delay={i * 0.6} />
        ))}
      </ul>
      <motion.p
        className="mt-6 text-center font-display text-[15px] italic text-[color:var(--amethyst)]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: checks.length * 0.6 + 0.3 }}
      >
        {"Você não contou nada disso. Suas respostas contaram."}
      </motion.p>
    </div>
  );
}
