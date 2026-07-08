import type { ReactNode } from "react";
import { motion } from "framer-motion";
import avatar from "@prod/assets/jaqueline-avatar.webp";

const spring = { type: "spring", stiffness: 380, damping: 26 } as const;

/** Balão da Jaqueline com entrada em spring (avatar + bolha). */
export function SpeechBubble({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      className="bubble-row"
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay }}
    >
      <img src={avatar} alt="Jaqueline" className="bubble-avatar" />
      <div className="bubble">{children}</div>
    </motion.div>
  );
}

/** Indicador "Jaqueline está digitando" — 3 pontinhos animados. */
export function TypingBubble() {
  return (
    <motion.div
      className="bubble-row"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <img src={avatar} alt="Jaqueline" className="bubble-avatar" />
      <div className="bubble bubble-typing" aria-label="Jaqueline está digitando">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="typing-dot"
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}
