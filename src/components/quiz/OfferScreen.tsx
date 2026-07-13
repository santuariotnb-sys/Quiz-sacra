import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NEUROFE_OFFER, DESIRE_CTA, DESIRE_QUOTE, OFFER_HEADLINE, type ArchetypeData } from "@/data/quiz";
import { formatBRL } from "@/lib/prices";
import { trackVslEvent } from "@/lib/tracking";
import logoImg from "@/assets/logo.webp";
import jaquelinePoster from "@/assets/jaqueline.webp";
import vol1Img from "@/assets/vol1-despertar.webp";
import vol2Img from "@/assets/vol2-repouso.webp";
import rotinaLogoImg from "@/assets/rotina-de-paz-logo.webp";
import jaquelineAppImg from "@/assets/jaqueline-app.webp";
import bonusLouvoresImg from "@/assets/bonus-louvores.webp";
import waJuliaImg from "@/assets/wa-julia.png";
import waJaquelineImg from "@/assets/wa-jaqueline.png";
import waAlarmaImg from "@/assets/wa-alarma.png";
import waAnaImg from "@/assets/wa-ana.png";
import waAna2Img from "@/assets/wa-ana2.png";
import fbCommentsImg from "@/assets/fb-comments.png";

/* ============================================================
 * TELA B — Oferta (Neurofé + melhorias Lovable)
 * VSL custom com controles, social proof, volumes loop,
 * bonus com micro-copy, desejo com nome, anchor jump.
 * ============================================================ */

const VSL_URL = "https://cdnrotinadepaz.b-cdn.net/VSL-mecanismo-v2v3-EDITADA.mp4";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function trackingAllowed() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "rotinadepaz.com.br" || h === "sacra.rotinadepaz.com.br";
}

/* ---------- Reveal ---------- */

function Reveal({
  children,
  style,
  as: Tag = "div",
  delay = 0,
}: {
  children: ReactNode;
  style?: CSSProperties;
  as?: "div" | "section" | "h1" | "h2";
  delay?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(26px)",
        transition: "opacity .8s cubic-bezier(.22,.8,.3,1), transform .8s cubic-bezier(.22,.8,.3,1)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

/* ---------- VSL Player (custom controls, tracking) ---------- */

let __vslSeq = 0;
const VIDEO_ID = "rotina-de-paz-vsl";

function pushVslEvent(name: string, data: Record<string, unknown>) {
  if (!trackingAllowed()) return;
  try {
    (window as { fbq?: (...a: unknown[]) => void }).fbq?.("trackCustom", name, data);
  } catch { /* noop */ }
  try {
    const w = window as { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: name, ...data });
  } catch { /* noop */ }
  __vslSeq += 1;
}

function VSLPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef<Record<number, boolean>>({});
  const startedRef = useRef(false);
  const unmutedRef = useRef(false);
  const readyRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  // Impressão: VSL entrou em viewport (denominador do hook rate)
  const impressionRef = useRef(false);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !impressionRef.current) {
            impressionRef.current = true;
            void trackVslEvent("impression", { videoId: VIDEO_ID, duration: videoRef.current?.duration || null });
          }
        });
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Ponto (currentTime) em que a usuária deu som — base do "hook" de 3s audíveis
  const unmuteAtRef = useRef<number | null>(null);
  const hookRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      if (readyRef.current) return;
      readyRef.current = true;
      pushVslEvent("VSLReady", { video_id: VIDEO_ID, video_duration: v.duration || 0 });
    };
    const onPlay = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      pushVslEvent("VSLStart", { video_id: VIDEO_ID, video_percent: 0 });
    };
    const onEnded = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      pushVslEvent("VSLComplete", { video_id: VIDEO_ID, video_percent: 100 });
      void trackVslEvent("complete", { videoId: VIDEO_ID, percent: 100, currentTime: v.currentTime || 0, duration: v.duration || 0, muted: v.muted, rate: v.playbackRate });
    };
    const onSeeked = () => {
      if ((v.currentTime || 0) < 1.5) {
        firedRef.current = {};
        completedRef.current = false;
      }
    };
    const onTime = () => {
      const d = v.duration || 0;
      const c = v.currentTime || 0;
      if (!d) return;
      setCurrentTime(c);
      setDuration(d);
      const p = Math.min(100, (c / d) * 100);
      setProgress(p);
      // Hook: 3s de playback AUDÍVEL após o unmute (estilo VTurb 3s-view)
      if (!hookRef.current && unmuteAtRef.current != null && !v.muted && c - unmuteAtRef.current >= 3) {
        hookRef.current = true;
        void trackVslEvent("hook", { videoId: VIDEO_ID, currentTime: c, duration: d, muted: false, rate: v.playbackRate });
      }
      [25, 50, 75, 95].forEach((m) => {
        if (p >= m && !firedRef.current[m]) {
          firedRef.current[m] = true;
          pushVslEvent("VSLProgress", { video_id: VIDEO_ID, video_percent: m, video_current_time: c, video_duration: d });
          void trackVslEvent("progress", { videoId: VIDEO_ID, percent: m, currentTime: c, duration: d, muted: v.muted, rate: v.playbackRate });
        }
      });
    };
    const onPlayState = () => setPlaying(true);
    const onPauseState = () => setPlaying(false);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("play", onPlay);
    v.addEventListener("play", onPlayState);
    v.addEventListener("pause", onPauseState);
    v.addEventListener("ended", onEnded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeked", onSeeked);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("play", onPlayState);
      v.removeEventListener("pause", onPauseState);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeked", onSeeked);
    };
  }, []);

  const activate = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = volume;
    setMuted(false);
    v.play().catch(() => {});
    if (!unmutedRef.current) {
      unmutedRef.current = true;
      unmuteAtRef.current = v.currentTime || 0;
      pushVslEvent("VSLUnmute", { video_id: VIDEO_ID, video_percent: Math.round(progress) });
      void trackVslEvent("play", { videoId: VIDEO_ID, percent: Math.round(progress), currentTime: v.currentTime || 0, duration: v.duration || 0, muted: false, rate: v.playbackRate });
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };

  const changeVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    const nv = Math.max(0, Math.min(1, val));
    v.volume = nv;
    v.muted = nv === 0;
    setVolume(nv);
  };

  const changeRate = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = val;
    setRate(val);
    setShowSpeed(false);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  const scheduleHide = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 2500);
  };
  const showControls = () => {
    setControlsVisible(true);
    if (playing) scheduleHide();
  };
  useEffect(() => {
    if (muted) return;
    if (playing) scheduleHide();
    else {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setControlsVisible(true);
    }
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [playing, muted]);

  const toggleFullscreen = async () => {
    const el = wrapRef.current as HTMLElement | null;
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
    try {
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      } else if (el?.requestFullscreen) {
        await el.requestFullscreen();
      } else if (v?.webkitEnterFullscreen) {
        v.webkitEnterFullscreen();
      }
    } catch { /* noop */ }
  };
  useEffect(() => {
    const onFs = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      setIsFullscreen(!!(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, []);

  return (
    <Reveal style={{ marginTop: 20 }}>
      <div
        ref={wrapRef}
        onMouseMove={showControls}
        onTouchStart={showControls}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 20,
          overflow: "hidden",
          background: "#000",
          cursor: "pointer",
          boxShadow: "0 2px 0 rgba(255,255,255,0.6), 0 30px 60px -15px rgba(122,74,14,0.35), 0 50px 90px -20px rgba(59,43,82,0.35)",
          border: "1px solid rgba(228,200,120,.4)",
        }}
      >
        <video
          ref={videoRef}
          src={VSL_URL}
          poster={jaquelinePoster}
          playsInline
          autoPlay
          muted
          preload="auto"
          onError={() => setVideoError(true)}
          onClick={() => {
            if (muted) { activate(); return; }
            showControls();
            togglePlay();
          }}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
        />

        {videoError && (
          <div
            style={{
              position: "absolute", inset: 0, zIndex: 3,
              display: "grid", placeItems: "center", textAlign: "center",
              background: "rgba(0,0,0,.72)", color: "#fff", padding: 24,
            }}
          >
            <div>
              <p style={{ fontWeight: 600, marginBottom: 10 }}>Não foi possível carregar o vídeo.</p>
              <button
                type="button"
                onClick={() => { setVideoError(false); videoRef.current?.load(); }}
                style={{
                  borderRadius: 999, background: "rgba(240,74,74,.95)", color: "#fff",
                  border: "none", padding: "10px 22px", cursor: "pointer", fontWeight: 600,
                }}
              >
                Tocar novamente
              </button>
            </div>
          </div>
        )}

        {muted && (
          <button
            type="button"
            onClick={activate}
            aria-label="Clique para ouvir"
            style={{
              position: "absolute", inset: 0,
              display: "grid", placeItems: "center",
              background: "transparent", border: "none", cursor: "pointer",
            }}
          >
            <div
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 10, borderRadius: 16,
                background: "rgba(240,74,74,.95)", color: "#fff",
                padding: "16px 24px", minWidth: 150, width: "min(58%, 260px)",
                boxShadow: "0 16px 40px rgba(0,0,0,.45)",
                border: "1px solid rgba(255,255,255,.25)",
              }}
            >
              <div
                style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: "rgba(255,255,255,.95)",
                  display: "grid", placeItems: "center",
                  boxShadow: "0 6px 18px rgba(0,0,0,.35)",
                  animation: "sa-playPulse 2s ease-in-out infinite",
                }}
              >
                <div style={{
                  width: 0, height: 0, marginLeft: 3,
                  borderTop: "9px solid transparent",
                  borderBottom: "9px solid transparent",
                  borderLeft: "15px solid #F04A4A",
                }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, textAlign: "center" }}>Clique para ouvir</span>
            </div>
          </button>
        )}

        {!muted && (
          <div
            onMouseEnter={() => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); setControlsVisible(true); }}
            onMouseLeave={() => { if (playing) scheduleHide(); }}
            style={{
              position: "absolute", insetInline: 0, bottom: 0,
              background: "linear-gradient(to top, rgba(0,0,0,.85), rgba(0,0,0,.55), transparent)",
              padding: "24px 12px 8px",
              opacity: controlsVisible ? 1 : 0,
              pointerEvents: controlsVisible ? "auto" : "none",
              transition: "opacity .3s",
            }}
          >
            <div
              role="progressbar"
              aria-label="Progresso do vídeo"
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}
              style={{
                height: 6, width: "100%", borderRadius: 99,
                background: `linear-gradient(90deg, #E4C878 0%, #B08A38 ${progress}%, rgba(255,255,255,0.25) ${progress}%, rgba(255,255,255,0.25) 100%)`,
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, color: "#fff" }}>
              <button type="button" onClick={togglePlay} aria-label={playing ? "Pausar" : "Reproduzir"}
                style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>
                {playing ? (
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "#fff" }}><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "#fff" }}><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <span style={{ fontSize: 10.5, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: "rgba(255,255,255,.9)" }}>
                {fmt(currentTime)} / {fmt(duration)}
              </span>

              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                <button type="button" onClick={() => changeVolume(volume > 0 ? 0 : 1)}
                  aria-label={volume === 0 ? "Ativar som" : "Silenciar"}
                  style={{ width: 24, height: 24, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "#fff" }}>
                    {volume === 0
                      ? <path d="M4 9v6h4l5 4V5L8 9H4zm12.6 3l2.8-2.8-1.4-1.4L15.2 10.6 12.4 7.8 11 9.2l2.8 2.8L11 14.8l1.4 1.4 2.8-2.8 2.8 2.8 1.4-1.4L16.6 12z"/>
                      : <path d="M4 9v6h4l5 4V5L8 9H4zm11 3a4 4 0 0 0-2-3.5v7a4 4 0 0 0 2-3.5zm-2-8v2.06a6 6 0 0 1 0 11.88V20a8 8 0 0 0 0-16z"/>
                    }
                  </svg>
                </button>
                <div style={{ position: "relative" }}>
                  <button type="button" onClick={() => setShowSpeed((s) => !s)}
                    style={{ borderRadius: 6, background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", padding: "4px 8px", fontSize: 10.5, fontWeight: 700, color: "#fff" }}>
                    {rate}x
                  </button>
                  {showSpeed && (
                    <div style={{ position: "absolute", bottom: "100%", right: 0, marginBottom: 6, display: "flex", flexDirection: "column", borderRadius: 8, background: "rgba(0,0,0,.9)", overflow: "hidden", boxShadow: "0 8px 20px rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.1)" }}>
                      {[0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
                        <button key={r} type="button" onClick={() => changeRate(r)}
                          style={{ padding: "6px 12px", fontSize: 11, background: r === rate ? "rgba(255,255,255,.15)" : "transparent", color: r === rate ? "#E4C878" : "rgba(255,255,255,.85)", border: "none", cursor: "pointer", textAlign: "left" }}>
                          {r}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Sair de tela cheia" : "Tela cheia"}
                  style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "#fff" }}>
                    {isFullscreen
                      ? <path d="M14 14h6v2h-4v4h-2v-6zM4 14h6v6H8v-4H4v-2zm10-4V4h2v4h4v2h-6zM4 8h4V4h2v6H4V8z"/>
                      : <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    }
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <span style={{
          display: "inline-block",
          fontSize: 11, letterSpacing: 2, color: "#8A6A2A", fontWeight: 600,
          background: "linear-gradient(180deg, transparent 55%, rgba(228,200,120,.35) 55%)",
          padding: "2px 8px",
        }}>
          OUÇA E ENTENDA POR QUE FUNCIONA
        </span>
        <div style={{ fontSize: 10, color: "#8A7C93", marginTop: 4 }}>Player só 5 minutos !</div>
      </div>
    </Reveal>
  );
}

/* ---------- Social Proof Carousel ---------- */

const WA_SHOTS = [
  { src: waJaquelineImg, alt: "Depoimento real no WhatsApp — descoberta do padrão" },
  { src: waJuliaImg, alt: "Depoimento real de Julia no WhatsApp" },
  { src: waAlarmaImg, alt: "Depoimento real no WhatsApp — alarme interno desligado" },
  { src: waAnaImg, alt: "Depoimento real de Ana no WhatsApp" },
  { src: waAna2Img, alt: "Segundo depoimento real de Ana no WhatsApp" },
  { src: fbCommentsImg, alt: "Comentários reais de leitoras sobre o método Neurofé" },
];

function ShotsCarousel() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);

  const scrollToIndex = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const child = track.children[i] as HTMLElement | undefined;
    if (!child) return;
    const left = child.offsetLeft - (track.clientWidth - child.clientWidth) / 2;
    track.scrollTo({ left, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const center = track.scrollLeft + track.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        Array.from(track.children).forEach((el, i) => {
          const c = (el as HTMLElement);
          const mid = c.offsetLeft + c.clientWidth / 2;
          const d = Math.abs(mid - center);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        setActive(best);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => { track.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <Reveal
      style={{
        marginTop: 48,
        background: "linear-gradient(180deg,#F5EDD9,#EDE3CC)",
        border: "1px solid rgba(212,175,55,.4)",
        borderRadius: 24,
        paddingTop: 24,
        paddingBottom: 24,
        overflow: "hidden",
        boxShadow: "0 18px 42px rgba(90,70,40,.10)",
      }}
    >
      <div style={{ padding: "0 22px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", letterSpacing: 3, fontSize: 14, color: "#8A6A2A" }}>
          ELAS CONFIARAM. ELAS SENTIRAM A MUDANÇA.
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: 24, lineHeight: 1.3, color: "#4A4152", margin: "10px 0 0" }}>
          Um novo caminho para mulheres que estavam cansadas de tentar sozinhas.
        </h2>
        <div style={{ fontSize: 13, color: "#5D5368", marginTop: 10, lineHeight: 1.55 }}>
          Relatos de quem encontrou mais calma, descanso e presença com Deus através de um método feito para compreender a realidade da mulher sobrecarregada.
        </div>
      </div>
      <div
        ref={trackRef}
        style={{
          display: "flex", gap: 14, overflowX: "auto",
          scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none", padding: "16px 22px 8px",
        }}
      >
        {WA_SHOTS.map((s, i) => (
          <figure
            key={i}
            style={{
              flex: "0 0 70%", maxWidth: 280, scrollSnapAlign: "center",
              borderRadius: 16, overflow: "hidden", margin: 0,
              border: "1px solid rgba(90,70,40,.12)", background: "#fff",
              boxShadow: "0 16px 36px rgba(59,43,82,.16)",
            }}
          >
            <img src={s.src} alt={s.alt} loading="lazy" style={{ width: "100%", display: "block" }} />
          </figure>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
        {WA_SHOTS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIndex(i)}
            aria-label={`Depoimento ${i + 1}`}
            style={{
              width: i === active ? 24 : 8, height: 8, borderRadius: 99,
              background: i === active ? "#3B2B52" : "rgba(59,43,82,.25)",
              border: "none", cursor: "pointer", padding: 0,
              transition: "all .25s",
            }}
          />
        ))}
      </div>
    </Reveal>
  );
}

/* ---------- Volumes Loop (auto-scroll infinito) ---------- */

const VOLUME_ITEMS = [
  { src: vol1Img, title: "Volume I — Despertar", sub: "7 Manhãs de Renovação Neural", square: true },
  { src: vol2Img, title: "Volume II — Repouso", sub: "7 Noites de Selagem Profunda", square: true },
  { src: rotinaLogoImg, title: "Rotina de Paz", sub: "Haja Luz — selo do método", square: true },
  { src: jaquelineAppImg, title: "Dentro do app", sub: "Sua Jornada de Paz na palma da mão", square: false },
];

function VolumesLoop() {
  const loop = [...VOLUME_ITEMS, ...VOLUME_ITEMS];
  return (
    <div style={{ marginTop: 26, overflow: "hidden", margin: "26px -20px 0", padding: "0 20px",
      maskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
      WebkitMaskImage: "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
    }}>
      <div style={{
        display: "flex", gap: 14, width: "max-content", paddingBlock: 4,
        animation: prefersReducedMotion() ? "none" : "sa-volLoop 28s linear infinite",
      }}>
        {loop.map((v, i) => (
          <figure key={i} style={{
            width: 240, flex: "none", overflow: "hidden", borderRadius: 16, margin: 0,
            border: "1px solid rgba(212,175,55,.25)", background: "#fff",
            boxShadow: "0 12px 30px rgba(90,70,40,.12)",
          }}>
            <div style={{ width: "100%", aspectRatio: v.square ? "1" : "4/5", overflow: "hidden" }}>
              <img src={v.src} alt={v.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
            <div style={{ padding: "12px 16px" }}>
              <b style={{ fontSize: 14, color: "#4A4152" }}>{v.title}</b>
              <div style={{ fontSize: 12.5, color: "#7A7185", marginTop: 2 }}>{v.sub}</div>
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}

/* ---------- AnimatedGridPattern ---------- */

function AnimatedGridPattern({ numSquares = 25, gridSize = 48, maxOpacity = 0.08, duration = 3, repeatDelay = 1.5 }: {
  numSquares?: number; gridSize?: number; maxOpacity?: number; duration?: number; repeatDelay?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [squares, setSquares] = useState<Array<{ id: number; col: number; row: number }>>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = Math.ceil(dims.w / gridSize);
  const rows = Math.ceil(dims.h / gridSize);

  const spawnSquare = useCallback(() => {
    if (!cols || !rows) return null;
    return { id: idRef.current++, col: Math.floor(Math.random() * cols), row: Math.floor(Math.random() * rows) };
  }, [cols, rows]);

  useEffect(() => {
    if (!cols || !rows) return;
    const initial: typeof squares = [];
    for (let i = 0; i < numSquares; i++) {
      const sq = spawnSquare();
      if (sq) initial.push(sq);
    }
    setSquares(initial);
  }, [cols, rows, numSquares, spawnSquare]);

  const replaceSquare = (id: number) => {
    setSquares(prev => {
      const sq = spawnSquare();
      return sq ? prev.map(s => s.id === id ? sq : s) : prev;
    });
  };

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <pattern id="grid-pat" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(176,138,56,.15)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pat)" />
      </svg>
      <AnimatePresence>
        {squares.map(sq => (
          <motion.div
            key={sq.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            exit={{ opacity: 0 }}
            transition={{ duration, repeat: 1, repeatType: "reverse", repeatDelay, onComplete: () => replaceSquare(sq.id) } as never}
            style={{
              position: "absolute",
              left: sq.col * gridSize + 1,
              top: sq.row * gridSize + 1,
              width: gridSize - 1,
              height: gridSize - 1,
              borderRadius: 4,
              background: "linear-gradient(135deg,rgba(212,175,55,.5),rgba(138,95,176,.3))",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------- ScarcityBar ---------- */

function ScarcityBar() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { setW(63); io.disconnect(); }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Reveal
      style={{
        marginTop: 22,
        background: "linear-gradient(180deg,#3B2B52,#241B33)",
        border: "1px solid rgba(228,200,120,.4)",
        borderRadius: 16, padding: "16px 18px", textAlign: "left",
        boxShadow: "0 12px 30px rgba(59,43,82,.25)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, letterSpacing: 2, color: "#E4C878", fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#E4C878", animation: "sa-vagaBlink 1.6s ease-in-out infinite" }} />
          TURMA LIMITADA · 100 MULHERES
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F5EEE2" }}>37 vagas</div>
      </div>
      <div ref={ref} style={{ height: 8, borderRadius: 99, background: "rgba(255,255,255,.12)", marginTop: 12, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${w}%`, borderRadius: 99, background: "linear-gradient(90deg,#E89BC8,#E4C878)", transition: "width 1.3s cubic-bezier(.22,.8,.3,1)" }} />
      </div>
    </Reveal>
  );
}

/* ---------- Data ---------- */

const ENTREGAS: Array<{ t: string; d: string }> = [
  { t: "Método completo dentro do APP", d: "" },
  { t: "App guiado", d: "— tudo organizado e didático no seu celular. Você abre, e ele sabe onde você parou." },
  { t: "Volume I — Despertar", d: "— 7 Manhãs de Renovação Neural" },
  { t: "Volume II — Repouso", d: "— 7 Noites de Selagem Profunda" },
  { t: "Acesso vitalício pelo app", d: "— você ouve quando quiser, quantas vezes precisar." },
];

const INCLUI = [
  "Volume I + Volume II",
  "14 sessões guiadas",
  "E-book 30 Devocionais",
  "E-book Dormir Melhor Hoje",
  "Louvores do Reino (148)",
  "Acesso vitalício",
];

/* ---------- OfferScreen ---------- */

export function OfferScreen({
  archetype,
  desire,
  leadName,
  priceCents,
  anchorCents,
  freeInstCount: _freeInstCount,
  onCheckout,
  onBack,
}: {
  archetype: ArchetypeData;
  desire?: string;
  leadName?: string;
  priceCents: number;
  anchorCents: number;
  freeInstCount: number;
  onCheckout: () => void;
  onBack: () => void;
}) {
  void _freeInstCount;
  void anchorCents;
  const ctaLabel = (desire && DESIRE_CTA[desire]) || "Eu creio — quero minha paz";
  const quote = (desire && DESIRE_QUOTE[desire]) || null;
  const priceReais = Math.round(priceCents / 100);
  const firstName = leadName?.trim().split(/\s+/)[0] || "";
  const offerH = OFFER_HEADLINE[archetype.name] ?? OFFER_HEADLINE["SOBRECARGA"];

  // CTA: clique no checkout (correlaciona assistiu→converteu) + visualização do CTA
  const ctaClickedRef = useRef(false);
  const ctaViewedRef = useRef(false);
  const handleCheckout = () => {
    if (!ctaClickedRef.current) {
      ctaClickedRef.current = true;
      void trackVslEvent("cta_click", { videoId: VIDEO_ID });
    }
    onCheckout();
  };

  // Sticky bar só aparece após scroll past depoimentos
  const shotsEndRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    const el = shotsEndRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowBar(true);
          if (!ctaViewedRef.current) {
            ctaViewedRef.current = true;
            void trackVslEvent("cta_view", { videoId: VIDEO_ID });
          }
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Montserrat',sans-serif",
        color: "#4A4152",
        background: "linear-gradient(180deg,#FDFBF7,#F7F1E6)",
        overflowX: "hidden",
        position: "relative" as const,
      }}
    >
      <AnimatedGridPattern numSquares={35} maxOpacity={0.25} duration={1.5} repeatDelay={0.5} />
      <div
        style={{
          maxWidth: 640, margin: "0 auto",
          display: "flex", flexDirection: "column",
          padding: "0 20px calc(96px + env(safe-area-inset-bottom))",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Voltar */}
        <button
          type="button"
          onClick={onBack}
          style={{
            alignSelf: "flex-start", marginTop: 14, marginLeft: -4,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: "#8A5FB0",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}
        >
          <span aria-hidden>←</span> Voltar
        </button>

        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "22px 0 6px" }}>
          <img
            src={logoImg}
            alt="Rotina de Paz"
            style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(212,175,55,.5)" }}
          />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 15, letterSpacing: 3, color: "#8A6A2A", fontWeight: 600 }}>
              ROTINA DE PAZ
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#5FA86B" }} />
              <div style={{ fontSize: 10.5, color: "#7A7185" }}>Jaqueline · online agora</div>
            </div>
          </div>
        </div>

        {/* Abertura — headline escaneável */}
        <div className="sa-offer-hero" style={{ marginTop: 22 }}>
          <Reveal>
            <h1 className="sa-offer-h1" dangerouslySetInnerHTML={{ __html: offerH.h }} />
          </Reveal>
          <Reveal>
            <div className="sa-offer-chips">
              <span className="sa-offer-chip">10 min por sessão</span>
              <span className="sa-offer-chip">nenhuma tarefa a mais</span>
            </div>
          </Reveal>
          <div className="sa-offer-playcta">
            <span className="dot">▶</span>
            <span className="txt">
              Aperte o play — em poucos minutos você entende <b>por que nada antes funcionou.</b>
            </span>
          </div>
        </div>

        {/* VSL Player custom */}
        <VSLPlayer />

        {/* IR PARA A OFERTA — anchor jump */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <a
            href="#sa-oferta"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("sa-oferta")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              borderRadius: 50,
              background: "linear-gradient(90deg,#3B2B52,#5E3E85,#3B2B52)",
              backgroundSize: "200% auto",
              padding: "14px 24px",
              fontSize: 12, fontWeight: 700, letterSpacing: 1, color: "#F5EEE2",
              textDecoration: "none",
              boxShadow: "0 12px 34px rgba(59,43,82,.4)",
              animation: "sa-shine 3.5s linear infinite",
            }}
          >
            IR PARA A OFERTA →
          </a>
        </div>

        {/* Método */}
        <Reveal
          style={{
            marginTop: 44,
            background: "linear-gradient(180deg,#fff,#FBF7EE)",
            border: "1px solid rgba(212,175,55,.4)",
            borderRadius: 24, padding: "30px 24px", textAlign: "center",
            boxShadow: "0 8px 30px rgba(90,70,40,.08)",
          }}
        >
          <Reveal>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", letterSpacing: 3, fontSize: 14, color: "#8A6A2A" }}>
              MÉTODO COMPLETO · 7 DIAS
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: 27, lineHeight: 1.25, color: "#4A4152", margin: "16px 0 0" }}>
              Você já tentou de tudo.<br />Mas nunca tentou <em style={{ color: "#8A5FB0" }}>você inteira</em>.
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <div style={{ fontSize: 13.5, lineHeight: 1.7, color: "#5D5368", marginTop: 14, textAlign: "left" }}>
              Terapia cuida da mente. Remédio cuida do corpo. A fé, com o corpo em alarme, não alcança por completo. <b style={{ color: "#4A4152" }}>Cada método tratou só um pedaço de você.</b>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <div style={{
              marginTop: 14, padding: "14px 16px", textAlign: "left",
              borderLeft: "3px solid #B08A38",
              background: "linear-gradient(90deg, rgba(176,138,56,.06), transparent)",
              borderRadius: "0 12px 12px 0",
              fontSize: 13.5, lineHeight: 1.7, color: "#5D5368",
            }}>
              A <b style={{ color: "#3D2645" }}>Neurofé</b> cuida das três camadas ao mesmo tempo — <b style={{ color: "#3D2645" }}>corpo, mente e espírito, com Deus no centro.</b> A respiração acalma, a Palavra alcança, a repetição abre um caminho novo. A neurociência chama de neuroplasticidade. Paulo chamava de outra coisa:
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div
              style={{
                marginTop: 20,
                background: "radial-gradient(circle at 50% 0%, rgba(138,95,176,.10), rgba(212,175,55,.06))",
                border: "1.5px solid rgba(212,175,55,.55)",
                borderRadius: 18, padding: "24px 22px",
                animation: "rdp-float 3s ease-in-out infinite",
                boxShadow: "0 8px 30px rgba(212,175,55,.08)",
              }}
            >
              <div style={{ fontSize: 10.5, letterSpacing: 3, color: "#8A6A2A", fontWeight: 700 }}>ROMANOS 12:2</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 24, lineHeight: 1.45, color: "#3B2B52", marginTop: 10 }}>
                "Transformai-vos pela renovação da vossa mente."
              </div>
            </div>
          </Reveal>
          <Reveal delay={500}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 16, color: "#6B6076", marginTop: 18 }}>
              O método que acalma o corpo pra Palavra alcançar você inteira — dentro do app{" "}
              <b style={{ fontStyle: "normal", color: "#8A5FB0" }}>Rotina de Paz</b>.
            </div>
          </Reveal>
        </Reveal>

        {/* Social proof — WhatsApp screenshots */}
        <ShotsCarousel />
        <div ref={shotsEndRef} style={{ height: 1 }} />

        {/* O que você recebe */}
        <div style={{ marginTop: 48 }}>
          <Reveal
            as="h2"
            style={{
              fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: 28,
              color: "#4A4152", margin: 0, display: "flex", alignItems: "center", gap: 12,
            }}
          >
            <span style={{ flex: "none", width: 34, height: 2, background: "#D4AF37" }} />O que você recebe
          </Reveal>
          <Reveal style={{ fontSize: 15, lineHeight: 1.7, color: "#5D5368", marginTop: 14 }}>
            <b>14 sessões guiadas em áudio</b>: 7 capítulos pra usar de manhã e 7 à noite. Cada sessão tem de <b>8 a 12 minutos</b> — cabe entre uma
            tarefa e outra, antes de dormir, antes da casa acordar.
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
            {ENTREGAS.map((e) => (
              <Reveal
                key={e.t}
                style={{
                  display: "flex", gap: 13, alignItems: "flex-start",
                  background: "#fff", border: "1px solid rgba(212,175,55,.25)",
                  boxShadow: "0 4px 16px rgba(90,70,40,.06)",
                  borderRadius: 14, padding: "15px 17px",
                }}
              >
                <div style={{
                  flex: "none", width: 24, height: 24, borderRadius: "50%",
                  background: "#3B2B52", color: "#E4C878",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                }}>✓</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "#4A4152" }}>
                  <b>{e.t}</b> {e.d}
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Volumes — loop infinito */}
        <VolumesLoop />

        {/* Bônus — com micro-copy */}
        <Reveal
          style={{
            marginTop: 48,
            background: "radial-gradient(ellipse 120% 100% at 50% 0%, #3B2B52, #241B33)",
            borderRadius: 24, padding: "30px 24px", textAlign: "center", color: "#EFE7D6",
          }}
        >
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 16, color: "#E4C878" }}>
            🎁 Bônus para fortalecer sua Rotina de Paz
          </div>
          <img
            src={bonusLouvoresImg}
            alt="Bônus: 148 Louvores em Salmos + e-books"
            style={{
              width: "100%", maxWidth: 420, borderRadius: 16, marginTop: 16, display: "block", marginLeft: "auto", marginRight: "auto",
              boxShadow: "0 18px 40px rgba(0,0,0,.35)",
              outline: "1px solid rgba(228,200,120,.2)", outlineOffset: -1,
            }}
            loading="lazy"
          />
          <div style={{
            marginTop: 16, borderRadius: 16, border: "1px solid rgba(228,200,120,.25)",
            background: "rgba(255,255,255,.04)", padding: 20, textAlign: "left",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {[
              { title: "148 Louvores em Salmos", note: "playlist para o quarto virar altar" },
              { title: "E-book Dormir Melhor Hoje", note: "protocolo de sono em 3 passos" },
              { title: "Devocional 30 Dias com Jesus", note: "para orar como filha, não como funcionária" },
            ].map((b) => (
              <div key={b.title} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#E4D9F0" }}>
                <span style={{ color: "#E4C878", marginTop: 1 }}>✦</span>
                <div>
                  <b style={{ color: "#F5EEE2" }}>{b.title}</b>
                  <span style={{ color: "#C9BCDB" }}> — {b.note}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.65, color: "#C9BCDB", marginTop: 16 }}>
            De presente, dentro do app <b style={{ color: "#F5EEE2" }}>Rotina de Paz</b>.
          </div>
        </Reveal>

        {/* Oferta · card premium */}
        <Reveal style={{ marginTop: 52, textAlign: "center" }} >
          <div id="sa-oferta" style={{ scrollMarginTop: 24 }} />
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#B08A38", fontWeight: 700 }}>COMECE HOJE</div>
          <img
            src={logoImg}
            alt="Rotina de Paz"
            style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", marginTop: 12, border: "2px solid rgba(212,175,55,.5)", display: "block", marginLeft: "auto", marginRight: "auto" }}
          />
          <h2
            style={{
              fontFamily: "'Cormorant Garamond',serif", fontWeight: 500,
              fontSize: "clamp(34px,9vw,46px)", color: "#3B2B52",
              margin: "10px 0 0", lineHeight: 1,
            }}
          >
            Rotina de Paz
          </h2>
          <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "#6B6076", marginTop: 12, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
            Para{" "}
            <mark style={{ background: "linear-gradient(180deg, transparent 55%, rgba(228,200,120,.55) 55%)", color: "#6B6076", padding: "0 2px", fontWeight: 600 }}>
              suporte
            </mark>{" "}
            no app, limitamos a <b style={{ color: "#8A6A2A" }}>100 mulheres de fé</b>.
          </div>

          <ScarcityBar />

          {/* card oferta escuro */}
          <Reveal
            style={{
              marginTop: 16,
              background: "radial-gradient(ellipse 120% 80% at 50% 0%, #3B2B52, #211830)",
              border: "1px solid rgba(228,200,120,.3)",
              borderRadius: 26, padding: "30px 22px",
              boxShadow: "0 26px 70px rgba(33,24,48,.4)",
              color: "#EFE7D6",
            }}
          >
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              border: "1px solid rgba(228,200,120,.3)", borderRadius: 99,
              padding: "7px 16px", fontSize: 10.5, letterSpacing: .8, color: "rgba(228,200,120,.75)", fontWeight: 500,
            }}>
              <svg viewBox="0 0 16 16" style={{ width: 13, height: 13, fill: "none" }}>
                <path d="M8 1.5l5 2v4c0 3.5-2.2 5.8-5 7-2.8-1.2-5-3.5-5-7v-4l5-2z" fill="rgba(228,200,120,.2)" stroke="rgba(228,200,120,.6)" strokeWidth="1"/>
                <path d="M6 8l1.5 1.5L10.5 6" stroke="rgba(228,200,120,.8)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Garantia de {NEUROFE_OFFER.guaranteeDays} dias · o risco é meu
            </div>

            {/* value stack */}
            <div style={{ marginTop: 26, textAlign: "left" }}>
              {NEUROFE_OFFER.valueStack.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                    padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,.09)",
                  }}
                >
                  <div style={{ fontSize: 14, color: "#E4D9F0" }}>{item.label}</div>
                  <div style={{ fontSize: 14, color: "#9A8FB5", textDecoration: "line-through", whiteSpace: "nowrap" }}>
                    {formatBRL(item.cents)}
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 4px" }}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: "#E4C878", fontWeight: 700 }}>VALOR TOTAL</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: "#9A8FB5", textDecoration: "line-through" }}>
                  {formatBRL(NEUROFE_OFFER.anchorCents)}
                </div>
              </div>
            </div>

            {/* preço */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, color: "#A796BD" }}>hoje, só pra esta turma:</div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: "clamp(72px,20vw,96px)", lineHeight: 1,
                  color: "#F5EEE2", marginTop: 2,
                  textShadow: "0 4px 30px rgba(232,155,208,.35)",
                }}
              >
                R${priceReais}
              </div>
              <div style={{ fontStyle: "italic", fontSize: 12.5, color: "#C9BCDB", marginTop: 8, maxWidth: 320, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
                Por que tão acessível? Porque tem mulher que segura tudo sozinha — viúvas, mães solo — e todas elas merecem esse alívio.
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 16, color: "#E4C878", marginTop: 8 }}>
                menos de R$7 por dia na sua primeira semana
              </div>
              <div style={{ fontSize: 14, color: "#E4D9F0", marginTop: 10 }}>
                ou{" "}
                <b style={{
                  fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 27,
                  color: "#E4C878", textShadow: "0 2px 16px rgba(228,200,120,.45)",
                }}>
                  {NEUROFE_OFFER.installments}× de {formatBRL(NEUROFE_OFFER.installmentCents)}
                </b>
              </div>
              <div style={{ fontSize: 12, color: "#A796BD", marginTop: 6 }}>
                pagamento único · sem mensalidade · acesso imediato
              </div>
            </div>

            {/* tudo isto é seu */}
            <div style={{
              marginTop: 26, background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "20px 18px", textAlign: "left",
            }}>
              <div style={{ fontSize: 10.5, letterSpacing: 3, color: "#E4C878", fontWeight: 700 }}>TUDO ISTO É SEU</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 14px", marginTop: 16 }}>
                {INCLUI.map((it) => (
                  <div key={it} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, lineHeight: 1.4, color: "#E4D9F0" }}>
                    <span style={{ flex: "none", color: "#7FD69A", fontWeight: 700 }}>✓</span>
                    {it}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={handleCheckout}
              aria-label={ctaLabel}
              className="sa-cta-keep"
              style={{
                display: "block", width: "100%", marginTop: 26,
                background: "linear-gradient(135deg,#F0AED6,#D482B5)",
                color: "#3B2B52", fontWeight: 700, fontSize: 15, letterSpacing: ".5px",
                border: "none", cursor: "pointer", padding: "20px 22px", borderRadius: 50,
                animation: "sa-pinkGlow 2.8s ease-in-out infinite, sa-btnPulse 2.6s ease-in-out infinite",
              }}
            >
              {ctaLabel} &nbsp;→
            </button>
            <div style={{ fontSize: 11.5, color: "#A796BD", marginTop: 14 }}>
              🔒 Pagamento seguro · Acesso imediato · Garantia de {NEUROFE_OFFER.guaranteeDays} dias
            </div>
          </Reveal>
        </Reveal>

        {/* Desejo — com nome */}
        {quote && (
          <div style={{ textAlign: "center", marginTop: 44 }}>
            <Reveal style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 20, lineHeight: 1.5, color: "#6B6076" }}>
              {firstName
                ? <><b style={{ fontStyle: "normal", color: "#4A4152" }}>{firstName},</b> você lembra do seu desejo: </>
                : "Você lembra do seu desejo: "
              }
              <span style={{ color: "#8A5FB0" }}>"{quote}"</span>
            </Reveal>
            <Reveal style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, color: "#4A4152", marginTop: 10 }}>
              Esse é o caminho específico pra ele.
            </Reveal>
          </div>
        )}

        {/* Honestidade */}
        <Reveal style={{ marginTop: 52 }}>
          <div style={{ fontSize: 10.5, letterSpacing: 3, color: "#8A6A2A", fontWeight: 700 }}>
            COM HONESTIDADE, PRA VOCÊ DECIDIR BEM
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "#5D5368", marginTop: 12 }}>
            <b style={{ color: "#4A4152" }}>O que esperar:</b> {archetype.esperar}
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.7, color: "#5D5368", marginTop: 10 }}>
            <b style={{ color: "#4A4152" }}>O que não esperar:</b> {archetype.naoEsperar}
          </div>
        </Reveal>

        {/* Garantia */}
        <Reveal
          style={{
            marginTop: 28, background: "linear-gradient(135deg,#3B2B52,#2A1D3E)",
            border: "1px solid rgba(228,200,120,.3)",
            borderRadius: 20, padding: "26px 24px",
            display: "flex", gap: 16, alignItems: "flex-start",
            boxShadow: "0 16px 40px rgba(33,24,48,.35)",
          }}
        >
          <div style={{ flex: "none", width: 56, height: 56 }}>
            <svg viewBox="0 0 56 56" style={{ width: 56, height: 56 }}>
              <defs>
                <linearGradient id="shield-silver" x1="0" y1="0" x2=".5" y2="1">
                  <stop offset="0" stopColor="#E8E8EC" />
                  <stop offset=".4" stopColor="#C0C0C8" />
                  <stop offset="1" stopColor="#8A8A96" />
                </linearGradient>
                <linearGradient id="shield-inner" x1=".5" y1="0" x2=".5" y2="1">
                  <stop offset="0" stopColor="#F4F4F8" />
                  <stop offset="1" stopColor="#D0D0D8" />
                </linearGradient>
              </defs>
              <path d="M28 4 L48 14 V30 C48 42 38 50 28 54 C18 50 8 42 8 30 V14 Z" fill="url(#shield-silver)" />
              <path d="M28 8 L44 16 V30 C44 40 36 47 28 50 C20 47 12 40 12 30 V16 Z" fill="url(#shield-inner)" />
              <path d="M20 28 L25.5 33.5 L36 22" fill="none" stroke="#3B2B52" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: "#E4C878" }}>
              Garantia incondicional de {NEUROFE_OFFER.guaranteeDays} dias — e repara na conta.
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,.85)", marginTop: 8 }}>
              A jornada inteira é de 7 dias. A garantia é de 15. Você faz o método completo, sente na pele — e ainda sobram 8 dias pra decidir com calma se quer ficar. Você experimenta de verdade, e só depois decide. Se sentir que não é pra você, me escreve e devolvo cada centavo. Sem formulário, sem pergunta, sem julgamento.
            </div>
          </div>
        </Reveal>

        {/* Avatar / app + CTA */}
        <Reveal style={{ textAlign: "center", marginTop: 44 }}>
          <img
            src={jaquelinePoster}
            alt="Jaqueline — Rotina de Paz"
            style={{ width: "100%", maxWidth: 300, borderRadius: 20, boxShadow: "0 20px 50px rgba(59,43,82,.22)", display: "block", margin: "0 auto" }}
            loading="lazy"
          />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 16, color: "#6B6076", marginTop: 12 }}>
            Tudo isso te esperando dentro do app <b style={{ fontStyle: "normal", color: "#8A5FB0" }}>Rotina de Paz</b>.
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            aria-label={ctaLabel}
            className="sa-cta-keep"
            style={{
              display: "inline-block", marginTop: 26,
              background: "linear-gradient(90deg,#3B2B52,#5E3E85,#3B2B52)",
              backgroundSize: "200% auto",
              animation: "sa-shine 3.5s linear infinite, sa-ctaGlow 2.8s ease-in-out infinite, sa-btnPulse 2.4s ease-in-out infinite",
              color: "#F5EEE2", fontWeight: 700, fontSize: 14.5, letterSpacing: 1.5,
              border: "none", cursor: "pointer", padding: "20px 40px", borderRadius: 50,
            }}
          >
            QUERO NEUROFÉ →
          </button>
          <div style={{ fontSize: 12, color: "#8A7C93", marginTop: 12 }}>
            🔒 Acesso imediato · Garantia de {NEUROFE_OFFER.guaranteeDays} dias
          </div>
        </Reveal>

        {/* Rodapé */}
        <div style={{ textAlign: "center", marginTop: 56 }}>
          <img src={logoImg} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", opacity: 0.9, display: "block", margin: "0 auto" }} />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, letterSpacing: 5, color: "#8A6A2A", marginTop: 10 }}>
            ROTINA DE PAZ
          </div>
          <div style={{ fontSize: 9, letterSpacing: 4, color: "#B9AA8F", marginTop: 4 }}>HAJA LUZ</div>
          <button
            type="button"
            onClick={onBack}
            style={{
              marginTop: 16, background: "none", border: "none",
              cursor: "pointer", fontSize: 11, color: "#8A7C93",
              textDecoration: "underline",
            }}
          >
            ← voltar ao resultado
          </button>
        </div>
      </div>

      {/* CTA fixo mobile — aparece só após depoimentos */}
      <div
        style={{
          position: "fixed", insetInline: 0, bottom: 0, zIndex: 40,
          transform: showBar ? "translateY(0)" : "translateY(100%)",
          transition: "transform .4s cubic-bezier(.22,.8,.3,1)",
          borderTop: "1px solid rgba(212,175,55,.28)",
          background: "rgba(246,240,228,.96)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          padding: "10px 16px calc(10px + env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, color: "#3B2B52", fontWeight: 600 }}>
              R${priceReais}{" "}
              <span style={{ fontSize: 11, fontWeight: 400, color: "#8A6A2A" }}>
                ou {NEUROFE_OFFER.installments}× {formatBRL(NEUROFE_OFFER.installmentCents)}
              </span>
            </div>
            <div style={{ fontSize: 10, letterSpacing: 1.6, color: "#9A8FA6", textTransform: "uppercase" }}>Acesso imediato</div>
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            aria-label={ctaLabel}
            style={{
              flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 8,
              background: "linear-gradient(135deg,#F0AED6,#D482B5)",
              color: "#3B2B52", fontWeight: 700, fontSize: 12.5,
              border: "none", cursor: "pointer", padding: "13px 20px", borderRadius: 50,
            }}
          >
            Quero minha vaga <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
