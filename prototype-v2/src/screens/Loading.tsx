import { useEffect, useState } from "react";
import { LOADING, TESTIMONIALS } from "../content";
import { WhatsCard } from "../components/WhatsCard";

export function Loading({ name, onDone }: { name: string; onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const [ti, setTi] = useState(0);

  useEffect(() => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      const p = Math.min(100, ((Date.now() - t0) / LOADING.durationMs) * 100);
      setPct(p);
      if (p >= 100) { clearInterval(iv); setTimeout(onDone, 400); }
    }, 100);
    const tv = setInterval(() => setTi((i) => (i + 1) % TESTIMONIALS.length), 3000);
    return () => { clearInterval(iv); clearInterval(tv); };
  }, [onDone]);

  const stepIdx = Math.min(LOADING.steps.length - 1, Math.floor((pct / 100) * LOADING.steps.length));

  return (
    <div className="fade-in" style={{ textAlign: "center" }}>
      <p style={{ margin: "24px 0 6px", fontWeight: 500 }}>{LOADING.bridge.replaceAll("{nome}", name)}</p>
      <div className="progress" style={{ margin: "14px 0 6px" }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p style={{ fontSize: ".85rem", color: "var(--grafite-suave)" }}>{LOADING.steps[stepIdx]}</p>
      <p style={{ margin: "26px 0 10px", fontSize: ".9rem", fontWeight: 600 }}>{LOADING.proof}</p>
      <div style={{ display: "flex", justifyContent: "center" }} key={ti} className="fade-in">
        <WhatsCard t={TESTIMONIALS[ti]} />
      </div>
    </div>
  );
}
