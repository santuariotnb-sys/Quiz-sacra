import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NAME_ASK, NAME_CTA, type Dor } from "../content";
import { SpeechBubble, TypingBubble } from "../components/SpeechBubble";

export function Name({ dor, onSubmit }: { dor: Dor; onSubmit: (name: string) => void }) {
  const [v, setV] = useState("");
  const [askVisible, setAskVisible] = useState(false);

  // Segunda mensagem chega após um "digitando…" curto (forma não bloqueia: já visível).
  useEffect(() => {
    const t = setTimeout(() => setAskVisible(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <SpeechBubble>{dor.reply}</SpeechBubble>
      <AnimatePresence mode="wait">
        {askVisible ? (
          <motion.div key="ask" initial={false}>
            <SpeechBubble>{NAME_ASK}</SpeechBubble>
          </motion.div>
        ) : (
          <TypingBubble key="typing" />
        )}
      </AnimatePresence>
      <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v); }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <input autoFocus value={v} onChange={(e) => setV(e.target.value)}
            placeholder="Digite seu primeiro nome" className="input" autoComplete="given-name" />
          <motion.button
            className="btn-primary btn"
            style={{ marginTop: 14 }}
            disabled={!v.trim()}
            whileTap={{ scale: 0.97 }}
          >
            {NAME_CTA}
          </motion.button>
        </motion.div>
      </form>
    </div>
  );
}
