import type { ReactNode } from "react";
import { motion } from "framer-motion";
import avatar from "@prod/assets/jaqueline-avatar.webp";

const spring = { type: "spring", stiffness: 380, damping: 26 } as const;

/** Avatar ou espaçador — mensagens seguidas da mesma pessoa mostram o círculo uma vez só. */
function AvatarSlot({ show }: { show: boolean }) {
  return show
    ? <img src={avatar} alt="Jaqueline" className="bubble-avatar" />
    : <span className="bubble-avatar-spacer" aria-hidden="true" />;
}

/** Balão da Jaqueline com entrada em spring (avatar + bolha). */
export function SpeechBubble({ children, delay = 0, showAvatar = true }:
  { children: ReactNode; delay?: number; showAvatar?: boolean }) {
  return (
    <motion.div
      className="bubble-row"
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay }}
    >
      <AvatarSlot show={showAvatar} />
      <div className="bubble">{children}</div>
    </motion.div>
  );
}

/** Indicador "Jaqueline está digitando" — 3 pontinhos animados. */
export function TypingBubble({ showAvatar = true }: { showAvatar?: boolean }) {
  return (
    <motion.div
      className="bubble-row"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <AvatarSlot show={showAvatar} />
      <div className="bubble bubble-typing" aria-label="Jaqueline está digitando">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="typing-dot"
            animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}
