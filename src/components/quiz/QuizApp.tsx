import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { GuideAvatar } from "./Avatar";
import { SpeechBubble } from "./SpeechBubble";
import { EmotionalProgress } from "./EmotionalProgress";
import {
  ARCHETYPES,
  CONFIRMATIONS,
  DESIRE_BEAT,
  DESIRE_BEAT_FALLBACK,
  DESIRE_CTA,
  DESIRE_QUOTE,
  ENCOURAGEMENTS,
  QUESTIONS,
  computeArchetype,
  getTransition,
  type Archetype,
  type ArchetypeData,
} from "@/data/quiz";
import { Component, type ErrorInfo } from "react";
import { playDing } from "@/lib/sound";
import { buildKirvanoUrl, captureUtms } from "@/lib/utm";
import { getSupabase } from "@/lib/supabase";
import { captureMetaClickData, getOrCreateExternalId, saveTrackingSession, trackInitiateCheckout } from "@/lib/tracking";
import { fetchProductPrices, fetchInstallmentFreeCount, formatBRL } from "@/lib/prices";
import logoSrc from "@/assets/rotina-de-paz-logo.webp";
import { Check, Sparkles, Volume2, VolumeX } from "lucide-react";
import narracaoAudio from "@/assets/audio/narracao.mp3";
import { NARRATION } from "@/data/narration";
import jaquelineAvatar from "@/assets/jaqueline-avatar.webp";
import rotinaMockup from "@/assets/rotina-de-paz-mockup.webp";
import bonusImg from "@/assets/bonus-rotina.webp";

const KIRVANO_URL =
  (import.meta.env.VITE_KIRVANO_URL as string | undefined) ||
  "https://pay.kirvano.com/sua-oferta";

// Feature flag: VITE_USE_CHECKOUT_SACRA=true → redireciona pro /checkout Sacra
// Rollback: remover a var ou setar false → volta pro Kirvano em 1 redeploy
const USE_CHECKOUT_SACRA = import.meta.env.VITE_USE_CHECKOUT_SACRA === "true";
const CHECKOUT_SACRA_URL =
  (import.meta.env.VITE_CHECKOUT_SACRA_URL as string | undefined) ||
  "https://rotinadepaz.com.br/checkout";

type Stage = "hero" | "questions" | "loading" | "contact" | "result" | "offer";

// Detecta se alguma resposta marcou risco (P2: "pensamentos sombrios" / "estou em crise").
function answersHaveRisk(ans: Record<string, string>): boolean {
  return QUESTIONS.some((q) =>
    q.options.some((o) => o.value === ans[q.key] && o.risk),
  );
}

// Preview por URL (dev): ?preview=<arquetipo>&stage=offer pula direto pro estágio.
function parsePreview(): {
  archetype: Archetype;
  stage: Stage;
  desire?: string;
  situation?: string;
} | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const a = p.get("preview");
  if (!a || !(a in ARCHETYPES)) return null;
  const s = (p.get("stage") as Stage) || "offer";
  return {
    archetype: a as Archetype,
    stage: s,
    desire: p.get("desire") ?? undefined,
    situation: p.get("situation") ?? undefined,
  };
}

// Persistência de sessão: refresh em result/offer não joga a lead pro início.
const SAVED_KEY = "sacra_quiz_state_v2";
type SavedState = {
  stage: "contact" | "result" | "offer";
  answers: Record<string, string>;
  name: string;
  whatsapp: string;
  email: string;
};
function loadSavedState(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (
      (s?.stage === "contact" || s?.stage === "result" || s?.stage === "offer") &&
      s?.answers &&
      typeof s.answers === "object"
    ) {
      return {
        stage: s.stage,
        answers: s.answers,
        name: typeof s.name === "string" ? s.name : "",
        whatsapp: typeof s.whatsapp === "string" ? s.whatsapp : "",
        email: typeof s.email === "string" ? s.email : "",
      };
    }
    return null;
  } catch {
    return null; // JSON corrompido → ignora, segue fluxo normal
  }
}

export function QuizApp() {
  const navigate = useNavigate();
  const preview = parsePreview();
  // Estado salvo da sessão (preview de dev tem prioridade). Lido uma vez.
  const savedRef = useRef<SavedState | null | undefined>(undefined);
  if (savedRef.current === undefined) {
    savedRef.current = preview ? null : loadSavedState();
  }
  const saved = savedRef.current;

  const [stage, setStage] = useState<Stage>(
    preview ? preview.stage : saved ? saved.stage : "hero",
  );
  const [name, setName] = useState(saved?.name ?? "");
  const [qIndex, setQIndex] = useState(0);
  const qIndexRef = useRef(qIndex);
  qIndexRef.current = qIndex;
  const answeringRef = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>(saved?.answers ?? {});
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState(saved?.whatsapp ?? "");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [sending, setSending] = useState(false);
  const [mainPriceCents, setMainPriceCents] = useState(4700);
  const [mainAnchorCents, setMainAnchorCents] = useState(19700);
  const [freeInstCount, setFreeInstCount] = useState(3);
  const startTsRef = useRef<number>(Date.now());
  // Promise da criação do lead — submitContact faz await antes de salvar email
  const leadPromiseRef = useRef<Promise<string | null>>(Promise.resolve(null));

  // Offer key from URL: ?oferta=baixa27 → selects price variant
  const offerKey = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("oferta") || "";
  }, []);

  // Fetch preço do produto principal do DB (fonte única, via offer_key)
  useEffect(() => {
    fetchProductPrices(offerKey || undefined).then((prices) => {
      const rp = prices["rotina-de-paz"];
      if (rp) {
        setMainPriceCents(rp.priceCents);
        if (rp.anchorPriceCents) setMainAnchorCents(rp.anchorPriceCents);
      }
    });
    fetchInstallmentFreeCount().then(setFreeInstCount);
  }, [offerKey]);

  // Fire-and-forget funnel beacon — NEVER blocks the quiz flow
  // sb.rpc() returns PostgrestFilterBuilder (thenable, no .catch) — wrap in Promise.resolve
  const trackStep = (stage: string, questionKey?: string) => {
    try {
      const sb = getSupabase();
      if (!sb) return;
      void Promise.resolve(sb.rpc("track_quiz_step", {
        p_session_id: getOrCreateExternalId(),
        p_stage: stage,
        p_question_key: questionKey ?? null,
      })).catch(() => {});
    } catch { /* never block quiz */ }
  };

  useEffect(() => {
    captureUtms();
    captureMetaClickData();
  }, []);

  // Funnel: arrival beacon (once, on hero mount)
  useEffect(() => {
    if (stage === "hero" && !preview) trackStep("arrival");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ao trocar de tela, volta pro topo (senão a oferta abre na altura em que estava o resultado).
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [stage]);

  // Persiste só em contact/result/offer (nunca durante o quiz). Atualiza ao navegar entre elas.
  useEffect(() => {
    if (preview) return; // preview de dev não persiste
    if (stage !== "contact" && stage !== "result" && stage !== "offer") return;
    try {
      sessionStorage.setItem(SAVED_KEY, JSON.stringify({ stage, answers, name, whatsapp, email }));
    } catch {
      // armazenamento indisponível → ignora, não quebra
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, answers, name, whatsapp, email]);

  const result = useMemo(() => {
    if (stage !== "contact" && stage !== "result" && stage !== "offer") return null;
    return computeArchetype(answers);
  }, [stage, answers]);

  const archetype: Archetype | null = preview?.archetype ?? result?.archetype ?? null;
  const arche = archetype ? ARCHETYPES[archetype] : null;
  const situation = answers["situacao"] ?? preview?.situation;
  const desire = answers["desejo"] ?? preview?.desire;
  const bridge = arche && situation ? arche.bridges[situation] ?? null : null;

  const startQuiz = () => {
    startTsRef.current = Date.now();
    setStage("questions");
  };

  const answer = async (value: string) => {
    // Guard: bloqueia cliques durante transição (previne stale closure / double-click)
    if (answeringRef.current) return;
    answeringRef.current = true;

    const idx = qIndexRef.current; // ref = sempre valor atual, sem stale closure

    const q = QUESTIONS[idx];
    if (!q) { answeringRef.current = false; return; }
    const opt = q.options.find((o) => o.value === value);
    if (!opt) { answeringRef.current = false; return; }

    try { playDing(); } catch {}
    const next = { ...answers, [q.key]: value };
    setAnswers(next);
    setConfirmation(CONFIRMATIONS[Math.floor(Math.random() * CONFIRMATIONS.length)]);
    window.setTimeout(() => setConfirmation(null), 900);

    const isLast = idx === QUESTIONS.length - 1;

    if (isLast) {
      window.setTimeout(() => {

        setStage("loading");
      }, 450);
      return; // answeringRef stays true — quiz over
    }

    // encorajamento a cada 3 perguntas
    if ((idx + 1) % 3 === 0) {
      const msg = ENCOURAGEMENTS[Math.min(Math.floor((idx + 1) / 3) - 1, ENCOURAGEMENTS.length - 1)];
      setEncouragement(msg);
      window.setTimeout(() => {
        setEncouragement(null);
        setQIndex((i) => i + 1);
        answeringRef.current = false; // libera próxima resposta
      }, 2500);
    } else {
      window.setTimeout(() => {
        setQIndex((i) => i + 1);
        answeringRef.current = false; // libera próxima resposta
      }, 500);
    }
  };

  // Análise de abandono: marca cada pergunta EXIBIDA. No Meta, o funil de eventos
  // QuizStep mostra exatamente em qual pergunta o usuário desiste (a contagem cai).
  // Fire-and-forget via fbq trackCustom — sem sendBeacon, nunca quebra o fluxo.
  useEffect(() => {
    if (stage !== "questions") return;
    const q = QUESTIONS[qIndex];
    if (!q) return;
    try {
      (window as { fbq?: (...a: unknown[]) => void }).fbq?.("trackCustom", "QuizStep", {
        step: qIndex + 1,
        total: QUESTIONS.length,
        question: q.key,
      });
    } catch {
      /* analytics nunca bloqueia o quiz */
    }
    trackStep("question", q.key);
  }, [stage, qIndex]);

  // Loading -> Result com mensagens em sequência
  const [loadingMsg, setLoadingMsg] = useState(0);
  useEffect(() => {
    if (stage !== "loading") return;
    setLoadingMsg(0);
    const messages = 6;
    const step = 1200;
    const timers: number[] = [];
    for (let i = 1; i < messages; i++) {
      timers.push(window.setTimeout(() => setLoadingMsg(i), step * i));
    }
    timers.push(window.setTimeout(() => {

      setStage("contact");
    }, step * messages));
    // Persiste lead no Supabase (best effort). Lead event disparado na captura de contato.
    // A promise é guardada em leadPromiseRef para o submitContact fazer await.
    leadPromiseRef.current = persistLead(answers).catch(() => null);
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Funnel: result/offer/contact stage beacons
  useEffect(() => {
    if (preview) return;
    if (stage === "contact") trackStep("contact_gate");
    if (stage === "result") trackStep("result");
    if (stage === "offer") trackStep("offer");
  }, [stage]);

  async function persistLead(ans: Record<string, string>): Promise<string | null> {
    const sb = getSupabase();
    if (!sb) return null;
    const { scores, archetype } = computeArchetype(ans);
    const utms = captureUtms();
    const { data: leadId, error } = await sb.rpc("persist_lead", {
      p_name: name || null,
      p_archetype: archetype,
      p_scores: scores,
      p_desire: ans["desejo"] ?? null,
      p_situation: ans["situacao"] ?? null,
      p_risk_flag: answersHaveRisk(ans),
      ...Object.fromEntries(
        Object.entries(utms).map(([k, v]) => ["p_" + k, v]),
      ),
    });
    if (error || !leadId) {
      if (error) console.error("[persist_lead] falhou:", error.message, error.code);
      return null;
    }
    // Persiste arquétipo localmente para o App da Aluna (Parte 2)
    try {
      localStorage.setItem(
        "sacra_student",
        JSON.stringify({
          archetype,
          name: name || null,
          desire: ans["desejo"] ?? null,
          situation: ans["situacao"] ?? null,
          lead_id: leadId,
          created_at: new Date().toISOString(),
        }),
      );
    } catch {}
    // #1: persist_quiz_responses com error handling (não bloqueia navegação)
    try {
      const totalTime = Date.now() - startTsRef.current;
      const rows = QUESTIONS.map((q) => ({
        lead_id: leadId,
        question_key: q.key,
        answer_value: ans[q.key] ?? "",
        answer_text: q.options.find((o) => o.value === ans[q.key])?.label ?? "",
        time_to_answer: Math.round(totalTime / QUESTIONS.length),
      }));
      const { error: rpcErr } = await sb.rpc("persist_quiz_responses", { p_rows: rows });
      if (rpcErr) console.error("[persist_quiz_responses] falhou:", rpcErr.message, rpcErr.code);
    } catch (e) {
      console.error("[persist_quiz_responses] erro:", e);
    }
    return leadId;
  }

  function goToOffer() {
    setStage("offer");
  }

  async function submitContact() {
    const hasEmail = !!(email && email.includes("@"));
    const digits = whatsapp.replace(/\D/g, "");
    const hasWhatsapp = digits.length >= 10;
    const hasContact = hasEmail || hasWhatsapp;

    // Sem contato -> vai direto pro resultado, sem Lead, sem erro
    if (!hasContact) {
      setStage("result");
      return;
    }

    setSending(true);
    try {
      // #2: Aguarda a promise do persistLead (garante lead_id antes de salvar email)
      const leadId = await leadPromiseRef.current;

      const sb = getSupabase();
      if (sb && leadId) {
        // Salva contato no lead (caminho unico, sempre passa email+whatsapp)
        try {
          const { error } = await sb.rpc("save_lead_contact", {
            p_lead_id: leadId,
            p_email: hasEmail ? email : null,
            p_whatsapp: hasWhatsapp ? `55${digits}` : null,
            p_consent_timestamp: new Date().toISOString(),
          });
          if (error) console.error("[save_lead_contact] falhou:", error.message);
        } catch (e) {
          console.error("[save_lead_contact] erro:", e);
        }

        // Envia resultado por email via edge function (Resend)
        if (hasEmail && arche) {
          try {
            const { error: fnErr } = await sb.functions.invoke("send-quiz-result", {
              body: {
                email,
                name: name || null,
                desire: desire || null,
                archetypeName: arche.name,
                tagline: arche.result.tagline,
                bridge,
                happening: arche.result.happening,
                mirror: arche.result.mirror,
                truthTitle: arche.result.truthTitle,
                truthTitleEm: arche.result.truthTitleEm,
                truthBody: arche.result.truthBody,
                verseRef: arche.result.verseRef,
                verseText: arche.result.verseText,
                seal: arche.result.seal,
                chapters: arche.chapters,
                ctaLabel: (desire && DESIRE_CTA[desire]) || "Eu creio -- quero minha paz",
                quote: (desire && DESIRE_QUOTE[desire]) || null,
              },
            });
            if (fnErr) console.error("[send-quiz-result] edge function erro:", fnErr);
          } catch (err) {
            console.error("[send-quiz-result] falhou:", err);
          }
        }
      } else if (!leadId) {
        // Lead nao resolveu a tempo — loga mas nao bloqueia
        console.error("[submitContact] lead_id indisponivel, contato nao salvo");
      }

      // Advanced Matching + Lead event (so se tem contato)
      try {
        const fbq = (window as any).fbq;
        if (fbq) {
          const eid = getOrCreateExternalId();
          const ph = hasWhatsapp ? `55${digits}` : undefined;
          const PIXEL = "838169472100225";
          fbq("init", PIXEL, {
            ...(hasEmail ? { em: email.toLowerCase().trim() } : {}),
            ...(ph ? { ph } : {}),
            external_id: eid,
          });
          fbq("trackSingle", PIXEL, "Lead", {
            content_name: "Rotina de Paz",
            value: 0,
            currency: "BRL",
          }, { eventID: `lead_${eid}` });
        }
      } catch {}
    } finally {
      setSending(false);
    }

    setStage("result");
  }

  async function checkout() {
    if (!archetype) return;
    const externalId = getOrCreateExternalId();
    // Fire-and-forget: salva tracking session (fbp/fbc/ua) para cruzar no webhook
    void saveTrackingSession(externalId).catch(() => {});
    trackStep("cta");
    // InitiateCheckout com tick de espera para o beacon sair antes do redirect
    await trackInitiateCheckout(externalId, { contentName: "Rotina de Paz", value: mainPriceCents / 100 });
    const whatsappNorm = whatsapp ? `55${whatsapp.replace(/\D/g, "")}` : undefined;

    if (USE_CHECKOUT_SACRA) {
      // Checkout Sacra: mesmos params que a Kirvano recebe + session linkage
      const sacraUrl = new URL(CHECKOUT_SACRA_URL);
      const utms = captureUtms();
      for (const [k, v] of Object.entries(utms)) { if (v) sacraUrl.searchParams.set(k, v); }
      if (archetype) sacraUrl.searchParams.set("arquetipo", archetype);
      if (name) sacraUrl.searchParams.set("nome", name);
      if (email) sacraUrl.searchParams.set("email", email);
      if (whatsappNorm) sacraUrl.searchParams.set("whatsapp", whatsappNorm);
      sacraUrl.searchParams.set("src", externalId);
      if (offerKey) sacraUrl.searchParams.set("oferta", offerKey);
      window.location.href = sacraUrl.toString();
    } else {
      // Kirvano (fallback / default)
      const url = buildKirvanoUrl(KIRVANO_URL, { archetype, name, email, whatsapp: whatsappNorm, externalId });
      window.location.href = url;
    }
  }

  // ---------- RENDER ----------

  return (
    <QuizErrorBoundary>
    <main className="relative min-h-dvh overflow-hidden bg-[color:var(--milk)]">
      <AmbientParticles active={stage === "loading"} />

      <AnimatePresence mode="wait">
        {stage === "hero" && (
          <HeroScreen
            key="hero"
            name={name}
            setName={setName}
            onStart={startQuiz}
          />
        )}

        {stage === "questions" && (
          <QuestionScreen
            key="q"
            qIndex={qIndex}
            total={QUESTIONS.length}
            answer={answer}
            confirmation={confirmation}
            encouragement={encouragement}
            answers={answers}
          />
        )}

        {stage === "loading" && (
          <LoadingScreen key="loading" step={loadingMsg} />
        )}

        {stage === "contact" && (
          <ContactGateScreen
            key="contact"
            name={name}
            email={email}
            setEmail={setEmail}
            whatsapp={whatsapp}
            setWhatsapp={setWhatsapp}
            onSubmit={submitContact}
            onSkip={() => setStage("result")}
            sending={sending}
          />
        )}

        {stage === "result" && arche && (
          <ResultScreen
            key="result"
            archetype={arche}
            bridge={bridge}
            name={name}
            desire={desire}
            onContinue={goToOffer}
          />
        )}

        {stage === "offer" && arche && (
          <OfferScreen
            key="offer"
            archetype={arche}
            desire={desire}
            priceCents={mainPriceCents}
            anchorCents={mainAnchorCents}
            freeInstCount={freeInstCount}
            onCheckout={checkout}
            onBack={() => setStage("result")}
          />
        )}
      </AnimatePresence>
    </main>
    </QuizErrorBoundary>
  );
}

/* ============================== HERO ============================== */

function HeroScreen({
  name,
  setName,
  onStart,
}: {
  name: string;
  setName: (s: string) => void;
  onStart: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-5 py-8 text-center sm:px-6 sm:py-16"
    >
      {/* Avatar + bubble (padrão atual) */}
      <div className="flex w-full items-start justify-center gap-4">
        <GuideAvatar size="corner" />
        <SpeechBubble
          text="Olá. Eu sou sua guia nessa jornada."
          typingDelay={400}
        />
      </div>

      {/* Eyebrow com traços */}
      <div className="mt-8 flex items-center gap-4 text-[color:var(--amethyst)] sm:mt-14">
        <span className="h-px w-10 bg-[color:var(--gold)]/60" />
        <p className="text-xs font-medium uppercase tracking-[0.28em]">
          Quiz personalizado · 7 perguntas
        </p>
        <span className="h-px w-10 bg-[color:var(--gold)]/60" />
      </div>

      {/* Título grande com gradiente */}
      <h1 className="rdp-title-gradient mt-5 font-display text-4xl leading-[1.05] tracking-tight sm:mt-8 sm:text-[64px]">
        Sua ansiedade tem um <em className="italic">tipo</em>.
      </h1>

      {/* Subtítulo serif itálico */}
      <p className="mt-4 font-display text-xl italic leading-snug text-[color:var(--amethyst)] sm:mt-7 sm:text-[28px]">
        Descubra qual é o seu —
        <br />
        e o caminho que foi feito para ele.
      </p>

      {/* Body */}
      <p className="mt-6 max-w-xl text-sm leading-relaxed text-[color:var(--deep-purple)] sm:mt-10 sm:text-lg">
        Existem 4 padrões diferentes de ansiedade entre mulheres cristãs.
        Descubra o seu — e por que a oração que funciona pra outras pessoas
        pode estar tendo efeito curto na sua.
      </p>

      {/* Form: name + CTA escuro */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length >= 2) onStart();
        }}
        className="mt-6 flex w-full max-w-sm flex-col items-center gap-3 sm:mt-12 sm:gap-4"
      >
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Como posso te chamar?"
          className="w-full rounded-full border border-[color:var(--border)] bg-white/70 px-6 py-3.5 text-center text-base text-[color:var(--deep-purple)] placeholder:text-[color:var(--amethyst)]/60 focus:border-[color:var(--lavender)] focus:outline-none focus:ring-4 focus:ring-[color:var(--lavender)]/20"
          autoComplete="given-name"
          required
          minLength={2}
          maxLength={40}
        />
        <button
          type="submit"
          disabled={name.trim().length < 2}
          className="rdp-btn-gradient-hover group inline-flex items-center justify-center gap-3 rounded-full px-10 py-4 text-sm font-medium uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_-18px_rgba(68,58,82,0.6)] hover:-translate-y-[1px] disabled:hover:translate-y-0"
        >
          Estou pronta
          <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </button>
      </form>

      {/* Footer italic */}
      <p className="mt-5 max-w-md font-display text-sm italic leading-relaxed text-[color:var(--amethyst)]/85 sm:mt-10 sm:text-base">
        Sem julgamento. Sem diagnóstico. Sem rótulo.
        <br />
        Só uma forma honesta de você escutar a si mesma.
      </p>
    </motion.section>
  );
}

/* ============================== QUESTIONS ============================== */

function QuestionScreen({
  qIndex,
  total,
  answer,
  confirmation,
  encouragement,
  answers,
}: {
  qIndex: number;
  total: number;
  answer: (v: string) => void | Promise<void>;
  confirmation: string | null;
  encouragement: string | null;
  answers: Record<string, string>;
}) {
  const q = QUESTIONS[qIndex];
  const transition = getTransition(qIndex, answers);
  const [showOptions, setShowOptions] = useState(false);
  const [showPrompt, setShowPrompt] = useState(!transition);

  useEffect(() => {
    if (!q) return;
    setShowOptions(false);
    setShowPrompt(!transition);
    // A transição sobe pronta (instant); só esperamos um tempo de leitura
    // antes da pergunta começar a digitar.
    const promptDelay = transition ? 650 : 0;
    const t1 = transition
      ? window.setTimeout(() => setShowPrompt(true), promptDelay)
      : null;
    const optDelay =
      promptDelay + (transition ? 100 : 0) + q.prompt.length * 30 + 250;
    const t2 = window.setTimeout(() => setShowOptions(true), optDelay);
    return () => {
      if (t1) clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [qIndex, q?.prompt, transition]);

  if (!q) return null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pb-6 pt-4 sm:px-8 sm:pb-10 sm:pt-6"
    >
      <EmotionalProgress current={qIndex + 1} total={total} />

      <div className="mt-5 flex items-start gap-3 sm:mt-8 sm:gap-5">
        <GuideAvatar size="corner" />
        <div className="flex-1 space-y-2 pt-1 sm:space-y-3">
          {transition && (
            <SpeechBubble
              text={transition}
              resetKey={`t-${qIndex}`}
              italic
              instant
            />
          )}
          {showPrompt && (
            <SpeechBubble
              text={q.prompt}
              resetKey={`p-${qIndex}`}
              typingDelay={transition ? 100 : 0}
            />
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:mt-8 sm:gap-3">
        <AnimatePresence>
          {showOptions &&
            q.options.map((opt, i) => (
              <motion.button
                key={opt.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.18, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                onClick={() => answer(opt.value)}
                className="group relative overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white px-5 py-4 text-left text-base text-[color:var(--deep-purple)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--lavender)] hover:rdp-shadow-soft sm:text-lg"
              >
                <span className="relative z-10">{opt.label}</span>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                />
              </motion.button>
            ))}
        </AnimatePresence>
      </div>

      {/* Confirmação efêmera */}
      <AnimatePresence>
        {confirmation && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 self-center rounded-full bg-[color:var(--milk-warm)] px-4 py-1.5 text-sm text-[color:var(--amethyst)]"
          >
            {confirmation}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Encorajamento bloqueador */}
      <AnimatePresence>
        {encouragement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-[color:var(--milk)]/90 backdrop-blur-sm"
          >
            <div className="flex max-w-md items-start gap-4 px-6 text-left">
              <GuideAvatar size="corner" />
              <SpeechBubble
                text={encouragement}
                italic
                resetKey={encouragement}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

/* ============================== LOADING ============================== */

function LoadingScreen({ step }: { step: number }) {
  const particles = Array.from({ length: 28 });
  const messages = [
    "Lendo suas respostas com calma...",
    "Cruzando os 4 padrões raízes...",
    "Mapeando o que seu corpo está pedindo...",
    "Encontrando o caminho desenhado pra você...",
    "Preparando sua leitura completa...",
    "Pronto.",
  ];
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="rdp-night fixed inset-0 z-50 grid place-items-center"
    >
      <div className="rdp-particles" aria-hidden>
        {particles.map((_, i) => {
          const left = Math.random() * 100;
          const size = 2 + Math.random() * 4;
          const dur = 6 + Math.random() * 7;
          const delay = -Math.random() * 8;
          const drift = (Math.random() - 0.5) * 80;
          const opacity = 0.5 + Math.random() * 0.5;
          return (
            <span
              key={i}
              className="rdp-particle-splash"
              style={{
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                animationDuration: `${dur}s`,
                animationDelay: `${delay}s`,
                ["--rdp-drift" as string]: `${drift}px`,
                opacity,
              }}
            />
          );
        })}
      </div>
      <div className="relative flex flex-col items-center gap-4 rdp-logo-in">
        <img src={logoSrc} alt="Rotina de Paz" width={180} height={180} className="h-44 w-44 rdp-breath" />
        <p className="font-display text-xl tracking-[0.32em] rdp-gold-text">ROTINA DE PAZ</p>
        <div className="mt-2 h-[2px] w-32 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rdp-shimmer" />
        </div>
        <p className="rdp-haja-luz mt-3 font-display text-[11px] uppercase tracking-[0.42em] text-[color:rgba(232,201,160,0.85)]">
          Haja Luz
        </p>
        <ul className="mt-6 space-y-1.5">
          {messages.map((m, i) => (
            <li
              key={m}
              className={`font-display text-sm italic transition-all duration-500 ${
                i <= step ? "text-[color:rgba(232,201,160,0.85)]" : "text-white/15"
              }`}
            >
              {m}
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}

function AmbientParticles({ active }: { active: boolean }) {
  if (!active) return null;
  return null;
}

/* ============================== CONTACT GATE ============================== */

// WhatsApp: UI removida (so armazenamento). Religar: SHOW_WHATSAPP = true
const SHOW_WHATSAPP = false;

function ContactGateScreen({
  name,
  email,
  setEmail,
  whatsapp,
  setWhatsapp,
  onSubmit,
  onSkip,
  sending,
}: {
  name: string;
  email: string;
  setEmail: (s: string) => void;
  whatsapp: string;
  setWhatsapp: (s: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  sending: boolean;
}) {
  const [hint, setHint] = useState(false);
  const whatsappRef = useRef<HTMLInputElement>(null);
  const whatsDigits = whatsapp.replace(/\D/g, "");
  const validWhatsapp = whatsDigits.length >= 10;

  const handleSubmit = () => {
    if (!validWhatsapp) {
      setHint(true);
      return;
    }
    setHint(false);
    onSubmit();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 py-10"
    >
      {/* Avatar + balao */}
      <div className="flex w-full items-start gap-3 sm:gap-5">
        <GuideAvatar size="corner" />
        <div className="flex-1 pt-1">
          <SpeechBubble
            text={`Seu resultado está pronto${name ? `, ${name}` : ""}.`}
            typingDelay={300}
          />
        </div>
      </div>

      {/* Card conversacional */}
      <motion.div
        className="mt-8 w-full rounded-2xl border border-[color:var(--border)] bg-white p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <p className="font-display text-xl leading-snug text-[color:var(--deep-purple)]">
          Quer receber sua leitura completa no WhatsApp?
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--amethyst)]">
          Te mando direto no seu número — pra reler quando a ansiedade apertar.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!sending) handleSubmit();
          }}
          className="mt-5"
        >
          <input
            id="gate-whatsapp"
            ref={whatsappRef}
            type="tel"
            inputMode="numeric"
            value={whatsapp}
            onChange={(e) => {
              const el = e.target;
              const cursor = el.selectionStart ?? el.value.length;
              const prevLen = whatsapp.length;
              const digits = el.value.replace(/\D/g, "").slice(0, 11);
              const fmt = digits.length > 6
                ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
                : digits.length > 2
                  ? `(${digits.slice(0, 2)}) ${digits.slice(2)}`
                  : digits;
              setWhatsapp(fmt);
              setHint(false);
              // Preserve cursor position after React re-render
              requestAnimationFrame(() => {
                if (whatsappRef.current) {
                  const newCursor = Math.max(0, cursor + (fmt.length - prevLen));
                  whatsappRef.current.setSelectionRange(newCursor, newCursor);
                }
              });
            }}
            placeholder="(00) 00000-0000"
            className={`w-full rounded-full border bg-[color:var(--milk-warm)] px-5 py-3.5 text-sm text-[color:var(--deep-purple)] placeholder:text-[color:var(--lavender)] focus:outline-none focus:ring-4 focus:ring-[color:var(--lavender)]/20 ${
              hint ? "border-red-300 focus:border-red-300" : "border-[color:var(--border)] focus:border-[color:var(--lavender)]"
            }`}
            maxLength={15}
            autoComplete="tel"
            autoFocus
          />
          {hint && (
            <p className="mt-1.5 text-xs text-red-400">
              Digite seu WhatsApp pra eu te enviar.
            </p>
          )}

          {/* CTA principal */}
          <button
            type="submit"
            disabled={sending}
            className="rdp-btn-gradient-hover mt-4 inline-flex w-full items-center justify-center gap-2.5 rounded-full px-10 py-4 text-sm font-medium uppercase tracking-[0.18em] text-white shadow-[0_18px_40px_-18px_rgba(68,58,82,0.6)] disabled:opacity-50"
          >
            {sending ? "Enviando…" : "Quero receber e ver"}{" "}
            <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </form>

        {/* Micro-CTA: pular */}
        <button
          type="button"
          onClick={onSkip}
          disabled={sending}
          className="mt-4 w-full text-center text-[13px] text-[color:var(--amethyst)] transition-colors hover:text-[color:var(--deep-purple)] disabled:opacity-50"
        >
          Só ver na tela
        </button>
      </motion.div>
    </motion.section>
  );
}

/* ============================== RESULT ============================== */

// Reveal-on-scroll reutilizável (respeita prefers-reduced-motion via framer-motion).
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

function ResultScreen({
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

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="mx-auto max-w-xl px-5 pb-16 pt-10 sm:px-8"
    >
      {/* 1. Saudação */}
      <div className="flex items-start gap-3 sm:gap-5">
        <GuideAvatar size="corner" />
        <div className="flex-1 pt-1">
          <SpeechBubble
            text={`Encontrei${name ? `, ${name}` : ""}. Você é a ${archetype.name}.`}
            typingDelay={400}
          />
        </div>
      </div>

      {/* 2. Arquétipo — entrada animada (archIn) */}
      <div className="mt-10 text-center">
        <p className="flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gold-warm)]"
           style={{ animation: "fadeIn .8s .2s ease both" }}>
          <span className="text-[color:var(--gold)]">✦</span>
          Padrão raiz identificado
          <span className="text-[color:var(--gold)]">✦</span>
        </p>
        <h1 className="rdp-arch-in mt-2 font-display font-bold leading-[0.95] text-[color:var(--deep-purple)]"
            style={{ fontSize: "clamp(1.6rem, 7vw, 4rem)" }}>
          {archetype.name}
        </h1>
        <p className="mt-2 font-display text-[21px] italic text-[color:var(--amethyst)]"
           style={{ animation: "fadeIn .8s .7s ease both" }}>
          {r.tagline}
        </p>
      </div>

      {/* 3. Scroll cue + seta pulsante */}
      <ScrollCue />

      {/* 4. Bridge (situation-specific) */}
      {bridge && (
        <Reveal className="mt-9">
          <p className="mx-auto max-w-md text-center font-display text-[23px] italic leading-[1.4] text-[color:var(--deep-purple)]">
            {bridge}
          </p>
        </Reveal>
      )}

      {/* 5. O que está acontecendo */}
      <Reveal className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-[27px] font-semibold text-[color:var(--deep-purple)]">
          <span className="text-[color:var(--gold-warm)]">›</span>O que está acontecendo
        </h2>
        <p
          className="mt-3 text-[18px] leading-relaxed text-[color:var(--amethyst)] [&_strong]:font-semibold [&_strong]:text-[color:var(--deep-purple)]"
          dangerouslySetInnerHTML={{ __html: r.happening }}
        />
        <blockquote className="mt-5 border-l-[3px] border-[color:var(--gold)] pl-5 font-display text-[21px] italic leading-[1.4] text-[color:var(--deep-purple)]">
          "{r.mirror}"
        </blockquote>
      </Reveal>

      {/* 6. Label "A verdade sobre isso" */}
      <Reveal className="mt-6">
        <p className="text-center font-display text-[18px] italic text-[color:var(--amethyst)]">
          A verdade sobre isso
        </p>
      </Reveal>

      {/* 7. Card 1 — Verdade (fundo texturizado dourado) */}
      <Reveal className="mt-4" pop>
        <section className="rdp-card-verdade rounded-[18px] px-7 py-8 text-center sm:px-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gold-warm)]">
            A verdade que você precisa ouvir
          </p>
          <h3 className="mt-3 font-display text-[30px] font-semibold leading-[1.15] text-[color:var(--deep-purple)]">
            {r.truthTitle}{" "}
            <em className="italic text-[color:var(--gold-warm)]">{r.truthTitleEm}</em>
          </h3>
          <p
            className="mt-4 text-[18px] leading-relaxed text-[color:var(--amethyst)] [&_strong]:font-semibold [&_strong]:text-[color:var(--deep-purple)]"
            dangerouslySetInnerHTML={{ __html: r.truthBody }}
          />
          {/* Versículo com entrada própria */}
          <motion.div
            className="mt-5"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.15, ease: "easeOut" }}
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--gold-warm)]">
              {r.verseRef}
            </p>
            <p className="mt-1.5 font-display text-[22px] italic text-[color:var(--deep-purple)]">
              "{r.verseText}"
            </p>
          </motion.div>
          <p className="mt-4 whitespace-pre-line font-display text-[19px] italic leading-relaxed text-[color:var(--amethyst)]">
            {r.seal}
          </p>
        </section>
      </Reveal>

      {/* 8. Card 2 — DESEJO / A virada (keyado pelo desire) */}
      <Reveal className="mt-7" pop>
        <section className="rdp-card-desire rounded-[18px] px-7 py-8 text-center sm:px-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--gold-warm)]">
            {beat.eyebrow}
          </p>
          <h2 className="mt-2 font-display text-[32px] font-semibold leading-[1.12] text-[color:var(--deep-purple)]">
            {beat.title}
          </h2>
          <p
            className="mt-4 text-[18px] leading-relaxed text-[color:var(--amethyst)] [&_strong]:font-semibold [&_strong]:text-[color:var(--deep-purple)]"
            dangerouslySetInnerHTML={{ __html: beat.body }}
          />
          <p
            className="mt-4 text-[18px] leading-relaxed text-[color:var(--amethyst)] [&_strong]:font-semibold [&_strong]:text-[color:var(--deep-purple)]"
            dangerouslySetInnerHTML={{ __html: beat.closing }}
          />
        </section>
      </Reveal>

      {/* 9. Capítulos em destaque + CTA pulsante */}
      <Reveal className="mt-8" pop>
        <section className="rdp-madefor rounded-[20px] px-6 pb-7 pt-8">
          <span className="rdp-madefor-badge">✦ feito pro seu padrão ✦</span>
          <p className="mt-2 text-center text-[15px] leading-relaxed text-[color:var(--amethyst)]">
            Dois capítulos do método foram desenhados{" "}
            <strong className="font-semibold text-[color:var(--deep-purple)]">especificamente pra você</strong>
            {" "}— na ordem que o seu corpo precisa:
          </p>
          <div className="mt-5 space-y-3">
            {archetype.chapters.map((c, i) => (
              <div
                key={`${c.num}-${c.period}-${i}`}
                className="flex gap-3 rounded-[14px] border border-[#ecdfc7] bg-white p-4 shadow-[0_10px_26px_-20px_rgba(184,146,78,.6)]"
              >
                <span className="shrink-0 font-display text-[28px] font-semibold text-[color:var(--gold-warm)]">
                  {c.num}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--gold-warm)]">
                    {c.period}
                  </p>
                  <p className="font-display text-[20px] font-semibold text-[color:var(--deep-purple)]">
                    {c.title}
                  </p>
                  <p className="mt-1 text-[15.5px] leading-relaxed text-[color:var(--amethyst)]">
                    {c.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA pulsante */}
          <div className="mt-6 text-center">
            <button
              onClick={onContinue}
              className="rdp-btn-gradient-hover inline-flex w-full items-center justify-center gap-2.5 rounded-full px-6 py-[21px] text-[15px] font-semibold uppercase tracking-[0.14em] text-white"
              style={{ animation: "rdp-cta-pulse 2.4s ease-in-out infinite" }}
            >
              <span>{beat.cta}</span>
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </button>
            <p className="mt-3 text-[12.5px] text-[color:var(--amethyst)]">
              Sem compromisso · garantia de 7 dias
            </p>
          </div>
        </section>
      </Reveal>

      {/* 10. Disclaimers (fim, discretos) */}
      <Reveal className="rdp-fineprint">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--gold-warm)]">
          Com honestidade, pra você decidir bem
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--amethyst)]">
          <strong className="font-semibold text-[color:var(--deep-purple)]">O que esperar:</strong>{" "}
          {archetype.esperar}
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--amethyst)]">
          <strong className="font-semibold text-[color:var(--deep-purple)]">O que não esperar:</strong>{" "}
          {archetype.naoEsperar}
        </p>
      </Reveal>
    </motion.section>
  );
}

/* ============================== OFFER ============================== */

// Legenda word-by-word (estilo caption): as palavras acendem no ritmo da voz,
// a frase passa suavemente, e os trechos fortes ganham cor e peso.
function NarrationCaption({ audioSrc }: { audioSrc?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);
  const startedRef = useRef(false);
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(false);

  const total = NARRATION[NARRATION.length - 1].end;

  const tryPlay = () => {
    const a = audioRef.current;
    if (!a || !audioSrc) return;
    a.muted = muted;
    a.play()
      .then(() => setBlocked(false))
      .catch(() => setBlocked(true));
  };

  const toggleMute = () => {
    const a = audioRef.current;
    setMuted((m) => {
      const n = !m;
      if (a) a.muted = n;
      return n;
    });
  };

  const begin = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    tryPlay();
  };

  // Loop suave de tempo (rAF) só enquanto a voz toca.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const loop = () => {
      setNow(a.currentTime);
      if (a.duration > 0) setProgress(a.currentTime / a.duration);
      rafRef.current = requestAnimationFrame(loop);
    };
    const onPlay = () => {
      setPlaying(true);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    const onStop = () => {
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onStop);
    a.addEventListener("ended", onStop);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onStop);
      a.removeEventListener("ended", onStop);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Toca quando a seção entra na viewport.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { begin(); io.disconnect(); } }),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoplay bloqueado: o primeiro toque libera o som.
  useEffect(() => {
    if (!blocked) return;
    const h = () => tryPlay();
    window.addEventListener("pointerdown", h, { once: true });
    return () => window.removeEventListener("pointerdown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  let idx = NARRATION.findIndex((c) => now >= c.start && now < c.end);
  if (idx < 0) idx = now >= total ? NARRATION.length - 1 : 0;
  const cue = NARRATION[idx];
  const verseShown = !!cue.ref && now >= cue.end - 0.4;

  return (
    <div ref={rootRef} className="mt-2">
      {/* Guia — foto à esquerda, nome + status à direita (ocupa menos altura) */}
      <div className="flex items-center gap-3">
        <GuideAvatar size="chat" src={jaquelineAvatar} alt="Jaqueline" />
        <div className="leading-tight">
          <p className="font-display text-lg text-[color:var(--deep-purple)]">Jaqueline</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            online agora
          </p>
        </div>
      </div>

      {/* Caixa de legenda — palavras acendem no ritmo da voz */}
      <div className="relative mx-auto mt-5 flex min-h-[150px] max-w-md items-center justify-center px-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full text-center font-sans text-[19px] leading-[1.7] tracking-[0.005em] sm:text-[21px]"
          >
            {cue.words.map((w, i) => {
              const shown = now >= w.t - 0.02;
              let cls = shown
                ? "text-[color:var(--deep-purple)]"
                : "text-[color:var(--deep-purple)]/20";
              if (w.em === "strong") {
                cls = shown
                  ? "font-semibold text-[color:var(--gold-warm)]"
                  : "font-semibold text-[color:var(--gold-warm)]/25";
              } else if (w.em === "verse") {
                cls = shown
                  ? "italic text-[color:var(--amethyst)]"
                  : "italic text-[color:var(--amethyst)]/25";
              }
              return (
                <span key={i} className={`transition-colors duration-300 ${cls}`}>
                  {w.text}
                  {i < cue.words.length - 1 ? " " : ""}
                </span>
              );
            })}
            {cue.ref && (
              <span
                className={`mt-2 block text-[11px] uppercase tracking-[0.2em] text-[color:var(--gold-warm)] transition-opacity duration-500 ${
                  verseShown ? "opacity-100" : "opacity-0"
                }`}
              >
                {cue.ref}
              </span>
            )}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Toque para começar — discreto e premium (autoplay bloqueado) */}
      {blocked && !playing && (
        <motion.button
          type="button"
          onClick={tryPlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mt-3 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.3em] text-[color:var(--gold-warm)]"
        >
          <span className="h-px w-5 bg-[color:var(--gold-warm)]/50" />
          toque para começar
          <span className="h-px w-5 bg-[color:var(--gold-warm)]/50" />
        </motion.button>
      )}

      {/* Progresso dourado + mute */}
      <div className="mx-auto mt-4 flex max-w-md items-center gap-3">
        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[color:var(--lavender)]/25">
          <div
            className="h-full rounded-full bg-[color:var(--gold-warm)]"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
        {audioSrc && (
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Ativar som" : "Silenciar"}
            className="shrink-0 transition-colors"
          >
            {muted ? (
              <VolumeX className="h-[22px] w-[22px] text-red-500" strokeWidth={2.25} />
            ) : (
              <Volume2 className="h-[22px] w-[22px] text-[color:var(--amethyst)] transition-colors hover:text-[color:var(--deep-purple)]" />
            )}
          </button>
        )}
      </div>

      <p className="mx-auto mt-2 max-w-md text-center text-[11px] uppercase tracking-[0.18em] text-[color:var(--amethyst)]">
        ouça e entenda porque funciona
      </p>

      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="auto" playsInline />}
    </div>
  );
}

function OfferScreen({
  archetype,
  desire,
  priceCents,
  anchorCents,
  freeInstCount,
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
  const ctaLabel = (desire && DESIRE_CTA[desire]) || "Eu creio — quero minha paz";
  const quote = (desire && DESIRE_QUOTE[desire]) || null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-2xl px-5 pb-12 pt-3 sm:px-8 sm:pt-4"
    >
      {/* Voltar discreto ao resultado (sem refazer o quiz) */}
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 mb-2 inline-flex items-center gap-1 text-[13px] text-[color:var(--amethyst)] transition-colors hover:text-[color:var(--deep-purple)]"
      >
        <span aria-hidden>←</span> Voltar
      </button>

      <NarrationCaption audioSrc={narracaoAudio} />

      {/* CARD ROTINA DE PAZ — sempre visível (flutua sobre o fundo) */}
      <div
        className="mt-8 overflow-hidden rounded-2xl bg-white sm:rounded-3xl"
        style={{ boxShadow: "0 34px 70px -22px rgba(68,58,82,0.38)" }}
      >
        <div className="rdp-gradient-soft px-5 py-7 text-center sm:px-10 sm:py-8">
          <p className="font-display text-[11px] sm:text-xs italic tracking-[0.28em] text-[color:var(--gold-warm)]">
            MÉTODO COMPLETO · 7 DIAS
          </p>
          <div
            className="mx-auto mt-4 w-full max-w-lg overflow-hidden rounded-3xl p-[1.5px]"
            style={{
              background:
                "linear-gradient(135deg, #E8D3A6 0%, #C9A876 45%, #B58E50 100%)",
              boxShadow: "0 22px 50px -16px rgba(201,168,118,0.6)",
            }}
          >
            <img
              src={rotinaMockup}
              alt="Rotina de Paz"
              className="block w-full rounded-[calc(1.5rem-1px)]"
              loading="lazy"
              decoding="async"
            />
          </div>
          <p className="mt-3 font-display text-base sm:text-lg italic text-[color:var(--amethyst)]">
            O método guiado para desligar o alarme do medo e trazer alívio.
          </p>
        </div>

        {/* O QUE VOCÊ RECEBE */}
        <div className="space-y-7 px-5 py-7 sm:px-10 sm:py-8">
          <section>
            <SectionTitle>O que você recebe</SectionTitle>
            <p className="mt-3 text-[15px] sm:text-base leading-relaxed text-[color:var(--amethyst)]">
              <strong className="font-semibold text-[color:var(--deep-purple)]">14 sessões guiadas em áudio</strong>:{" "}
              <strong className="font-semibold text-[color:var(--deep-purple)]">7 capítulos</strong> pra usar de manhã e{" "}
              <strong className="font-semibold text-[color:var(--deep-purple)]">7 à noite</strong>.
            </p>
            <p className="mt-2.5 text-[15px] sm:text-base leading-relaxed text-[color:var(--amethyst)]">
              Cada sessão tem de{" "}
              <strong className="font-semibold text-[color:var(--deep-purple)]">8 a 12 minutos</strong> — cabe entre uma
              tarefa e outra, antes de dormir, antes da casa acordar.
            </p>
          </section>

          {/* ESPECIALMENTE PRA VOCÊ — capítulos do arquétipo */}
          <section>
            <SectionTitle>Especialmente pra você</SectionTitle>
            <p className="mt-3 text-[15px] sm:text-base text-[color:var(--amethyst)]">
              Dois capítulos foram feitos especificamente para o seu padrão:
            </p>
            <ul className="mt-4 space-y-3">
              {archetype.chapters.map((c, i) => (
                <li
                  key={`${c.num}-${c.period}-${i}`}
                  className="flex gap-3 sm:gap-4 overflow-hidden rounded-2xl px-3 py-3.5 sm:px-4 sm:py-4"
                  style={{
                    background: "linear-gradient(135deg, #574868 0%, #41345a 100%)",
                    boxShadow: "0 14px 34px -20px rgba(42,34,54,0.6)",
                  }}
                >
                  <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--gold-warm)]/60 font-display text-sm italic text-[#fbe7b4]">
                    {c.num}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base sm:text-lg leading-snug text-[#fcf7ef]">
                      {c.title}
                    </p>
                    <p className="mt-1 text-[13px] sm:text-sm leading-relaxed text-[#d6cdda]">
                      <strong className="font-semibold text-[color:var(--gold-warm)]">{c.period}.</strong>{" "}
                      {c.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {/* micro-CTA 2 */}
            <button
              type="button"
              onClick={onCheckout}
              className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--gold-warm)]/40 bg-white/60 px-4 py-3 text-[13px] sm:text-sm font-medium text-[color:var(--deep-purple)] transition-all hover:-translate-y-[1px] hover:border-[color:var(--gold-warm)] hover:bg-[color:var(--milk-warm)]"
            >
              <span>Quero esses capítulos pra mim</span>
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </button>
          </section>

          {/* JUNTO COM O MÉTODO */}
          <section>
            <SectionTitle>Junto com o método, você leva</SectionTitle>
            <ul className="mt-4 divide-y divide-[color:var(--border)]">
              {[
                ["Método completo dentro do APP", ""],
                ["App guiado", "Tudo organizado e didático no seu celular — o caminho montado na ordem certa. Você abre, e ele sabe onde você parou."],
                ["Volume I — Despertar", "7 Manhãs de Renovação Neural"],
                ["Volume II — Repouso", "7 Noites de Selagem Profunda"],
                ["Acesso vitalício pelo app", "você ouve quando quiser, quantas vezes precisar"],
              ].map(([title, desc]) => (
                <li key={title} className="flex items-start gap-3 py-3 text-[15px] sm:text-base">
                  <span
                    className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#fbe7b4]"
                    style={{ background: "linear-gradient(135deg, #7d6a96 0%, #5f4f7d 100%)" }}
                  >
                    <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                  </span>
                  <p className="leading-relaxed text-[color:var(--deep-purple)]">
                    <strong>{title}</strong>
                    {desc && <> <span className="text-[color:var(--amethyst)]">— {desc}</span></>}
                  </p>
                </li>
              ))}
            </ul>

            {/* Bônus — título dourado + imagem */}
            <div className="mt-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[color:var(--gold-warm)]" aria-hidden />
                <span className="font-display text-sm sm:text-base italic text-[color:var(--gold-warm)]">
                  Bônus para fortalecer sua Rotina de Paz
                </span>
              </div>
              <img
                src={bonusImg}
                alt="Bônus da Rotina de Paz"
                className="mt-3 w-full rounded-2xl"
                loading="lazy"
                decoding="async"
              />
            </div>
          </section>
        </div>

        {/* PREÇO */}
        <div className="rdp-gradient-soft mx-5 mb-6 rounded-2xl border border-[color:var(--lavender)]/30 px-5 py-7 text-center sm:mx-10 sm:px-10 sm:py-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--gold-warm)]/40 bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--deep-purple)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--gold-warm)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--gold-warm)]" />
            </span>
            Oferta especial desta página
          </div>
          <p className="text-sm sm:text-base text-[color:var(--amethyst)] line-through">De {formatBRL(anchorCents)}</p>
          <p className="mt-2 font-display text-[color:var(--deep-purple)]">
            <span className="text-2xl sm:text-3xl align-top">R$</span>{" "}
            <span className="font-display text-[64px] sm:text-7xl leading-none italic text-[color:var(--gold-warm)]">{Math.round(priceCents / 100)}</span>
          </p>
          <p className="mt-2 text-[15px] sm:text-base text-[color:var(--deep-purple)]">
            à vista <span className="mx-2 text-[color:var(--amethyst)]">ou</span>{" "}
            <strong>{freeInstCount}× de {formatBRL(Math.round(priceCents / freeInstCount))} sem juros</strong>
          </p>
          <p className="mt-3 font-display text-[13px] sm:text-sm italic text-[color:var(--amethyst)]">
            Pagamento único · Acesso permanente · Sem mensalidade
          </p>
          <p className="mt-2 text-[11px] text-[color:var(--amethyst)]">
            🔒 Acesso imediato · Pagamento 100% seguro
          </p>
        </div>

        {/* FECHAMENTO + CTA */}
        <div className="px-5 pb-6 pt-2 text-center sm:px-10">
          {quote && (
            <p className="mx-auto max-w-lg font-display text-base sm:text-lg italic text-[color:var(--amethyst)]">
              Você lembra do seu desejo: "{quote}"
            </p>
          )}
          <p className="mt-3 font-display text-lg sm:text-2xl text-[color:var(--deep-purple)]">
            Esse é o caminho específico pra ele.
          </p>

          <button
            onClick={onCheckout}
            aria-label={ctaLabel}
            className="rdp-btn-gradient-hover rdp-shadow-soft mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full px-6 py-4 text-[13px] sm:text-sm font-medium uppercase tracking-[0.16em] sm:tracking-[0.18em] text-[color:var(--milk)] sm:w-auto sm:px-12"
          >
            <span>{ctaLabel}</span> <span aria-hidden>→</span>
          </button>
          <p className="mt-4 text-[11px] sm:text-xs text-[color:var(--amethyst)]">
            🔒 Acesso imediato após pagamento · Pagamento 100% seguro
          </p>
        </div>

        {/* GARANTIA */}
        <div className="mx-5 mb-8 rounded-2xl border border-[color:var(--lavender)]/30 bg-[color:var(--milk-warm)] px-5 py-5 sm:mx-10 sm:px-6 sm:py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--rose-soft)] text-lg">
              🛡
            </span>
            <h4 className="font-display text-lg sm:text-xl leading-snug text-[color:var(--deep-purple)]">
              Garantia incondicional de 7 dias
            </h4>
          </div>
          <p className="mt-3 text-[15px] sm:text-base leading-relaxed text-[color:var(--deep-purple)]">
            Faça a jornada completa. Se não sentir mudança, devolvo cada centavo.
            Sem formulário, sem pergunta, sem julgamento. Você só me escreve.
          </p>
        </div>
      </div>

      {/* CTA fixo no mobile */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:hidden"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="leading-tight">
            <p className="font-display text-base text-[color:var(--deep-purple)]">
              {formatBRL(priceCents)} <span className="text-xs font-normal text-[color:var(--amethyst)]">ou {freeInstCount}× {formatBRL(Math.round(priceCents / freeInstCount))}</span>
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--amethyst)]">
              Acesso imediato
            </p>
          </div>
          <button
            onClick={onCheckout}
            aria-label={ctaLabel}
            className="rdp-btn-gradient-hover rdp-shadow-soft inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--milk)]"
          >
            Quero minha paz <span aria-hidden>→</span>
          </button>
        </div>
      </div>
      {/* spacer pra não cobrir o conteúdo no mobile */}
      <div aria-hidden className="h-20 sm:hidden" />
    </motion.section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-8 bg-[color:var(--gold-warm)]/60" />
      <h4 className="font-display text-2xl text-[color:var(--deep-purple)]">{children}</h4>
    </div>
  );
}

/* ============================== ERROR BOUNDARY ============================== */

class QuizErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[QuizApp] render error:", error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-[color:var(--milk)] p-8 text-center">
          <div>
            <p className="font-display text-xl text-[color:var(--deep-purple)]">
              Carregando seu resultado...
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 rounded-full bg-[color:var(--gold-warm)] px-6 py-3 text-sm font-medium text-white"
            >
              Continuar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}