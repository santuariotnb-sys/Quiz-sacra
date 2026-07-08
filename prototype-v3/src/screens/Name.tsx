import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NAME_ASK, NAME_CTA, type Dor } from "../content";
import { SpeechBubble, TypingBubble } from "../components/SpeechBubble";

export function Name({ dor, onSubmit }: { dor: Dor; onSubmit: (name: string) => void }) {
  const [v, setV] = useState("");
  // Sequência de chat: 0 = digitando… · 1 = balão 1 + digitando… · 2 = balão 1 + balão 2
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 900);
    const t2 = setTimeout(() => setPhase(2), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div>
      <AnimatePresence mode="popLayout">
        {phase === 0 && <TypingBubble key="typing-1" />}
        {phase >= 1 && <SpeechBubble key="msg-1">{dor.reply}</SpeechBubble>}
        {phase === 1 && <TypingBubble key="typing-2" showAvatar={false} />}
        {phase >= 2 && <SpeechBubble key="msg-2" showAvatar={false}>{NAME_ASK}</SpeechBubble>}
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
