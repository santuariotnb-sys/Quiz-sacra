import { useState } from "react";
import { motion } from "framer-motion";
import { WHATS_GATE } from "../content";
import { SpeechBubble } from "../components/SpeechBubble";

export function WhatsGate({ name, onSubmit }: { name: string; onSubmit: (w: string) => void }) {
  const [v, setV] = useState("");
  const ok = v.replace(/\D/g, "").length >= 10;
  return (
    <div>
      <SpeechBubble>{WHATS_GATE.title.replaceAll("{nome}", name)}</SpeechBubble>
      <motion.p
        className="text-suave"
        style={{ margin: "8px 0 16px", lineHeight: 1.55 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {WHATS_GATE.sub}
      </motion.p>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onSubmit(v); }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <input value={v} onChange={(e) => setV(e.target.value)} placeholder="(DDD) 9 9999-9999"
            className="input" inputMode="tel" autoComplete="tel" autoFocus />
          <motion.button className="btn-primary btn" style={{ marginTop: 14 }} disabled={!ok} whileTap={{ scale: 0.97 }}>
            {WHATS_GATE.cta}
          </motion.button>
        </motion.div>
      </form>
      <p className="text-suave" style={{ fontSize: ".78rem", marginTop: 12, textAlign: "center" }}>{WHATS_GATE.privacy}</p>
    </div>
  );
}
