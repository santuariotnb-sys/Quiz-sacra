import { useCallback, useEffect, useRef, useState } from "react";
import luzDourada from "@/assets/luz-dourada.webp";
import descanso from "@/assets/descanso.webp";
import jaquelineImg from "@/assets/jaqueline.webp";
import { DESIRE_CTA, type ArchetypeData } from "@/data/quiz";

/**
 * Tela A — Apresentação / Resultado (design Neurofé).
 * Motor de "stories" de 5 cenas (Revelação · Verdade · Mecanismo · Imagine · CTA),
 * port fiel de `Apresentação Sacra.dc.html`. Animações via WAAPI/rAF em useEffect.
 *
 * TRACKING (SAGRADO #1): o CTA da cena 4 chama `onContinue` (= goToOffer no pai).
 * Corpo/conteúdo por ARQUÉTIPO (archetype.neurofe.*); label do CTA por DESEJO (DESIRE_CTA).
 */

const SCENES = 5;
const FALLBACK_CTA = "Eu creio — quero minha paz";

// Paleta do design (hex verbatim — takeover full-bleed, independente das vars do quiz).
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
  cremeText: "#EFE7D6",
};

const EASE = "cubic-bezier(.22,.8,.3,1)";

// Acessibilidade: usuários com "reduzir movimento" não recebem partículas nem
// as transições WAAPI de cena (scale+blur full-screen) — só o estado final.
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// versão curta dos boxes (design: primeiras 2 frases) para caber na cena Mecanismo.
function shorten(t: string): string {
  const s = (t || "").split(". ");
  return s.slice(0, 2).join(". ") + (s.length > 2 ? "." : "");
}

const btnDark: React.CSSProperties = {
  pointerEvents: "auto",
  fontFamily: "'Montserrat',sans-serif",
  background: "#2E2342",
  border: "1.5px solid rgba(228,200,120,.7)",
  color: P.goldSoft,
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: 2,
  padding: "14px 36px",
  borderRadius: 50,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(0,0,0,.4)",
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
  const n = archetype.neurofe;
  const ctaLabel = (desire && DESIRE_CTA[desire]) || FALLBACK_CTA;
  const boxes = n.boxes.map((b) => ({ ...b, textoCurto: shorten(b.texto) }));
  const mudaWords = (n.mudaCorpo || "").replace(/<\/?b>/g, "").split(" ");

  const [cur, setCur] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const animating = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // limpa o timeout da transição de cena no unmount (evita setState após desmontar)
  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  // ── Navegação entre cenas ──────────────────────────────────────────
  const go = useCallback(
    (target: number) => {
      if (animating.current || target < 0 || target >= SCENES || target === cur) return;
      const root = rootRef.current;
      if (!root) return;
      const reduce = prefersReducedMotion();
      const out = root.querySelector<HTMLElement>(`[data-scene="${cur}"]`);
      animating.current = true;
      if (out) {
        out.style.pointerEvents = "none";
        if (!reduce)
          out.animate(
            [
              { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
              { opacity: 0, transform: "scale(1.04)", filter: "blur(6px)" },
            ],
            { duration: 550, easing: "ease-in", fill: "both" },
          );
      }
      timeoutRef.current = window.setTimeout(
        () => {
          setCur(target);
          animating.current = false;
        },
        reduce ? 0 : 380,
      );
    },
    [cur],
  );

  // ── Entrada da cena atual (container + cascata data-anim + fio + palavras + progresso) ──
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-scene="${cur}"]`);
    if (!el) return;

    // cancela fills antigos desta cena (evita estado preso ao reentrar)
    el.getAnimations({ subtree: true }).forEach((a) => a.cancel());

    el.style.pointerEvents = "auto";

    // prefers-reduced-motion: mostra a cena já no estado final, sem WAAPI/blur/scale.
    if (prefersReducedMotion()) {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.filter = "none";
      el.querySelectorAll<HTMLElement>("[data-anim]").forEach((a) => {
        a.style.opacity = "1";
        a.style.transform = "none";
        a.style.filter = "none";
      });
      el.querySelectorAll<HTMLElement>("[data-w]").forEach((sp) => {
        sp.style.opacity = "1";
        sp.style.filter = "none";
      });
      const wireStatic = el.querySelector<HTMLElement>("[data-circuit]");
      if (wireStatic) wireStatic.style.height = "calc(100% - 48px)";
      root.querySelectorAll<HTMLElement>("[data-seg]").forEach((seg, i) => {
        seg.style.width = i <= cur ? "100%" : "0%";
      });
      return;
    }

    el.animate(
      [
        { opacity: 0, transform: "scale(.97)", filter: "blur(8px)" },
        { opacity: 1, transform: "scale(1)", filter: "blur(0px)" },
      ],
      { duration: cur === 0 ? 900 : 750, easing: EASE, fill: "both" },
    );

    el.querySelectorAll<HTMLElement>("[data-anim]").forEach((a, i) =>
      a.animate(
        [
          { opacity: 0, transform: "translateY(30px)", filter: "blur(6px)" },
          { opacity: 1, transform: "translateY(0px)", filter: "blur(0px)" },
        ],
        { duration: 850, delay: 250 + i * 220, easing: EASE, fill: "both" },
      ),
    );

    const wire = el.querySelector<HTMLElement>("[data-circuit]");
    if (wire)
      wire.animate([{ height: "0px" }, { height: "calc(100% - 48px)" }], {
        duration: 1800,
        delay: 500,
        easing: "ease-out",
        fill: "both",
      });

    el.querySelectorAll<HTMLElement>("[data-w]").forEach((sp, i) =>
      sp.animate([{ opacity: 0, filter: "blur(4px)" }, { opacity: 1, filter: "blur(0px)" }], {
        duration: 450,
        delay: 600 + i * 60,
        easing: "ease-out",
        fill: "both",
      }),
    );

    root.querySelectorAll<HTMLElement>("[data-seg]").forEach((seg, i) => {
      if (i < cur) seg.style.width = "100%";
      else if (i === cur) {
        seg.style.width = "0%";
        seg.animate([{ width: "0%" }, { width: "100%" }], { duration: 900, delay: 200, easing: "ease-out", fill: "both" });
      } else seg.style.width = "0%";
    });
  }, [cur]);

  // ── Teclado: →/Espaço avança, ← volta ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(cur + 1);
      else if (e.key === "ArrowLeft") go(cur - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, cur]);

  // ── Partículas de ouro (+ ~18% roxas) ──
  useEffect(() => {
    const c = rootRef.current?.querySelector<HTMLCanvasElement>("[data-dust]");
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (prefersReducedMotion()) return; // sem partículas animadas p/ reduced-motion
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
        if (p.y < -0.02) {
          p.y = 1.02;
          p.x = Math.random();
        }
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t / 1400 + p.ph));
        ctx.beginPath();
        ctx.arc(p.x * c.width, p.y * c.height, p.r * dpr, 0, Math.PI * 2);
        ctx.fillStyle = p.roxo ? `rgba(150,110,200,${0.35 * tw})` : `rgba(212,175,55,${0.5 * tw})`;
        ctx.fill();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    // pausa o rAF quando a aba fica oculta (poupa bateria/CPU em mobile)
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

  const sceneBase: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    opacity: 0,
    pointerEvents: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxSizing: "border-box",
  };

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
      {/* partículas de ouro */}
      <canvas
        data-dust
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 5, pointerEvents: "none" }}
      />

      {/* progresso estilo story */}
      <div
        style={{
          position: "absolute",
          top: "calc(14px + env(safe-area-inset-top))",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(520px, calc(100% - 40px))",
          display: "flex",
          gap: 6,
          zIndex: 40,
        }}
      >
        {Array.from({ length: SCENES }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: "rgba(90,70,40,.18)", overflow: "hidden" }}>
            <div data-seg style={{ height: "100%", width: "0%", background: `linear-gradient(90deg,${P.goldWarm},${P.goldSoft})` }} />
          </div>
        ))}
      </div>

      {/* ── CENA 0 · Revelação ── */}
      <div
        data-scene="0"
        style={{ ...sceneBase, overflowY: "auto", textAlign: "center", padding: 24, background: `linear-gradient(180deg,${P.creme},${P.cremeDeep})` }}
      >
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <img src={luzDourada} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", animation: "sa-kenburns 18s ease-out infinite alternate" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(246,240,228,.55), rgba(246,240,228,.25) 45%, rgba(246,240,228,.8))" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", margin: "auto", padding: "40px 0 60px", width: "min(480px,100%)" }}>
          <div data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontSize: 14, letterSpacing: 6, color: P.goldText, fontWeight: 600 }}>ROTINA DE PAZ</div>
          <div data-anim style={{ opacity: 0, marginTop: 44, position: "relative", width: 120, height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px dashed rgba(139,106,42,.5)", animation: "sa-ringSpin 24s linear infinite" }} />
            <div style={{ position: "absolute", inset: 12, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, rgba(244,222,160,.9), rgba(200,160,80,.55))", boxShadow: "0 0 44px rgba(212,175,55,.5)", animation: "sa-breathe 5.5s ease-in-out infinite" }} />
            <div style={{ position: "relative", fontSize: 11, letterSpacing: 2, color: P.goldDeep, fontWeight: 700 }}>100%</div>
          </div>
          <div data-anim style={{ opacity: 0, fontSize: 11, letterSpacing: 4, color: P.goldText, fontWeight: 700, marginTop: 40 }}>DIAGNÓSTICO CONCLUÍDO · SEU PADRÃO É</div>
          <h1 data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(52px, 14vw, 76px)", fontWeight: 500, color: P.purple, margin: "10px 0 0", lineHeight: 1, textShadow: "0 2px 30px rgba(138,95,176,.25)" }}>{archetype.name}</h1>
          <div data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 22, color: "#6B5F76", marginTop: 12 }}>{archetype.result.tagline}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 40, textAlign: "left", width: "100%" }}>
            <div data-anim style={{ opacity: 0, fontSize: 11, letterSpacing: 4, color: P.goldText, fontWeight: 700, textAlign: "center" }}>VOCÊ SE RECONHECE?</div>
            {n.dores.map((dor, i) => (
              <div key={i} data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontSize: 24, lineHeight: 1.45, color: P.ink, borderLeft: `3px solid ${P.gold}`, paddingLeft: 20 }}>{dor}</div>
            ))}
            <div data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 21, lineHeight: 1.5, color: P.purple, textAlign: "center", marginTop: 6 }}>{n.espelho}</div>
          </div>
          <button data-anim className="sa-cta-keep" onClick={() => go(1)} style={{ ...btnGold, opacity: 0, marginTop: 44 }}>CONTINUAR ▸</button>
        </div>
      </div>

      {/* ── CENA 1 · A Verdade ── */}
      <div
        data-scene="1"
        style={{ ...sceneBase, overflow: "hidden", background: "radial-gradient(ellipse 120% 90% at 50% 0%, #3B2B52, #241B33)", color: P.cremeText, textAlign: "center" }}
      >
        <div style={{ flex: 1, width: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column" }}>
        <div style={{ width: "min(500px,100%)", margin: "auto", padding: "40px 24px 190px" }}>
          <div data-anim style={{ opacity: 0, fontSize: 11, letterSpacing: 4, color: P.goldSoft, fontWeight: 700 }}>A VERDADE QUE VOCÊ PRECISA OUVIR</div>
          <h2 data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: "clamp(30px,8vw,40px)", lineHeight: 1.2, margin: "20px 0 0", color: "#F5EEE2" }}>
            {n.verdadeTitulo1}
            <br />
            <em style={{ color: P.goldSoft }}>{n.verdadeTitulo2}</em>
          </h2>
          <div data-anim style={{ opacity: 0, fontSize: 15.5, lineHeight: 1.7, color: "#C9BCDB", marginTop: 18 }} dangerouslySetInnerHTML={{ __html: n.verdadeCorpo }} />
          <div data-anim style={{ opacity: 0, margin: "32px auto 0", background: "radial-gradient(circle at 50% 0%, rgba(228,200,120,.16), rgba(228,200,120,.04))", border: "1px solid rgba(228,200,120,.4)", borderRadius: 18, padding: "26px 24px" }}>
            <div style={{ fontSize: 10.5, letterSpacing: 3, color: P.goldSoft, fontWeight: 700 }}>{n.versiculoRef.toUpperCase()}</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 22, lineHeight: 1.5, color: "#F5EEE2", marginTop: 12 }}>{n.versiculo}</div>
          </div>
          <div data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 17, lineHeight: 1.6, color: "#A796BD", marginTop: 22 }}>
            {n.versiculoNota1}
            <br />
            {n.versiculoNota2}
          </div>
        </div>
        </div>
        <div style={scrimForDark()}>
          <button data-next onClick={() => go(2)} style={btnDark}>POR QUE NADA FUNCIONOU ▸</button>
        </div>
      </div>

      {/* ── CENA 2 · Mecanismo ── */}
      <div
        data-scene="2"
        style={{ ...sceneBase, overflow: "hidden", background: "radial-gradient(ellipse 120% 90% at 50% 100%, #3B2B52, #241B33)", color: P.cremeText }}
      >
        <div style={{ flex: 1, width: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column" }}>
        <div style={{ width: "min(500px,100%)", textAlign: "center", margin: "auto", padding: "40px 24px 190px" }}>
          <div data-anim style={{ opacity: 0, fontSize: 11, letterSpacing: 4, color: P.goldSoft, fontWeight: 700 }}>O SINAL CERTO SILENCIA O GRITO</div>
          <div data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 22, color: "#E4D9F0", marginTop: 14 }}>
            Alarme não se desliga com esforço. <span style={{ color: P.goldSoft }}>Desliga com sinal.</span>
          </div>
          <div style={{ position: "relative", marginTop: 28, textAlign: "left" }}>
            <div data-circuit style={{ position: "absolute", left: 29, top: 24, width: 2, height: 0, background: "linear-gradient(180deg,#E4C878,rgba(228,200,120,.2))", boxShadow: "0 0 14px rgba(228,200,120,.7)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {boxes.map((box, i) => (
                <div key={i} data-anim style={{ opacity: 0, display: "flex", gap: 14, alignItems: "flex-start", position: "relative" }}>
                  <div style={{ flex: "none", width: 60, height: 60, borderRadius: "50%", background: "radial-gradient(circle,#463463,#31254A)", border: "1px solid rgba(228,200,120,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: "0 0 26px rgba(228,200,120,.15)" }}>{box.icone}</div>
                  <div style={{ flex: 1, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 16, padding: "16px 18px" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 21, fontWeight: 600, color: P.goldSoft }}>{box.titulo}</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#C9BCDB", marginTop: 7 }}>{box.textoCurto}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 20, color: "#E4D9F0", marginTop: 26 }}>
            Tem um nome pra isso: <span style={{ color: P.goldSoft }}>Neurofé.</span>
          </div>
        </div>
        </div>
        <div style={scrimForDark()}>
          <button data-next onClick={() => go(3)} style={btnDark}>E O QUE MUDA? ▸</button>
        </div>
      </div>

      {/* ── CENA 3 · Imagine ── */}
      <div
        data-scene="3"
        style={{ ...sceneBase, justifyContent: "flex-end", textAlign: "center" }}
      >
        <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
          <img src={descanso} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", animation: "sa-kenburns 20s ease-out infinite alternate" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(246,240,228,.15) 30%, rgba(246,240,228,.92) 62%, #F6F0E4 82%)" }} />
        <div style={{ position: "relative", width: "min(500px,100%)", padding: "0 26px 160px", boxSizing: "border-box" }}>
          <div data-anim style={{ opacity: 0, fontSize: 11, letterSpacing: 4, color: P.goldText, fontWeight: 700 }}>O QUE MUDA QUANDO VOCÊ SE PERMITE PARAR</div>
          <h2 data-anim style={{ opacity: 0, fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: "clamp(30px,8vw,38px)", lineHeight: 1.15, color: P.ink, margin: "14px 0 0" }}>{n.mudaTitulo}</h2>
          <div style={{ fontSize: 15.5, lineHeight: 1.75, color: "#5D5368", marginTop: 16 }}>
            {mudaWords.map((w, i) => (
              <span key={i} data-w style={{ opacity: 0 }}>{w + " "}</span>
            ))}
          </div>
        </div>
        <div style={scrimForLight()}>
          <button data-next onClick={() => go(4)} style={{ ...btnDark, background: P.creme, border: `1.5px solid ${P.goldWarm}`, color: P.goldText, boxShadow: "0 8px 24px rgba(90,70,40,.18)" }}>{ctaLabel} ▸</button>
        </div>
      </div>

      {/* ── CENA 4 · CTA (→ onContinue) ── */}
      <div
        data-scene="4"
        style={{ ...sceneBase, overflowY: "auto", padding: 24, textAlign: "center", background: "radial-gradient(ellipse 130% 80% at 50% 110%, rgba(212,175,55,.28), rgba(246,240,228,0) 60%), #F6F0E4" }}
      >
        <div style={{ width: "min(460px,100%)", display: "flex", flexDirection: "column", alignItems: "center", margin: "auto", padding: "40px 0" }}>
          <div data-anim style={{ opacity: 0, width: "100%", maxWidth: 280, borderRadius: 24, overflow: "hidden", boxShadow: "0 24px 60px rgba(90,70,40,.25)", border: "3px solid rgba(212,175,55,.5)" }}>
            <img src={jaquelineImg} alt="Jaqueline" style={{ width: "100%", display: "block" }} />
          </div>
          <div data-anim style={{ opacity: 0, fontSize: 15.5, lineHeight: 1.7, color: P.ink, marginTop: 30 }} dangerouslySetInnerHTML={{ __html: n.proximoPasso }} />
          <button
            data-anim
            className="sa-cta-keep"
            onClick={onContinue}
            style={{ ...btnGold, opacity: 0, marginTop: 28, fontSize: 15, letterSpacing: 1.5, padding: "19px 44px", animation: "sa-shine 3s linear infinite, sa-ctaGlow 2.8s ease-in-out infinite" }}
          >
            {ctaLabel} →
          </button>
          <div data-anim style={{ opacity: 0, fontSize: 12, color: "#8A7C93", marginTop: 14 }}>Leva 3 minutos · Sem compromisso</div>
        </div>
      </div>

      {/* voltar */}
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
