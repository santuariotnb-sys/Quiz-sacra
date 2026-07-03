import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { NEUROFE_OFFER, DESIRE_CTA, DESIRE_QUOTE, type ArchetypeData } from "@/data/quiz";
import { formatBRL } from "@/lib/prices";
import logoImg from "@/assets/logo.webp";
import jaquelinePoster from "@/assets/jaqueline.webp";
import vol1Img from "@/assets/vol1-despertar.webp";
import vol2Img from "@/assets/vol2-repouso.webp";
import bonusLouvoresImg from "@/assets/bonus-louvores.webp";
import jaquelineAppImg from "@/assets/jaqueline-app.webp";

/* ============================================================
 * TELA B — Como Funciona / Oferta (design Neurofé, port 1:1)
 * Fonte: design_handoff_rotina_de_paz/src/Como Funciona.dc.html
 * Página de scroll, coluna max-width 640, fundo creme, blocos
 * revelam via IntersectionObserver. Todos os CTAs → onCheckout.
 * ============================================================ */

const VSL_URL = "https://cdnrotinadepaz.b-cdn.net/VSL-mecanismo-v2v3-EDITADA.mp4";

// Acessibilidade: respeita "reduzir movimento" no scroll suave do carrossel.
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Gate de hostname — só dispara tracking em produção (mesmo do pai).
function trackingAllowed() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "rotinadepaz.com.br" || h === "sacra.rotinadepaz.com.br";
}

// Bloco que revela ao entrar na viewport (replica o data-reveal do design).
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

// Slot da VSL: <video> nativo + rastreio de marcos 25/50/75/100 (1× cada, gate de hostname).
function VslSlot() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const firedRef = useRef<Set<number>>(new Set());
  const [pct, setPct] = useState(0);

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const p = (v.currentTime / v.duration) * 100;
    setPct(p);
    if (!trackingAllowed()) return;
    [25, 50, 75, 100].forEach((m) => {
      const reached = m === 100 ? p >= 99 : p >= m;
      if (reached && !firedRef.current.has(m)) {
        firedRef.current.add(m);
        try {
          (window as { fbq?: (...a: unknown[]) => void }).fbq?.("trackCustom", "VSLProgress", { percent: m });
        } catch {
          /* noop */
        }
      }
    });
  };

  return (
    <Reveal style={{ marginTop: 22 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "9 / 13",
          maxHeight: "72vh",
          borderRadius: 22,
          overflow: "hidden",
          background: "#241B33",
          boxShadow: "0 24px 60px rgba(59,43,82,.35)",
        }}
      >
        <video
          ref={videoRef}
          src={VSL_URL}
          poster={jaquelinePoster}
          playsInline
          controls
          preload="metadata"
          onTimeUpdate={onTimeUpdate}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* barra de progresso dourada */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 5,
            background: "rgba(255,255,255,.18)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "linear-gradient(90deg,#B08A38,#E4C878)",
              transition: "width .25s linear",
            }}
          />
        </div>
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 10.5,
          letterSpacing: 2,
          color: "#9A8FA6",
          marginTop: 10,
        }}
      >
        OUÇA E ENTENDA POR QUE FUNCIONA
      </div>
    </Reveal>
  );
}

// Carrossel de volumes (scroll-snap-x + dots ativos).
function VolumesCarousel() {
  const carRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const imgs = [vol1Img, vol2Img];

  const onScroll = () => {
    const car = carRef.current;
    if (!car) return;
    const cards = Array.from(car.querySelectorAll<HTMLElement>("[data-card]"));
    const cx = car.scrollLeft + car.clientWidth / 2;
    let best = 0;
    let bd = Infinity;
    cards.forEach((c, i) => {
      const cc = c.offsetLeft + c.offsetWidth / 2;
      const d = Math.abs(cc - cx);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setActive(best);
  };

  const goTo = (i: number) => {
    const car = carRef.current;
    if (!car) return;
    const cards = Array.from(car.querySelectorAll<HTMLElement>("[data-card]"));
    const card = cards[i];
    if (!card) return;
    const target = card.offsetLeft - (car.clientWidth - card.offsetWidth) / 2;
    car.scrollTo({ left: target, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div style={{ marginTop: 26 }}>
      <div
        ref={carRef}
        onScroll={onScroll}
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          padding: "4px 20px 6px",
          margin: "0 -20px",
        }}
      >
        {NEUROFE_OFFER.volumes.map((vol, i) => (
          <Reveal
            key={vol.titulo}
            style={{
              flex: "0 0 78%",
              maxWidth: 300,
              scrollSnapAlign: "center",
              background: "#FBF7EE",
              border: "1px solid rgba(212,175,55,.28)",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 12px 30px rgba(90,70,40,.12)",
            }}
          >
            <div data-card>
              <img src={imgs[i]} alt={vol.titulo} style={{ width: "100%", display: "block" }} loading="lazy" />
              <div style={{ padding: "14px 16px" }}>
                <b style={{ fontSize: 14, color: "#4A4152" }}>{vol.titulo}</b>
                <div style={{ fontSize: 12.5, color: "#7A7185", marginTop: 3 }}>{vol.subtitulo}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
        {NEUROFE_OFFER.volumes.map((vol, i) => (
          <span
            key={vol.titulo}
            onClick={() => goTo(i)}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              cursor: "pointer",
              background: i === active ? "#B08A38" : "rgba(176,138,56,.3)",
              transform: i === active ? "scale(1.25)" : "scale(1)",
              transition: "all .25s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Barra de escassez: 0 → 63% (37 vagas de 100) ao entrar na viewport.
function ScarcityBar() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setW(63);
            io.disconnect();
          }
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
        borderRadius: 16,
        padding: "16px 18px",
        textAlign: "left",
        boxShadow: "0 12px 30px rgba(59,43,82,.25)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 10.5,
            letterSpacing: 2,
            color: "#E4C878",
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#E4C878",
              animation: "sa-vagaBlink 1.6s ease-in-out infinite",
            }}
          />
          TURMA LIMITADA · 100 MULHERES
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F5EEE2" }}>37 vagas</div>
      </div>
      <div
        ref={ref}
        style={{
          height: 8,
          borderRadius: 99,
          background: "rgba(255,255,255,.12)",
          marginTop: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${w}%`,
            borderRadius: 99,
            background: "linear-gradient(90deg,#E89BC8,#E4C878)",
            transition: "width 1.3s cubic-bezier(.22,.8,.3,1)",
          }}
        />
      </div>
    </Reveal>
  );
}

// Entregas (5 itens — do design; NEUROFE_OFFER não expõe essa lista).
const ENTREGAS: Array<{ t: string; d: string }> = [
  { t: "Método completo dentro do APP", d: "" },
  { t: "App guiado", d: "— tudo organizado e didático no seu celular. Você abre, e ele sabe onde você parou." },
  { t: "Volume I — Despertar", d: "— 7 Manhãs de Renovação da Mente" },
  { t: "Volume II — Repouso", d: "— 7 Noites de Selagem Profunda" },
  { t: "Acesso vitalício pelo app", d: "— você ouve quando quiser, quantas vezes precisar." },
];

const INCLUI = [
  "Volume I + Volume II",
  "14 sessões guiadas",
  "E-book 30 Devocionais com Jesus",
  "E-book Dormir Melhor Hoje",
  "Louvores do Reino (148)",
  "Acesso vitalício",
];

export function OfferScreen({
  archetype,
  desire,
  priceCents,
  anchorCents,
  freeInstCount: _freeInstCount, // não usado: parcelamento exibido = 10× fixo do design
  onCheckout,
  onBack,
}: {
  archetype: ArchetypeData;
  desire?: string;
  priceCents: number;
  anchorCents: number;
  freeInstCount: number;
  onCheckout: () => void;
  onBack: () => void;
}) {
  void _freeInstCount;
  void anchorCents; // âncora exibida vem de NEUROFE_OFFER (R$228), não da prop
  const ctaLabel = (desire && DESIRE_CTA[desire]) || "Eu creio — quero minha paz";
  const quote = (desire && DESIRE_QUOTE[desire]) || null;
  const priceReais = Math.round(priceCents / 100);

  return (
    <div
      style={{
        fontFamily: "'Montserrat',sans-serif",
        color: "#4A4152",
        background: "linear-gradient(180deg,#F6F0E4,#F1E9D8)",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          padding: "0 20px calc(96px + env(safe-area-inset-bottom))",
          boxSizing: "border-box",
        }}
      >
        {/* Voltar discreto ao resultado */}
        <button
          type="button"
          onClick={onBack}
          style={{
            alignSelf: "flex-start",
            marginTop: 14,
            marginLeft: -4,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "#8A5FB0",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
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

        {/* Abertura */}
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <Reveal
            as="h1"
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontWeight: 500,
              fontSize: "clamp(28px,7.5vw,38px)",
              lineHeight: 1.2,
              color: "#4A4152",
              margin: 0,
            }}
          >
            Como a Neurofé desliga o alarme
            <br />
            no seu padrão <em style={{ color: "#8A5FB0" }}>{archetype.name}</em>
          </Reveal>
          <Reveal style={{ fontSize: 14.5, lineHeight: 1.65, color: "#6B6076", marginTop: 12 }}>
            Aperte o play. Em poucos minutos você entende <b>por que nada antes funcionou</b> — e o que fazer diferente ainda hoje.
          </Reveal>
        </div>

        {/* VSL */}
        <VslSlot />

        {/* Método */}
        <Reveal
          style={{
            marginTop: 56,
            background: "linear-gradient(180deg,#FBF7EE,#F4ECDC)",
            border: "1px solid rgba(212,175,55,.35)",
            borderRadius: 24,
            padding: "30px 24px",
            textAlign: "center",
          }}
        >
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", letterSpacing: 3, fontSize: 14, color: "#8A6A2A" }}>
            MÉTODO COMPLETO · 7 DIAS
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: 27, lineHeight: 1.25, color: "#4A4152", margin: "16px 0 0" }}>
            Você pode, agora, descobrir <em style={{ color: "#8A5FB0" }}>um novo caminho</em>.
          </h2>
          <div
            style={{ fontSize: 14.5, lineHeight: 1.75, color: "#5D5368", marginTop: 14, textAlign: "left" }}
            dangerouslySetInnerHTML={{ __html: NEUROFE_OFFER.metodo }}
          />
          <div
            style={{
              marginTop: 20,
              background: "radial-gradient(circle at 50% 0%, rgba(138,95,176,.10), rgba(212,175,55,.06))",
              border: "1.5px solid rgba(212,175,55,.55)",
              borderRadius: 18,
              padding: "24px 22px",
            }}
          >
            <div style={{ fontSize: 10.5, letterSpacing: 3, color: "#8A6A2A", fontWeight: 700 }}>ROMANOS 12:2</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 24, lineHeight: 1.45, color: "#3B2B52", marginTop: 10 }}>
              "Transformai-vos pela renovação da vossa mente."
            </div>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 17, color: "#6B6076", marginTop: 18 }}>
            O método guiado para desligar o alarme do medo e trazer alívio — dentro do app{" "}
            <b style={{ fontStyle: "normal", color: "#8A5FB0" }}>Rotina de Paz</b>.
          </div>
        </Reveal>

        {/* O que você recebe */}
        <div style={{ marginTop: 48 }}>
          <Reveal
            as="h2"
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontWeight: 500,
              fontSize: 28,
              color: "#4A4152",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 12,
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
                  display: "flex",
                  gap: 13,
                  alignItems: "flex-start",
                  background: "#FBF7EE",
                  border: "1px solid rgba(212,175,55,.28)",
                  borderRadius: 14,
                  padding: "15px 17px",
                }}
              >
                <div
                  style={{
                    flex: "none",
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#3B2B52",
                    color: "#E4C878",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                  }}
                >
                  ✓
                </div>
                <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "#4A4152" }}>
                  <b>{e.t}</b> {e.d}
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Volumes · carrossel */}
        <VolumesCarousel />

        {/* Bônus */}
        <Reveal
          style={{
            marginTop: 48,
            background: "radial-gradient(ellipse 120% 100% at 50% 0%, #3B2B52, #241B33)",
            borderRadius: 24,
            padding: "30px 24px",
            textAlign: "center",
            color: "#EFE7D6",
          }}
        >
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 16, color: "#E4C878" }}>
            🎁 Bônus para fortalecer sua Rotina de Paz
          </div>
          <img
            src={bonusLouvoresImg}
            alt="Bônus: 148 Louvores em Salmos + e-books"
            style={{ width: "100%", maxWidth: 380, borderRadius: 16, marginTop: 16 }}
            loading="lazy"
          />
          <div style={{ fontSize: 14, lineHeight: 1.65, color: "#C9BCDB", marginTop: 14 }}>
            <b style={{ color: "#F5EEE2" }}>148 Louvores em Salmos</b> + e-books <b style={{ color: "#F5EEE2" }}>Dormir Melhor Hoje</b> e{" "}
            <b style={{ color: "#F5EEE2" }}>Devocional 30 Dias com Jesus</b> — de presente, dentro do app.
          </div>
        </Reveal>

        {/* Oferta · card premium */}
        <Reveal style={{ marginTop: 52, textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#B08A38", fontWeight: 700 }}>COMECE HOJE</div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontWeight: 500,
              fontSize: "clamp(34px,9vw,46px)",
              color: "#3B2B52",
              margin: "10px 0 0",
              lineHeight: 1,
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

          {/* barra de escassez */}
          <ScarcityBar />

          {/* card oferta escuro */}
          <Reveal
            style={{
              marginTop: 16,
              background: "radial-gradient(ellipse 120% 80% at 50% 0%, #3B2B52, #211830)",
              border: "1px solid rgba(228,200,120,.3)",
              borderRadius: 26,
              padding: "30px 22px",
              boxShadow: "0 26px 70px rgba(33,24,48,.4)",
              color: "#EFE7D6",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid rgba(228,200,120,.5)",
                borderRadius: 99,
                padding: "9px 18px",
                fontSize: 11,
                letterSpacing: 1,
                color: "#E4C878",
                fontWeight: 600,
              }}
            >
              🛡️ Garantia de {NEUROFE_OFFER.guaranteeDays} dias · o risco é meu
            </div>

            {/* value stack */}
            <div style={{ marginTop: 26, textAlign: "left" }}>
              {NEUROFE_OFFER.valueStack.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 0",
                    borderBottom: "1px solid rgba(255,255,255,.09)",
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
                  fontSize: "clamp(72px,20vw,96px)",
                  lineHeight: 1,
                  color: "#F5EEE2",
                  marginTop: 2,
                  textShadow: "0 4px 30px rgba(232,155,208,.35)",
                }}
              >
                R${priceReais}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 16, color: "#E4C878", marginTop: 6 }}>
                menos de R$7 por dia na sua primeira semana
              </div>
              <div style={{ fontSize: 14, color: "#E4D9F0", marginTop: 10 }}>
                ou{" "}
                <b
                  style={{
                    fontFamily: "'Cormorant Garamond',serif",
                    fontStyle: "italic",
                    fontSize: 27,
                    color: "#E4C878",
                    textShadow: "0 2px 16px rgba(228,200,120,.45)",
                  }}
                >
                  {NEUROFE_OFFER.installments}× de {formatBRL(NEUROFE_OFFER.installmentCents)}
                </b>
              </div>
              <div style={{ fontSize: 12, color: "#A796BD", marginTop: 6 }}>
                pagamento único · sem mensalidade · acesso imediato
              </div>
            </div>

            {/* tudo isto é seu */}
            <div
              style={{
                marginTop: 26,
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 18,
                padding: "20px 18px",
                textAlign: "left",
              }}
            >
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

            {/* CTA — SAGRADO #2: chama onCheckout */}
            <button
              type="button"
              onClick={onCheckout}
              aria-label={ctaLabel}
              style={{
                display: "block",
                width: "100%",
                marginTop: 26,
                background: "linear-gradient(135deg,#F0AED6,#D482B5)",
                color: "#3B2B52",
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: ".5px",
                border: "none",
                cursor: "pointer",
                padding: "20px 22px",
                borderRadius: 50,
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

        {/* Desejo · reforço personalizado */}
        {quote && (
          <div style={{ textAlign: "center", marginTop: 44 }}>
            <Reveal style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 20, lineHeight: 1.5, color: "#6B6076" }}>
              Você lembra do seu desejo: <span style={{ color: "#8A5FB0" }}>"{quote}"</span>
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
            marginTop: 28,
            background: "linear-gradient(180deg,#F4ECDC,#F0E5D0)",
            borderRadius: 20,
            padding: "26px 24px",
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: "none", width: 64, height: 64 }}>
            <svg viewBox="0 0 64 64" style={{ width: 64, height: 64 }}>
              <defs>
                <linearGradient id="selo-ouro" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#E9CE8C" />
                  <stop offset=".5" stopColor="#C9A24B" />
                  <stop offset="1" stopColor="#9A7830" />
                </linearGradient>
              </defs>
              <path d="M32 30 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0" fill="none" stroke="url(#selo-ouro)" strokeWidth="2.5" strokeDasharray="3.5 3" />
              <circle cx="32" cy="30" r="17" fill="url(#selo-ouro)" />
              <circle cx="32" cy="30" r="17" fill="none" stroke="#FFF6DF" strokeWidth="1" opacity=".7" />
              <path d="M25 30.5 L30 35.5 L40 24.5" fill="none" stroke="#3B2B52" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M24 45 L28 41 L32 44 L36 41 L40 45 L40 58 L32 52 L24 58 Z" fill="url(#selo-ouro)" opacity=".9" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: "#4A4152" }}>
              Garantia incondicional de {NEUROFE_OFFER.guaranteeDays} dias
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: "#5D5368", marginTop: 8 }}>
              Faça a jornada completa. Se não sentir mudança, devolvo cada centavo. Sem formulário, sem pergunta, sem julgamento. Você só me escreve.
            </div>
          </div>
        </Reveal>

        {/* Avatar / app + CTA */}
        <Reveal style={{ textAlign: "center", marginTop: 44 }}>
          <img
            src={jaquelineAppImg}
            alt="App Rotina de Paz"
            style={{ width: "100%", maxWidth: 360, borderRadius: 20, boxShadow: "0 20px 50px rgba(59,43,82,.22)" }}
            loading="lazy"
          />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 16, color: "#6B6076", marginTop: 12 }}>
            Tudo isso te esperando dentro do app <b style={{ fontStyle: "normal", color: "#8A5FB0" }}>Rotina de Paz</b>.
          </div>
          <button
            type="button"
            onClick={onCheckout}
            aria-label={ctaLabel}
            style={{
              display: "inline-block",
              marginTop: 26,
              background: "linear-gradient(90deg,#3B2B52,#5E3E85,#3B2B52)",
              backgroundSize: "200% auto",
              animation: "sa-shine 3.5s linear infinite, sa-ctaGlow 2.8s ease-in-out infinite, sa-btnPulse 2.4s ease-in-out infinite",
              color: "#F5EEE2",
              fontWeight: 700,
              fontSize: 14.5,
              letterSpacing: 1.5,
              border: "none",
              cursor: "pointer",
              padding: "20px 40px",
              borderRadius: 50,
            }}
          >
            {ctaLabel} →
          </button>
          <div style={{ fontSize: 12, color: "#8A7C93", marginTop: 12 }}>
            🔒 Acesso imediato · Garantia de {NEUROFE_OFFER.guaranteeDays} dias
          </div>
        </Reveal>

        {/* Rodapé */}
        <div style={{ textAlign: "center", marginTop: 56 }}>
          <img src={logoImg} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", opacity: 0.9 }} />
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, letterSpacing: 5, color: "#8A6A2A", marginTop: 10 }}>
            ROTINA DE PAZ
          </div>
          <div style={{ fontSize: 9, letterSpacing: 4, color: "#B9AA8F", marginTop: 4 }}>HAJA LUZ</div>
        </div>
      </div>

      {/* CTA fixo mobile — z-index 40 (evita colidir com overlays do resultado) */}
      <div
        style={{
          position: "fixed",
          insetInline: 0,
          bottom: 0,
          zIndex: 40,
          borderTop: "1px solid rgba(212,175,55,.28)",
          background: "rgba(246,240,228,.96)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
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
            onClick={onCheckout}
            aria-label={ctaLabel}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg,#F0AED6,#D482B5)",
              color: "#3B2B52",
              fontWeight: 700,
              fontSize: 12.5,
              border: "none",
              cursor: "pointer",
              padding: "13px 20px",
              borderRadius: 50,
            }}
          >
            Quero minha vaga <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
