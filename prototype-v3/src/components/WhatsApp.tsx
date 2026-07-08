import type { ReactNode } from "react";
import { motion } from "framer-motion";
import avatar from "@prod/assets/jaqueline-avatar.webp";
import type { Testimonial } from "../content";

/* Nomes coloridos como no WhatsApp real (paleta de grupos, dark). */
const NAME_COLORS = ["#F5A97F", "#53BDEB", "#A5B337", "#E77FF3", "#FFB02E", "#7F66FF"];
const nameColor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return NAME_COLORS[h % NAME_COLORS.length];
};

const arrive = {
  initial: { opacity: 0, y: 18, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring", stiffness: 320, damping: 24 },
} as const;

/** Moldura do WhatsApp dark: header do grupo + área de chat com pattern. */
export function WaApp({ children }: { children: ReactNode }) {
  return (
    <div className="wa-app">
      <div className="wa-header">
        <img src={avatar} alt="" className="wa-header-avatar" />
        <div>
          <div className="wa-header-title">Alunas Rotina de Paz 🕊️</div>
          <div className="wa-header-sub">
            247 participantes · <span className="wa-online">online</span>
          </div>
        </div>
        <div className="wa-header-icons">📹 📞 ⋮</div>
      </div>
      <div className="wa-chat">{children}</div>
    </div>
  );
}

/** Bolha de mensagem de texto (#005C4B, rabinho, nome colorido, hora + ✓✓, reação com bounce). */
export function WaMessage({ t, delay = 0 }: { t: Testimonial; delay?: number }) {
  return (
    <motion.div
      className={`wa-msg${t.reactions ? " has-react" : ""}`}
      {...arrive}
      transition={{ ...arrive.transition, delay }}
    >
      <div className="wa-msg-name" style={{ color: nameColor(t.name) }}>{t.name}</div>
      <span>{t.text}</span>
      <span className="wa-msg-meta">
        {t.time} <span className="wa-ticks">✓✓</span>
      </span>
      {t.reactions && (
        <motion.span
          className="wa-react"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: [0.3, 1.25, 1] }}
          transition={{ delay: delay + 0.45, duration: 0.4 }}
        >
          {t.reactions}
        </motion.span>
      )}
    </motion.div>
  );
}

/* Alturas fixas da forma de onda (determinístico, sem re-render). */
const WAVE = [8, 14, 10, 18, 22, 12, 16, 9, 20, 24, 15, 8, 12, 19, 23, 14, 9, 16, 21, 11, 7, 13, 18, 10, 15, 8, 12, 6];

/** Mensagem de ÁUDIO mock — play, waveform, duração. */
export function WaAudio({ name, time, duration = "1:32", delay = 0 }:
  { name: string; time: string; duration?: string; delay?: number }) {
  return (
    <motion.div className="wa-msg" {...arrive} transition={{ ...arrive.transition, delay }}>
      <div className="wa-msg-name" style={{ color: nameColor(name) }}>{name}</div>
      <div className="wa-audio">
        <img src={avatar} alt="" className="wa-audio-avatar" />
        <button className="wa-audio-play" aria-label="Ouvir áudio (demonstração)">▶</button>
        <div>
          <div className="wa-wave" aria-hidden>
            {WAVE.map((h, i) => (
              <i key={i} className={i < 9 ? "played" : ""} style={{ height: h }} />
            ))}
          </div>
          <div className="wa-audio-time">{duration}</div>
        </div>
      </div>
      <span className="wa-msg-meta">
        {time} <span className="wa-ticks">✓✓</span>
      </span>
    </motion.div>
  );
}
