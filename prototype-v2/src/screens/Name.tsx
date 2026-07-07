import { useState } from "react";
import { NAME_ASK, NAME_CTA, type Dor } from "../content";
import { SpeechBubble } from "../components/SpeechBubble";

export function Name({ dor, onSubmit }: { dor: Dor; onSubmit: (name: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="fade-in">
      <SpeechBubble>{dor.reply}</SpeechBubble>
      <SpeechBubble>{NAME_ASK}</SpeechBubble>
      <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v); }}>
        <input autoFocus value={v} onChange={(e) => setV(e.target.value)}
          placeholder="Digite seu primeiro nome" className="input" autoComplete="given-name" />
        <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!v.trim()}>{NAME_CTA}</button>
      </form>
    </div>
  );
}
