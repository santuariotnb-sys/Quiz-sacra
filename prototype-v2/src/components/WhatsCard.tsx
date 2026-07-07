import type { Testimonial } from "../content";

export function WhatsCard({ t }: { t: Testimonial }) {
  return (
    <div className="wa-card">
      <div className="wa-name">{t.name}</div>
      <p className="wa-text">{t.text}</p>
      <div className="wa-meta">
        {t.reactions && <span className="wa-react">{t.reactions}</span>}
        <span className="wa-time">{t.time} ✓✓</span>
      </div>
    </div>
  );
}
