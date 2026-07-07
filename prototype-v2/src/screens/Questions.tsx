import { useState } from "react";
import { QUESTIONS } from "@prod/data/quiz";
import { pickFeedback } from "../state";
import { SpeechBubble } from "../components/SpeechBubble";

export function Questions({ qIndex, name, onAnswer }:
  { qIndex: number; name: string; onAnswer: (key: string, value: string) => void }) {
  const q = QUESTIONS[qIndex];
  const [feedback, setFeedback] = useState<string | null>(null);

  const pick = (value: string) => {
    setFeedback(pickFeedback(q.key, value, name));
    setTimeout(() => { setFeedback(null); onAnswer(q.key, value); }, 2400);
  };

  return (
    <div className="fade-in" key={q.key}>
      <div className="progress"><div className="progress-fill" style={{ width: `${((qIndex + 1) / QUESTIONS.length) * 100}%` }} /></div>
      {feedback ? (
        <SpeechBubble>{feedback}</SpeechBubble>
      ) : (
        <>
          <h2 style={{ fontSize: "1.3rem", margin: "18px 0 14px" }}>{q.prompt}</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {q.options.map((o) => (
              <button key={o.value} className="btn" onClick={() => pick(o.value)}>{o.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
