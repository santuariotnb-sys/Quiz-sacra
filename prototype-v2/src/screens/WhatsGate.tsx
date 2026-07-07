import { useState } from "react";
import { WHATS_GATE } from "../content";
import { SpeechBubble } from "../components/SpeechBubble";

export function WhatsGate({ name, onSubmit }: { name: string; onSubmit: (w: string) => void }) {
  const [v, setV] = useState("");
  const ok = v.replace(/\D/g, "").length >= 10;
  return (
    <div className="fade-in">
      <SpeechBubble>{WHATS_GATE.title.replaceAll("{nome}", name)}</SpeechBubble>
      <p style={{ margin: "6px 0 14px", color: "var(--grafite-suave)" }}>{WHATS_GATE.sub}</p>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onSubmit(v); }}>
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder="(DDD) 9 9999-9999"
          className="input" inputMode="tel" autoComplete="tel" autoFocus />
        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!ok}>{WHATS_GATE.cta}</button>
      </form>
      <p style={{ fontSize: ".78rem", marginTop: 10, textAlign: "center", color: "var(--grafite-suave)" }}>{WHATS_GATE.privacy}</p>
    </div>
  );
}
