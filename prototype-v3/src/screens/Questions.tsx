import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QUESTIONS } from "@prod/data/quiz";
import { pickFeedback } from "../state";
import { SpeechBubble, TypingBubble } from "../components/SpeechBubble";

type Phase = "idle" | "picked" | "typing" | "feedback";

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 24 } },
} as const;

export function Questions({ qIndex, name, onAnswer }:
  { qIndex: number; name: string; onAnswer: (key: string, value: string) => void }) {
  const q = QUESTIONS[qIndex];
  const [phase, setPhase] = useState<Phase>("idle");
  const [picked, setPicked] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  useEffect(() => { setPhase("idle"); setPicked(null); }, [qIndex]);

  const pick = (value: string) => {
    if (phase !== "idle") return;
    setPicked(value);
    setPhase("picked");                                    // opção pulsa ouro
    timers.current.push(window.setTimeout(() => setPhase("typing"), 450));   // "digitando…"
    timers.current.push(window.setTimeout(() => setPhase("feedback"), 450 + 700));
    timers.current.push(window.setTimeout(() => onAnswer(q.key, value), 450 + 700 + 2400));
  };

  const feedback = picked ? pickFeedback(q.key, picked, name) : "";

  return (
    <div key={q.key}>
      <div className="progress" style={{ marginBottom: 20 }}>
        <motion.div
          className="progress-fill"
          initial={false}
          animate={{ width: `${((qIndex + 1) / QUESTIONS.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

      <AnimatePresence mode="wait">
        {phase === "typing" ? (
          <TypingBubble key="typing" />
        ) : phase === "feedback" ? (
          <motion.div key="feedback" initial={false}>
            <SpeechBubble>{feedback}</SpeechBubble>
          </motion.div>
        ) : (
          <motion.div
            key={`q-${q.key}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 style={{ fontSize: "1.32rem", margin: "4px 0 16px" }}>{q.prompt}</h2>
            <motion.div variants={list} initial="hidden" animate="show" style={{ display: "grid", gap: 11 }}>
              {q.options.map((o) => (
                <motion.button
                  key={o.value}
                  variants={item}
                  className={`btn${picked === o.value ? " picked" : ""}`}
                  whileTap={{ scale: 0.97 }}
                  animate={picked === o.value ? { scale: [1, 1.03, 1] } : undefined}
                  transition={picked === o.value ? { duration: 0.4 } : undefined}
                  onClick={() => pick(o.value)}
                >
                  {o.label}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
