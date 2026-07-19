import { useEffect, useRef } from "react";
import luzDourada from "@/assets/luz-dourada.webp";
import {
  DESIRE_CTA,
  DESIRE_BEAT,
  DESIRE_BEAT_FALLBACK,
  RESULT_LABEL,
  RESULT_HEADLINE,
  RESULT_EVIDENCE_TITLE,
  RESULT_ABSOLUTION,
  getResultReasons,
  type Archetype,
  type ArchetypeData,
} from "@/data/quiz";

/**
 * Tela A — Resultado V4 (valor antes de vender).
 * Página única e rolável: label · headline · nome emocional · explicação dinâmica ·
 * "Isso apareceu nas suas respostas porque:" (3 razões das respostas REAIS) ·
 * absolvição · promessa dinâmica · CTA → onContinue.
 *
 * TRACKING (preservado): dispara um custom event de resultado no pixel ao montar.
 * Contrato onContinue intacto. Pixel/CAPI de audiência (ViewContent/Lead) seguem no QuizApp.
 */

const P = {
  creme: "#F6F0E4",
  cremeDeep: "#F0E6D2",
  ink: "#4A4152",
  goldText: "#8A6A2A",
  goldDeep: "#6B5320",
  gold: "#D4AF37",
  goldWarm: "#B08A38",
  goldSoft: "#E4C878",
  purple: "#8A5FB0",
  purpleDeep: "#3B2B52",
};

const FALLBACK_CTA = "QUERO COMEÇAR AGORA →";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Renderiza string com <b>, <strong>, <br>, <em> como HTML. */
function Html({ html, ...rest }: { html: string } & React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} {...rest} />;
}

export function ResultScreen({
  archetype,
  desire,
  answers,
  onContinue,
}: {
  archetype: ArchetypeData;
  bridge?: string | null;
  name?: string;
  desire?: string;
  answers?: Record<string, string>;
  scores?: Record<Archetype, number>;
  onContinue: () => void;
}) {
  const ctaLabel = (desire && DESIRE_CTA[desire]) || FALLBACK_CTA;
  const beat = (desire && DESIRE_BEAT[desire]) || DESIRE_BEAT_FALLBACK;
  const reasons = getResultReasons(answers ?? {});
  const rootRef = useRef<HTMLDivElement>(null);

  // Pixel: sinal de que a usuária chegou ao resultado (custom event, não bloqueia).
  useEffect(() => {
    try {
      if (typeof window !== "undefined" &&
          ["sacra.rotinadepaz.com.br", "rotinadepaz.com.br"].includes(window.location.hostname)) {
        (window as { fbq?: (...a: unknown[]) => void }).fbq?.("trackCustom", "ResultView", {
          archetype: archetype.id,
          archetypeName: archetype.name,
        });
      }
    } catch { /* analytics nunca bloqueia */ }
  }, [archetype.id, archetype.name]);

  // Entrada suave (respeita prefers-reduced-motion).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-fade]"));
    els.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(16px)";
      const t = window.setTimeout(() => {
        el.style.transition = "opacity .6s ease, transform .6s cubic-bezier(.22,.8,.3,1)";
        el.style.opacity = "1";
        el.style.transform = "none";
      }, 80 + i * 110);
      el.dataset.timer = String(t);
    });
    return () => els.forEach((el) => { if (el.dataset.timer) window.clearTimeout(Number(el.dataset.timer)); });
  }, [archetype.id]);

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        fontFamily: "'Montserrat',sans-serif",
        background: `linear-gradient(180deg,${P.creme},${P.cremeDeep})`,
        color: P.ink,
        zIndex: 40,
      }}
    >
      {/* Luz de fundo discreta */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <img src={luzDourada} alt="" aria-hidden style={{ width: "100%", height: 320, objectFit: "cover", opacity: 0.35 }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(246,240,228,.5), ${P.creme} 55%)` }} />
      </div>

      <div
        style={{
          position: "relative",
          width: "min(520px, 100%)",
          margin: "0 auto",
          padding: "calc(40px + env(safe-area-inset-top)) 22px calc(120px + env(safe-area-inset-bottom))",
          boxSizing: "border-box",
          textAlign: "center",
        }}
      >
        {/* Label */}
        <div data-fade style={{ fontSize: 10.5, letterSpacing: 2.5, color: P.goldText, fontWeight: 700 }}>
          DIAGNÓSTICO CONCLUÍDO
        </div>
        <div data-fade style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 18, color: "#6B5F76", marginTop: 6 }}>
          {RESULT_LABEL}
        </div>

        {/* Headline */}
        <div data-fade style={{ fontSize: 14.5, lineHeight: 1.5, color: P.ink, marginTop: 22 }}>
          {RESULT_HEADLINE}
        </div>

        {/* Nome emocional */}
        <h1
          data-fade
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontWeight: 500,
            fontSize: "clamp(30px, 8vw, 46px)",
            lineHeight: 1.05,
            color: P.purple,
            margin: "8px 0 0",
            textShadow: "0 2px 30px rgba(138,95,176,.22)",
          }}
        >
          {archetype.emotionalName}
        </h1>
        <div data-fade style={{ fontSize: 10.5, letterSpacing: 3, color: P.goldWarm, fontWeight: 700, marginTop: 8 }}>
          PADRÃO {archetype.name}
        </div>

        {/* Separador */}
        <div data-fade style={{ width: 34, height: 2, background: P.gold, margin: "24px auto" }} />

        {/* Explicação dinâmica */}
        <Html
          data-fade
          html={archetype.result.happening}
          style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, lineHeight: 1.5, color: "#4A3D56", textAlign: "left" }}
        />

        {/* Bloco de evidências — razões das respostas reais */}
        {reasons.length > 0 && (
          <div
            data-fade
            style={{
              marginTop: 26,
              background: "linear-gradient(180deg,#FBF7EE,#F4ECDC)",
              border: "1.5px solid rgba(212,175,55,.5)",
              borderRadius: 16,
              padding: "18px 18px",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 10.5, letterSpacing: 2, color: P.goldText, fontWeight: 700 }}>
              {RESULT_EVIDENCE_TITLE.toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {reasons.map((r, i) => (
                <div key={i} style={{ fontSize: 14.5, lineHeight: 1.45, color: P.ink, borderLeft: `3px solid ${P.gold}`, paddingLeft: 12 }}>
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Absolvição */}
        <div
          data-fade
          style={{
            marginTop: 26,
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 24,
            lineHeight: 1.3,
            color: P.purple,
          }}
        >
          {RESULT_ABSOLUTION}
        </div>
        <div data-fade style={{ fontSize: 14.5, lineHeight: 1.6, color: "#5D5368", marginTop: 12 }}>
          {archetype.result.truthTitle}{" "}
          <b style={{ color: P.ink }}>{archetype.result.truthTitleEm}</b>
        </div>

        {/* Promessa dinâmica */}
        <div
          data-fade
          style={{
            marginTop: 26,
            background: "radial-gradient(circle at 50% 0%, rgba(228,200,120,.12), rgba(228,200,120,.03))",
            border: "1px solid rgba(212,175,55,.35)",
            borderRadius: 16,
            padding: "20px 18px",
          }}
        >
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 21, lineHeight: 1.3, color: P.purpleDeep }}>
            {beat.title}
          </div>
          <Html
            html={beat.closing}
            style={{ fontSize: 13.5, lineHeight: 1.6, color: "#5D5368", marginTop: 10 }}
          />
        </div>

        {/* CTA → onContinue */}
        <button
          type="button"
          onClick={onContinue}
          className="sa-cta-keep"
          style={{
            display: "block",
            width: "100%",
            marginTop: 30,
            fontFamily: "'Montserrat',sans-serif",
            background: `linear-gradient(90deg,${P.goldWarm},${P.gold},${P.goldWarm})`,
            backgroundSize: "200% auto",
            animation: prefersReducedMotion() ? "none" : "sa-shine 3s linear infinite, sa-btnPulse 2.2s ease-in-out infinite",
            border: "none",
            color: "#FFF",
            fontWeight: 700,
            fontSize: 13.5,
            letterSpacing: 1.2,
            padding: "18px 24px",
            borderRadius: 50,
            cursor: "pointer",
            boxShadow: "0 12px 30px rgba(176,138,56,.35)",
          }}
        >
          {ctaLabel}
        </button>
        <div style={{ fontSize: 11, color: "#8A7C93", marginTop: 12 }}>
          Veja o caminho de 7 dias montado pro seu padrão
        </div>
      </div>
    </div>
  );
}
