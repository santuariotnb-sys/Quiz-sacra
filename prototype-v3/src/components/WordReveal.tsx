import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const word = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 24 } },
} as const;

/** Headline que revela palavra por palavra (stagger 80ms). */
export function WordReveal({ text, className }: { text: string; className?: string }) {
  return (
    <motion.span
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
      style={{ display: "inline-block" }}
      aria-label={text}
    >
      {text.split(" ").map((w, i) => (
        <motion.span key={i} variants={word} style={{ display: "inline-block", marginRight: "0.28em" }}>
          {w}
        </motion.span>
      ))}
    </motion.span>
  );
}
