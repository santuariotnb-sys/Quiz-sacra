import { motion, AnimatePresence } from "framer-motion";

export type ProofMsg = {
  name: string;
  color: string;
  text: string;
  time: string;
  reaction?: string;
};

/**
 * MODELOS calibrados na linguagem real das alunas — antes da produção final,
 * ancorar cada um em um depoimento real (áudios transcritos do grupo).
 * Foco: ela ENTENDEU o padrão dela → e a vida mudou.
 */
export const PROOF_MESSAGES: ProofMsg[] = [
  {
    name: "Cleide",
    color: "#E17076",
    text: "sempre achei que era falta de fé minha. quando descobri que era o meu padrão de alarme travado eu chorei. hoje eu durmo em paz 🙏",
    time: "23:10",
    reaction: "🙏 3",
  },
  {
    name: "Lúcia",
    color: "#7BC862",
    text: "hj é meu décimo dia e eu dormi a noite INTEIRA pela primeira vez em anos. acordei e chorei de gratidão viu 🙏❤️",
    time: "22:47",
    reaction: "❤️ 6",
  },
];

/** Print vivo de grupo do WhatsApp (modo claro — o que ela usa). Mensagens entram conforme `visible`. */
export function WhatsProofCard({ visible }: { visible: number }) {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl text-left shadow-[0_18px_40px_-14px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-2.5 bg-[#075E54] px-3.5 py-2.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#128C7E] text-sm">
          🕊️
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-white">Alunas Rotina de Paz 🕊️</p>
          <p className="text-[10px] text-[#B5DFD8]">online</p>
        </div>
      </div>
      <div className="flex min-h-[120px] flex-col gap-1.5 bg-[#ECE5DD] px-2.5 py-3">
        <AnimatePresence initial={false}>
          {PROOF_MESSAGES.slice(0, visible).map((m) => (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="max-w-[94%] rounded-lg rounded-tl-none bg-white px-2.5 py-1.5 shadow-sm"
            >
              <p className="text-[11px] font-semibold" style={{ color: m.color }}>
                {m.name}
              </p>
              <p className="text-[12px] leading-snug text-[#111B21]">{m.text}</p>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                {m.reaction ? (
                  <span className="rounded-full bg-white px-1.5 text-[10px] shadow ring-1 ring-black/5">
                    {m.reaction}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-[9px] text-[#667781]">{m.time} ✓✓</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
