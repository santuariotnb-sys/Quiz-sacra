import type { ReactNode } from "react";
import avatar from "@prod/assets/jaqueline-avatar.webp";

export function SpeechBubble({ children }: { children: ReactNode }) {
  return (
    <div className="bubble-row fade-in">
      <img src={avatar} alt="Jaqueline" className="bubble-avatar" />
      <div className="bubble">{children}</div>
    </div>
  );
}
