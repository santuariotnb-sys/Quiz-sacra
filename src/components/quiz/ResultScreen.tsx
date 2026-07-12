import { useCallback, useEffect, useRef, useState } from "react";
import luzDourada from "@/assets/luz-dourada.webp";
import descanso from "@/assets/descanso.webp";
import { DESIRE_CTA, DESIRE_QUOTE, NEUROFE_SHARED, type ArchetypeData } from "@/data/quiz";

/**
 * Tela A — Resultado (design Neurofé v3 · 3 slides).
 * Motor de "stories": Diagnóstico · Mecanismo · Transformação.
 * Animações via WAAPI/rAF. Copy por ARQUÉTIPO (neurofe3) + NEUROFE_SHARED.
 *
 * TRACKING (SAGRADO): CTA da cena 2 chama `onContinue` (= goToOffer no pai).
 * Label do CTA por DESEJO (DESIRE_CTA). Eco do desejo via DESIRE_QUOTE.
 */

const SCENES = 3;
const SCENE_LABELS = ["Diagnóstico", "Mecanismo", "Transformação"];
const FALLBACK_CTA = "QUERO COMEÇAR AGORA →";

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
  cremeText: "#EFE7D6",
};

const EASE = "cubic-bezier(.22,.8,.3,1)";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const btnDark: React.CSSProperties = {
  pointerEvents: "auto",
  fontFamily: "'Montserrat',sans-serif",
  background: "#2E2342",
  border: "1.5px solid rgba(228,200,120,.7)",
  color: P.goldSoft,
  fontWeight: 700,
  fontSize: 12.5,
  letterSpacing: 1,
  padding: "14px 36px",
  borderRadius: 50,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(0,0,0,.4)",
  animation: "sa-btnPulse 2.4s ease-in-out infinite",
};

const btnGold: React.CSSProperties = {
  fontFamily: "'Montserrat',sans-serif",
  background: `linear-gradient(90deg,${P.goldWarm},${P.gold},${P.goldWarm})`,
  backgroundSize: "200% auto",
  animation: "sa-shine 3s linear infinite, sa-ctaGlow 2.8s ease-in-out infinite, sa-btnPulse 2.2s ease-in-out infinite",
  border: "none",
  color: "#FFF",
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: 2,
  padding: "16px 40px",
  borderRadius: 50,
  cursor: "pointer",
};

const btnRow: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  display: "flex",
  justifyContent: "center",
  padding: "52px 0 calc(30px + env(safe-area-inset-bottom))",
  pointerEvents: "none",
  zIndex: 20,
};

function scrimForDark(): React.CSSProperties {
  return { ...btnRow, background: "linear-gradient(180deg, rgba(36,27,51,0), rgba(36,27,51,.94) 62%)" };
}
function scrimForLight(): React.CSSProperties {
  return { ...btnRow, background: "linear-gradient(180deg, rgba(246,240,228,0), rgba(246,240,228,.95) 62%)" };
}

/** Renderiza string com <b>, <br> como HTML */
function Html({ html, ...rest }: { html: string } & React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} {...rest} />;
}

export function ResultScreen({
  archetype,
  desire,
  onContinue,
}: {
  archetype: ArchetypeData;
  bridge?: string | null;
  name?: string;
  desire?: string;
  onContinue: () => void;
}) {
  const n = archetype.neurofe3;
  const shared = NEUROFE_SHARED;
  const ctaLabel = (desire && DESIRE_CTA[desire]) || FALLBACK_CTA;
  const desireQuote = desire && DESIRE_QUOTE[desire];

  const [cur, setCur] = useState(0);
  const curRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const animating = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const commitAnim = (a: Animation, el: HTMLElement, styles: Record<string, string>) => {
    a.finished.then(() => {
      Object.assign(el.style, styles);
      a.cancel();
    }).catch(() => {
      Object.assign(el.style, styles);
    });
  };

  const showScene = useCallback((idx: number) => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = prefersReducedMotion();

    root.querySelectorAll<HTMLElement>("[data-scene]").forEach((s) => {
      s.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      s.style.transform = "none";
      s.style.filter = "none";
    });

    const el = root.querySelector<HTMLElement>(`[data-scene="${idx}"]`);
    if (!el) return;

    if (reduce) {
      el.querySelectorAll<HTMLElement>("[data-anim]").forEach((a) => {
        a.style.opacity = "1"; a.style.transform = "none"; a.style.filter = "none";
      });
      const w = el.querySelector<HTMLElement>("[data-circuit]");
      if (w) w.style.height = "calc(100% - 48px)";
      root.querySelectorAll<HTMLElement>("[data-seg]").forEach((seg, i) => {
        seg.style.width = i <= idx ? "100%" : "0%";
      });
      return;
    }

    commitAnim(
      el.animate(
        [{ transform: "scale(.97)", filter: "blur(8px)" },
         { transform: "scale(1)", filter: "blur(0px)" }],
        { duration: idx === 0 ? 900 : 750, easing: EASE, fill: "forwards" },
      ), el, { transform: "none", filter: "none" },
    );

    el.querySelectorAll<HTMLElement>("[data-anim]").forEach((a, i) => {
      commitAnim(
        a.animate(
          [{ opacity: 0, transform: "translateY(30px)", filter: "blur(6px)" },
           { opacity: 1, transform: "translateY(0)", filter: "blur(0)" }],
          { duration: 850, delay: 250 + i * 220, easing: EASE, fill: "forwards" },
        ), a, { opacity: "1", transform: "none", filter: "none" },
      );
    });

    const wire = el.querySelector<HTMLElement>("[data-circuit]");
    if (wire) {
      commitAnim(
        wire.animate([{ height: "0px" }, { height: "calc(100% - 48px)" }],
          { duration: 1800, delay: 500, easing: "ease-out", fill: "forwards" }),
        wire, { height: "calc(100% - 48px)" },
      );
    }

    root.querySelectorAll<HTMLElement>("[data-seg]").forEach((seg, i) => {
      if (i < idx) seg.style.width = "100%";
      else if (i === idx) {
        seg.style.width = "0%";
        commitAnim(
          seg.animate([{ width: "0%" }, { width: "100%" }],
            { duration: 900, delay: 200, easing: "ease-out", fill: "forwards" }),
          seg, { width: "100%" },
        );
      } else seg.style.width = "0%";
    });
  }, []);

  const go = useCallback(
    (target: number) => {
      if (animating.current || target < 0 || target >= SCENES || target === curRef.current) return;
      animating.current = true;
      curRef.current = target;
      setCur(target);
      timeoutRef.current = window.setTimeout(() => {
        animating.current = false;
      }, prefersReducedMotion() ? 100 : 800);
    },
    [],
  );

  useEffect(() => {
    curRef.current = cur;
    showScene(cur);
    try {
      if (typeof window !== "undefined" &&
          ["sacra.rotinadepaz.com.br", "rotinadepaz.com.br"].includes(window.location.hostname)) {
        (window as { fbq?: (...a: unknown[]) => void }).fbq?.("trackCustom", "ResultSlide", {
          slide: cur + 1,
          total: SCENES,
          label: SCENE_LABELS[cur] ?? `Slide ${cur + 1}`,
          archetype: archetype.name,
        });
      }
    } catch { /* analytics nunca bloqueia */ }
  }, [cur, showScene]);

  // Partículas de ouro
  useEffect(() => {
    const c = rootRef.current?.querySelector<HTMLCanvasElement>("[data-dust]");
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (prefersReducedMotion()) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      c.width = c.offsetWidth * dpr;
      c.height = c.offsetHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    const parts = Array.from({ length: 46 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 1 + Math.random() * 2.4,
      v: 0.00025 + Math.random() * 0.0007,
      drift: (Math.random() - 0.5) * 0.0004,
      ph: Math.random() * Math.PI * 2,
      roxo: Math.random() < 0.18,
    }));
    const tick = (t: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of parts) {
        p.y -= p.v;
        p.x += p.drift;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t / 1400 + p.ph));
        ctx.beginPath();
        ctx.arc(p.x * c.width, p.y * c.height, p.r * dpr, 0, Math.PI * 2);
        ctx.fillStyle = p.roxo ? `rgba(150,110,200,${0.35 * tw})` : `rgba(212,175,55,${0.5 * tw})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    const onVis = () => {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const sceneBase = (idx: number): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    zIndex: 10,
    opacity: cur === idx ? 1 : 0,
    visibility: cur === idx ? "visible" : "hidden",
    pointerEvents: cur === idx ? "auto" : "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxSizing: "border-box",
  });

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        fontFamily: "'Montserrat',sans-serif",
        background: P.creme,
        color: P.ink,
        userSelect: "none",
        zIndex: 40,
      }}
    >
      <canvas
        data-dust
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 5, pointerEvents: "none" }}
      />

      {/* Progresso — 3 segmentos */}
      <div
        style={{
          position: "absolute",
          top: "calc(14px + env(safe-area-inset-top))",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(420px, calc(100% - 64px))",
          display: "flex",
          gap: 6,
          zIndex: 40,
        }}
      >
        {Array.from({ length: SCENES }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: cur >= i ? "rgba(90,70,40,.12)" : "rgba(90,70,40,.18)", overflow: "hidden", boxShadow: cur === i ? "0 0 8px rgba(228,200,120,.4)" : "none", transition: "box-shadow .5s ease" }}>
            <div data-seg style={{ height: "100%", width: "0%", borderRadius: 99, background: `linear-gradient(90deg,${P.goldWarm},${P.goldSoft})`, boxShadow: "0 0 6px rgba(228,200,120,.5)" }} />
          </div>
        ))}
      </div>

      {/* ── SLIDE 0 · Diagnóstico ── */}
      <div
        data-scene="0"
        style={{ ...sceneBase(0), overflowX: "hidden", overflowY: "auto", textAlign: "center", padding: "24px 20px", background: `linear-gradient(180deg,${P.creme},${P.cremeDeep})` }}
      >
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <img src={luzDourada} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", animation: "sa-kenburns 18s ease-out infinite alternate" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(246,240,228,.55), rgba(246,240,228,.25) 45%, rgba(246,240,228,.8))" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", margin: "auto", padding: "20px 0 40px", width: "min(480px,100%)" }}>
          {/* Badge + Header */}
          <div data-anim style={{ opacity: 0, width: 56, height: 56, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, rgba(244,222,160,.95), rgba(200,160,80,.55))", boxShadow: "0 0 30px rgba(212,175,55,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: P.goldDeep, border: "1px dashed rgba(139,106,42,.45)" }}>100%</div>
          <div data-anim style={{ opacity: 0, fontSize: 10, letterSpacing: 2.5, color: P.goldText, fontWeight: 700, marginTop: 10 }}>DIAGNÓSTICO CONCLUÍDO · SEU PADRÃO É</div>
          <h1 data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(32px, 9vw, 50px)", fontWeight: 500, color: P.purple, margin: "2px 0 0", lineHeight: 1, textShadow: "0 2px 30px rgba(138,95,176,.25)", overflowWrap: "break-word", wordBreak: "break-word", maxWidth: "100%" }}>{archetype.name}</h1>
          <div data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 17, color: "#6B5F76", marginTop: 6, lineHeight: 1.35, maxWidth: 340 }}>{n.tagline}</div>

          {/* Micro-CTA scroll ↓ */}
          <div data-anim style={{ opacity: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 18 }}>
            <div style={{ fontSize: 11, color: P.goldText, fontWeight: 600, letterSpacing: 1 }}>Role e descubra ↓</div>
          </div>

          {/* Separador */}
          <div data-anim style={{ opacity: 0, width: 34, height: 2, background: P.gold, margin: "18px auto 16px" }} />

          {/* Eyebrow + Identificação — alinhado à esquerda com borda dourada */}
          <div data-anim style={{ opacity: 0, fontSize: 10, letterSpacing: 2.5, color: P.goldText, fontWeight: 700, textAlign: "center" }}>VOCÊ SE RECONHECE?</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, width: "100%", textAlign: "left" }}>
            {n.identificacao.map((line, i) => (
              <Html key={i} data-anim html={line} style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontSize: 18, lineHeight: 1.4, color: P.ink, borderLeft: `3px solid ${P.gold}`, paddingLeft: 14 }} />
            ))}
          </div>

          {/* Pull-quote: perda */}
          <Html data-anim html={n.perda} style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontSize: 21, lineHeight: 1.35, color: P.purple, margin: "22px 0", padding: "0 4px", textAlign: "center" }} />

          {/* Reframe (chip) */}
          <Html data-anim html={n.reframe} style={{ opacity: 0, background: "linear-gradient(180deg,#FBF7EE,#F4ECDC)", border: "1.5px solid rgba(212,175,55,.5)", borderRadius: 14, padding: "14px 18px", fontSize: 14.5, lineHeight: 1.5, color: P.ink, width: "100%", textAlign: "center" }} />

          {/* Tentativas — alinhado à esquerda */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16, width: "100%", textAlign: "left" }}>
            {n.tentativas.map((t, i) => (
              <Html key={i} data-anim html={t} style={{ opacity: 0, fontSize: 14.5, lineHeight: 1.5, color: "#5D5368" }} />
            ))}
          </div>

          {/* Versículo — efeito flutuante */}
          <div data-anim className="rdp-float" style={{ opacity: 0, marginTop: 22, background: "radial-gradient(circle at 50% 0%, rgba(228,200,120,.12), rgba(228,200,120,.03))", border: "1px solid rgba(212,175,55,.35)", borderRadius: 16, padding: "18px 18px", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, color: P.goldText, fontWeight: 700 }}>{n.versiculoRef}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 18, lineHeight: 1.45, color: P.purpleDeep, marginTop: 8 }}>{n.versiculoTxt}</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#7A7185", marginTop: 10, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic" }}>{n.versiculoNota}</div>
          </div>

          {/* CTA inline — com pulse */}
          <button className="sa-cta-keep" onClick={() => { if (curRef.current === 0) go(1); }} style={{ ...btnGold, pointerEvents: "auto", marginTop: 28, width: "100%", animation: "sa-shine 3s linear infinite, sa-ctaGlow 2.8s ease-in-out infinite, sa-btnPulse 2.2s ease-in-out infinite" }}>{n.cta1}</button>
          <div style={{ fontSize: 11, color: "#8A7C93", marginTop: 10 }}>Leva 3 minutos · Sem compromisso</div>
        </div>

        {/* Micro-CTA lateral — seta pulsante indicando scroll */}
        <div style={{
          display: cur === 0 ? "flex" : "none",
          position: "fixed", right: 6, top: "28%", height: "45%",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          zIndex: 30, pointerEvents: "none",
        }}>
          <div style={{
            width: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            animation: "sa-arrowPulse 2s ease-in-out infinite",
          }}>
            <svg viewBox="0 0 20 40" style={{ width: 20, height: 40, opacity: .5 }}>
              <path d="M10 0 L10 36 M4 30 L10 38 L16 30" fill="none" stroke={P.goldWarm} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── SLIDE 1 · Mecanismo (NEUROFE_SHARED) ── */}
      <div
        data-scene="1"
        style={{ ...sceneBase(1), overflow: "hidden", background: `radial-gradient(ellipse 120% 90% at 50% 100%, ${P.purpleDeep}, #241B33)`, color: P.cremeText }}
      >
        <div style={{ flex: 1, width: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column" }}>
        <div style={{ width: "min(500px,100%)", textAlign: "center", margin: "auto", padding: "32px 22px 160px" }}>
          <div data-anim style={{ opacity: 0, fontSize: 10, letterSpacing: 3, color: P.goldSoft, fontWeight: 700 }}>O SINAL CERTO SILENCIA O GRITO</div>
          <Html data-anim html={shared.headline} style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: "clamp(22px,6.5vw,28px)", lineHeight: 1.22, color: "#F5EEE2", marginTop: 10 }} />
          <Html data-anim html={shared.setup} style={{ opacity: 0, fontSize: 14, lineHeight: 1.6, color: "#D9CEE8", marginTop: 14 }} />
          <Html data-anim html={shared.faithProtect} style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontSize: 19, lineHeight: 1.35, color: P.goldSoft, margin: "18px 0" }} />
          <Html data-anim html={shared.signal} style={{ opacity: 0, fontSize: 14, lineHeight: 1.6, color: "#D9CEE8" }} />

          {/* Micro-CTA scroll */}
          <div data-anim style={{ opacity: 0, marginTop: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div className="rdp-bob" style={{ fontSize: 10, color: P.goldSoft, fontWeight: 600, letterSpacing: 1 }}>↓</div>
          </div>

          {/* Boxes corpo/mente/espírito */}
          <div style={{ position: "relative", marginTop: 16, textAlign: "left" }}>
            <div data-circuit style={{ position: "absolute", left: 24, top: 20, width: 2, height: 0, background: "linear-gradient(180deg,#E4C878,rgba(228,200,120,.2))", boxShadow: "0 0 14px rgba(228,200,120,.7)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {shared.boxes.map((box, i) => (
                <div key={i} data-anim style={{ opacity: 0, display: "flex", gap: 12, alignItems: "flex-start", position: "relative" }}>
                  <div style={{ flex: "none", width: 50, height: 50, borderRadius: "50%", background: "radial-gradient(circle,#463463,#31254A)", border: "1px solid rgba(228,200,120,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: "0 0 26px rgba(228,200,120,.15)" }}>{box.icone}</div>
                  <div style={{ flex: 1, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 14, padding: "12px 14px" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, color: P.goldSoft, letterSpacing: 1 }}>{box.titulo}</div>
                    <div style={{ fontSize: 12, lineHeight: 1.55, color: "#C4B7D8", marginTop: 2 }}>{box.texto}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Html data-anim html={shared.union} style={{ opacity: 0, fontSize: 13.5, lineHeight: 1.5, color: "#E4D9F0", marginTop: 16 }} />
          <div data-anim style={{ opacity: 0, marginTop: 18 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 11, letterSpacing: 1, color: "#A99CC0", textTransform: "uppercase" }}>Tem um nome pra isso</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, letterSpacing: 4, color: P.goldSoft, marginTop: 2 }}>NEUROFÉ</div>
          </div>
        </div>
        </div>
        {/* Micro-CTA lateral — seta pulsante slide 1 */}
        <div style={{
          display: cur === 1 ? "flex" : "none",
          position: "absolute", right: 6, top: "28%", height: "45%",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          zIndex: 30, pointerEvents: "none",
        }}>
          <div style={{
            width: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            animation: "sa-arrowPulse 2s ease-in-out infinite",
          }}>
            <svg viewBox="0 0 20 40" style={{ width: 20, height: 40, opacity: .45 }}>
              <path d="M10 0 L10 36 M4 30 L10 38 L16 30" fill="none" stroke={P.goldSoft} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div style={scrimForDark()}>
          <button data-next className="sa-cta-keep" onClick={() => { if (curRef.current === 1) go(2); }} style={btnDark}>{shared.cta2}</button>
        </div>
      </div>

      {/* ── SLIDE 2 · Transformação ── */}
      <div
        data-scene="2"
        style={{ ...sceneBase(2), overflow: "hidden", textAlign: "center",
          background: `radial-gradient(ellipse 130% 80% at 50% 110%, rgba(212,175,55,.22), rgba(246,240,228,0) 60%), linear-gradient(180deg,${P.creme},#F1E9D8)` }}
      >
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity: 0.25 }}>
          <img src={descanso} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", animation: "sa-kenburns 20s ease-out infinite alternate" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(246,240,228,.6) 30%, rgba(246,240,228,.95) 62%, #F6F0E4 82%)" }} />
        <div style={{ flex: 1, width: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative", width: "min(500px,100%)", margin: "auto", padding: "40px 26px 190px", boxSizing: "border-box" }}>
          <div data-anim style={{ opacity: 0, fontSize: 11, letterSpacing: 4, color: P.goldDeep, fontWeight: 700 }}>O QUE MUDA QUANDO O ALARME BAIXA</div>
          <h2 data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: "clamp(27px,7.5vw,34px)", lineHeight: 1.18, color: P.ink, marginTop: 14 }}>{n.mudaHeadline}</h2>

          {/* Cenas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 20, textAlign: "left" }}>
            {n.cenas.map((c, i) => (
              <Html key={i} data-anim html={c} style={{ opacity: 0, fontSize: 15.5, lineHeight: 1.35, color: "#5D5368" }} />
            ))}
          </div>

          {/* Pull-quote: encontra */}
          <Html data-anim html={n.encontra} style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontSize: 24, lineHeight: 1.35, color: P.purple, margin: "24px 0" }} />

          {/* Chip custo */}
          <Html data-anim html={n.custo} style={{ opacity: 0, background: "linear-gradient(180deg,#FBF7EE,#F4ECDC)", border: "1.5px solid rgba(212,175,55,.5)", borderRadius: 16, padding: "16px 18px", fontSize: 16, lineHeight: 1.5, color: P.ink, textAlign: "left" }} />

          {/* Eco do desejo */}
          {desireQuote && (
            <Html data-anim html={`Você disse que queria <b>${desireQuote}.</b><br>É pra lá que a Neurofé te leva.`} style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontSize: 20, lineHeight: 1.4, color: "#4A3D56", marginTop: 22 }} />
          )}
        </div>
        </div>
        <div style={scrimForLight()}>
          <button
            className="sa-cta-keep"
            onClick={onContinue}
            style={{ ...btnGold, pointerEvents: "auto", fontSize: 13.5, letterSpacing: 1.5, padding: "18px 32px" }}
          >
            {ctaLabel}
          </button>
        </div>
        <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "#8A7C93", zIndex: 21 }}>
          Veja como funciona em ~3 minutos
        </div>
      </div>

      {/* Voltar */}
      <button
        onClick={() => go(cur - 1)}
        aria-label="Voltar"
        style={{ position: "absolute", top: "calc(28px + env(safe-area-inset-top))", left: "calc(10px + env(safe-area-inset-left))", zIndex: 45, background: "none", border: "none", color: "rgba(110,90,60,.6)", fontSize: 20, cursor: "pointer", padding: 8, display: cur === 0 ? "none" : "block" }}
      >
        ‹
      </button>
    </div>
  );
}
