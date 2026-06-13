import { type ReactNode, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GuideAvatar } from "./Avatar";
import { SpeechBubble } from "./SpeechBubble";
import { AlarmeDiagram } from "./AlarmeDiagram";
import { MirrorChecksSection } from "./MirrorChecks";
import {
  DESIRE_BEAT,
  DESIRE_BEAT_FALLBACK,
  getBridgeCopy,
  type ArchetypeData,
} from "@/data/quiz";

// Reveal-on-scroll (respeita prefers-reduced-motion via framer-motion).
function Reveal({ children, className, pop }: { children: ReactNode; className?: string; pop?: boolean }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26, ...(pop ? { scale: 0.97 } : {}) }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ScrollCue() {
  return (
    <div className="mt-8 flex flex-col items-center gap-2.5">
      <span className="text-center text-[11px] font-medium uppercase tracking-[0.24em] text-[color:var(--gold-warm)]">
        Role e descubra
      </span>
      <div className="rdp-bob flex h-[38px] w-[22px] flex-col items-center">
        <span className="h-[26px] w-px bg-gradient-to-b from-[color:var(--gold-warm)] to-transparent" />
        <span className="mt-auto h-2 w-2 rotate-45 border-b-[1.5px] border-r-[1.5px] border-[color:var(--gold-warm)]" />
      </div>
    </div>
  );
}

export function ResultScreen({
  archetype,
  bridge,
  name,
  desire,
  onContinue,
}: {
  archetype: ArchetypeData;
  bridge: string | null;
  name: string;
  desire?: string;
  onContinue: () => void;
}) {
  const r = archetype.result;
  const beat = (desire && DESIRE_BEAT[desire]) || DESIRE_BEAT_FALLBACK;
  const bridgeCopy = getBridgeCopy(archetype, desire);

  // CTA sticky: aparece depois da batida 4 (mecanismo)
  const mechanismRef = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  // CTA principal: sticky recolhe quando este fica visível
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    const el = mechanismRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
          setShowSticky(true);
          io.disconnect();
        }
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setCtaVisible(entry.isIntersecting),
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="mx-auto max-w-xl overflow-x-clip"
    >
      {/* ═══ BATIDA 1 — REVELAÇÃO ═══ */}
      <div className="px-5 pb-6 pt-10 sm:px-8" style={{ backgroundColor: "var(--milk)" }}>
        {/* Saudação */}
        <div className="flex items-start gap-3 sm:gap-5">
          <GuideAvatar size="corner" />
          <div className="min-w-0 flex-1 pt-1">
            <SpeechBubble
              text={`Encontrei${name ? `, ${name}` : ""}. Seu padrão tem nome.`}
              typingDelay={400}
            />
          </div>
        </div>

        {/* Nome do padrão — blur→nítido */}
        <div className="mt-10 text-center">
          <p
            className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gold-warm)]"
            style={{ animation: "fadeIn .8s .2s ease both" }}
          >
            <span className="text-[color:var(--gold)]">&#10022;</span>
            {"Padrão raiz identificado"}
            <span className="text-[color:var(--gold)]">&#10022;</span>
          </p>
          <h1
            className="rdp-arch-in mt-2 font-display font-bold leading-[0.95] text-[color:var(--deep-purple)]"
            style={{ fontSize: archetype.name.length > 10 ? "clamp(1.4rem, 5.5vw, 3rem)" : "clamp(1.6rem, 7vw, 4rem)" }}
          >
            {archetype.name}
          </h1>
          <p
            className="mt-2 font-display text-[21px] italic text-[color:var(--amethyst)]"
            style={{ animation: "fadeIn .8s .7s ease both" }}
          >
            {r.tagline}
          </p>
        </div>

        <ScrollCue />
      </div>

      {/* ═══ BATIDA 2 — ESPELHO ═══ */}
      <div className="px-5 py-10 sm:px-8" style={{ backgroundColor: "var(--milk)" }}>
        <Reveal>
          <MirrorChecksSection mirrorChecks={archetype.mirrorChecks} bridge={bridge} />
        </Reveal>
      </div>

      {/* ═══ BATIDA 3 — ABSOLVIÇÃO ═══ */}
      <div className="px-5 py-12 sm:px-8" style={{ backgroundColor: "var(--milk-warm)" }}>
        <Reveal pop>
          <section
            className="rdp-card-verdade rounded-[18px] px-7 py-10 text-center sm:px-9 sm:py-12"
            style={{ borderColor: "var(--gold-warm)", borderWidth: "1.5px" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gold-warm)]">
              {"A verdade que você precisa ouvir"}
            </p>
            <h3 className="mt-3 font-display text-[30px] font-semibold leading-[1.15] text-[color:var(--deep-purple)]">
              {r.truthTitle}{" "}
              <em className="italic text-[color:var(--gold-warm)]">{r.truthTitleEm}</em>
            </h3>
            <p
              className="mt-4 text-[18px] leading-relaxed text-[color:var(--amethyst)] [&_strong]:font-semibold [&_strong]:text-[color:var(--deep-purple)]"
              dangerouslySetInnerHTML={{ __html: r.truthBody }}
            />
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.15, ease: "easeOut" }}
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--gold-warm)]">
                {r.verseRef}
              </p>
              <p className="mt-1.5 font-display text-[22px] italic text-[color:var(--deep-purple)]">
                {`\u201C${r.verseText}\u201D`}
              </p>
            </motion.div>
            <p className="mt-5 whitespace-pre-line font-display text-[19px] italic leading-relaxed text-[color:var(--amethyst)]">
              {r.seal}
            </p>
          </section>
        </Reveal>
      </div>

      {/* ═══ BATIDA 4 — MECANISMO ═══ */}
      <div ref={mechanismRef} className="px-5 py-10 sm:px-8" style={{ backgroundColor: "var(--milk)" }}>
        <Reveal>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--deep-purple)]">
            {"Por que nada até hoje funcionou"}
          </p>
          <p className="mt-4 text-[17px] leading-relaxed text-[color:var(--amethyst)]">
            {archetype.mechanism.hook}
          </p>
        </Reveal>
        <Reveal className="mt-8">
          <AlarmeDiagram mechanism={archetype.mechanism} chapters={archetype.chapters} />
        </Reveal>
      </div>

      {/* ═══ BATIDA 5 — PORTAL (gradiente night→milk) ═══ */}
      <div
        className="px-5 py-12 sm:px-8"
        style={{
          background: "linear-gradient(to bottom, var(--night-1), var(--milk))",
        }}
      >
        <Reveal pop>
          <section className="rounded-[18px] px-7 py-8 text-center sm:px-9">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gold-warm)]">
              {bridgeCopy.eyebrow}
            </p>
            <h2 className="mt-2 font-display text-[32px] font-semibold leading-[1.12] text-[#F4E9EE]">
              {bridgeCopy.headline}
            </h2>
            <p
              className="mt-4 text-[18px] leading-relaxed text-[#F4E9EE]/80 [&_strong]:font-semibold [&_strong]:text-[#F4E9EE]"
              dangerouslySetInnerHTML={{ __html: beat.body }}
            />
            <p
              className="mt-4 text-[18px] leading-relaxed text-[color:var(--amethyst)] [&_strong]:font-semibold [&_strong]:text-[color:var(--deep-purple)]"
              dangerouslySetInnerHTML={{ __html: beat.closing }}
            />
          </section>
        </Reveal>
      </div>

      {/* ═══ BATIDA 6 — PONTE ═══ */}
      <div className="px-5 py-10 sm:px-8" style={{ backgroundColor: "var(--milk)" }}>
        <Reveal>
          <p className="text-center text-[17px] leading-relaxed text-[color:var(--amethyst)]">
            {bridgeCopy.bridge}
          </p>
        </Reveal>

        {/* CTA principal */}
        <Reveal className="mt-8" pop>
          <div ref={ctaRef} className="text-center">
            <button
              onClick={onContinue}
              className="rdp-btn-gradient-hover inline-flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-[21px] text-[15px] font-semibold uppercase tracking-[0.14em] text-white"
              style={{ animation: "rdp-cta-pulse 2.4s ease-in-out infinite" }}
            >
              <span>{bridgeCopy.cta}</span>
              <span aria-hidden className="transition-transform group-hover:translate-x-1">{"\u2192"}</span>
            </button>
            <p className="mt-3 text-[12.5px] text-[color:var(--amethyst)]">
              {"Alívio da ansiedade + Fortalecimento da Fé"}
            </p>
          </div>
        </Reveal>
      </div>

      {/* ═══ CTA STICKY (aparece após batida 4, recolhe quando CTA principal visível) ═══ */}
      <AnimatePresence>
        {showSticky && !ctaVisible && (
          <motion.div
            key="sticky-cta"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-[color:var(--gold-warm)]/20 bg-[color:var(--milk)] px-4 pb-[env(safe-area-inset-bottom,8px)] pt-3"
          >
            <button
              onClick={onContinue}
              className="rdp-btn-gradient-hover flex w-full items-center justify-center gap-2 rounded-full px-6 py-[18px] text-[14px] font-semibold uppercase tracking-[0.12em] text-white"
            >
              <span>{bridgeCopy.cta}</span>
              <span aria-hidden>{"\u2192"}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
