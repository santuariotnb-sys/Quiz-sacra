import { motion } from "framer-motion";
import { HERO, DORES, type Dor } from "../content";
import { Placeholder } from "../components/Placeholder";
import { WordReveal } from "../components/WordReveal";
import { Particles } from "../components/Particles";

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } },
};
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as const;

export function Hero({ onPick }: { onPick: (d: Dor) => void }) {
  return (
    <div style={{ position: "relative" }}>
      <Particles />
      <motion.div
        style={{ maxWidth: 220, margin: "0 auto 18px" }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <Placeholder n={1} ratio="4/5" label="Jaqueline — ambiente de paz" />
      </motion.div>

      <h1 style={{ fontSize: "1.75rem", textAlign: "center" }}>
        <WordReveal text={HERO.headline} />
      </h1>

      <motion.p
        className="text-suave"
        style={{ margin: "14px 0 22px", textAlign: "center", lineHeight: 1.55 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
      >
        {HERO.sub}
      </motion.p>

      <motion.p
        style={{ fontWeight: 600, fontSize: ".9rem", textAlign: "center", marginBottom: 12, color: "var(--ouro)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        {HERO.microLabel}
      </motion.p>

      <motion.div variants={list} initial="hidden" animate="show" style={{ display: "grid", gap: 12 }}>
        {DORES.map((d, i) => (
          <motion.button
            key={d.id}
            className="btn"
            variants={item}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick(d)}
            /* glow pulsante sutil, defasado por botão — via opacity da sombra (pseudo em CSS custaria box-shadow; aqui usamos animação de opacity num filho) */
            style={{ position: "relative", overflow: "hidden" }}
          >
            <motion.span
              aria-hidden
              style={{
                position: "absolute", inset: 0, borderRadius: 14, pointerEvents: "none",
                boxShadow: "inset 0 0 24px rgba(227,199,123,.28)",
              }}
              animate={{ opacity: [0.2, 0.85, 0.2] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
            />
            {d.label}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
