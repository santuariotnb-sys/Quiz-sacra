import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LOADING, TESTIMONIALS } from "../content";
import { WaApp, WaMessage } from "../components/WhatsApp";

const R = 62;
const C = 2 * Math.PI * R;
const MSG_COUNT = 3; // notificações que "chegam" durante o loading

export function Loading({ name, onDone }: { name: string; onDone: () => void }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const p = Math.min(100, ((Date.now() - t0) / LOADING.durationMs) * 100);
      setPct(p);
      if (p >= 100) { clearInterval(iv); setTimeout(onDone, 500); }
    }, 100);
    return () => clearInterval(iv);
  }, [onDone]);

  const stepIdx = Math.min(LOADING.steps.length - 1, Math.floor((pct / 100) * LOADING.steps.length));
  const visible = Math.min(MSG_COUNT, Math.floor((pct / 100) * (MSG_COUNT + 1)));

  return (
    <div style={{ textAlign: "center" }}>
      <motion.p
        style={{ margin: "14px 0 4px", fontWeight: 500, lineHeight: 1.5 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {LOADING.bridge.replaceAll("{nome}", name)}
      </motion.p>

      {/* Anel circular dourado com % */}
      <div className="ring-wrap">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r={R} fill="none" stroke="rgba(227,199,123,.16)" strokeWidth="7" />
          <circle
            cx="75" cy="75" r={R} fill="none"
            stroke="url(#gold)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
          />
          <defs>
            <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E3C77B" />
              <stop offset="100%" stopColor="#D4AF37" />
            </linearGradient>
          </defs>
        </svg>
        <div className="ring-pct">{Math.round(pct)}%</div>
      </div>

      <motion.p
        key={stepIdx}
        className="text-suave"
        style={{ fontSize: ".85rem", minHeight: 22 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {LOADING.steps[stepIdx]}
      </motion.p>

      <p style={{ margin: "24px 0 10px", fontSize: ".9rem", fontWeight: 600, color: "var(--ouro)" }}>
        {LOADING.proof}
      </p>

      {/* Notificações WhatsApp "chegando" */}
      <div style={{ textAlign: "left" }}>
        <WaApp>
          {TESTIMONIALS.slice(0, Math.max(visible, 1)).map((t) => (
            <WaMessage key={t.name} t={t} />
          ))}
        </WaApp>
      </div>
    </div>
  );
}
