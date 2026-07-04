import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { GuideAvatar } from "./Avatar";
import { SpeechBubble } from "./SpeechBubble";
import { EmotionalProgress } from "./EmotionalProgress";
import {
  ARCHETYPES,
  DESIRE_CTA,
  DESIRE_QUOTE,
  ENCOURAGEMENTS,
  QUESTIONS,
  SYMPTOM_STATS,
  getGuideReaction,
  computeArchetype,
  getTransition,
  type Archetype,
  type ArchetypeData,
} from "@/data/quiz";
import { ResultScreen } from "./ResultScreen";
import { OfferScreen } from "./OfferScreen";
import { Component, type ErrorInfo } from "react";
import { playDing } from "@/lib/sound";
import { buildKirvanoUrl, captureUtms } from "@/lib/utm";
import { getSupabase } from "@/lib/supabase";
import { captureMetaClickData, getOrCreateExternalId, saveTrackingSession, sendTrackingBeacon, trackInitiateCheckout } from "@/lib/tracking";
import { fetchProductPrices, fetchInstallmentFreeCount, formatBRL } from "@/lib/prices";
import logoSrc from "@/assets/rotina-de-paz-logo.webp";
import { Check } from "lucide-react";

const KIRVANO_URL =
  (import.meta.env.VITE_KIRVANO_URL as string | undefined) ||
  "https://pay.kirvano.com/sua-oferta";

// Feature flag: VITE_USE_CHECKOUT_SACRA=true → redireciona pro /checkout Sacra
// Rollback: remover a var ou setar false → volta pro Kirvano em 1 redeploy
const USE_CHECKOUT_SACRA = import.meta.env.VITE_USE_CHECKOUT_SACRA === "true";
const QUIZ_VERSION = "v2-resultado";
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
    desire: p.get("desire") ?? "dormir",
    situation: p.get("situation") ?? undefined,
  };
}

// Persistência de sessão: localStorage com TTL 48h (sobrevive fechar aba).
// Retoma de onde parou — inclusive no meio das perguntas.
const SAVED_KEY = "sacra_quiz_state_v3";
const SAVED_TTL_MS = 48 * 60 * 60 * 1000; // 48h

type SavedState = {
  stage: Stage;
  qIndex?: number;
  answers: Record<string, string>;
  name: string;
  whatsapp: string;
  email: string;
  savedAt: number; // timestamp pra TTL
};

function loadSavedState(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // TTL check: expirado → limpa e recomeça
    if (typeof s?.savedAt === "number" && Date.now() - s.savedAt > SAVED_TTL_MS) {
      localStorage.removeItem(SAVED_KEY);
      return null;
    }
    // Só retoma funil INACABADO. Restaurar "result"/"offer" de uma rodada antiga
    // (respostas velhas → arquétipo errado; ou pulo direto pra oferta) é bug: quem
    // já terminou recomeça limpo. Ver telas A/B.
    const validStages: Stage[] = ["questions", "contact"];
    if (
      validStages.includes(s?.stage) &&
      s?.answers &&
      typeof s.answers === "object"
    ) {
      return {
        stage: s.stage,
        qIndex: typeof s.qIndex === "number" && s.qIndex >= 0 && s.qIndex < QUESTIONS.length ? s.qIndex : undefined,
        answers: s.answers,
        name: typeof s.name === "string" ? s.name : "",
        whatsapp: typeof s.whatsapp === "string" ? s.whatsapp : "",
        email: typeof s.email === "string" ? s.email : "",
        savedAt: s.savedAt,
      };
    }
    return null;
  } catch {
    return null;
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
  // Retomada: banner "Que bom que você voltou" quando restaura de localStorage
  const [showResumeBanner, setShowResumeBanner] = useState(
    !!saved && saved.stage === "questions",
  );
  const [name, setName] = useState(saved?.name ?? "");
  const [qIndex, setQIndex] = useState(saved?.qIndex ?? 0);
  const qIndexRef = useRef(qIndex);
  qIndexRef.current = qIndex;
  const answeringRef = useRef(false);
  const [answers, setAnswers] = useState<Record<string, string>>(saved?.answers ?? {});
  // G1-v5: reação da guia — balão com avatar e typing (formato único)
  const [reaction, setReaction] = useState<string | null>(null);
  // Ref: texto da reação pra encadear com a transição da próxima pergunta
  const pendingReactionRef = useRef<string | null>(null);
  const [encouragement, setEncouragement] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState(saved?.whatsapp ?? "");
  const [email, setEmail] = useState(saved?.email ?? "");
  const [sending, setSending] = useState(false);
  const [mainPriceCents, setMainPriceCents] = useState(4700);
  const [mainAnchorCents, setMainAnchorCents] = useState(19700);
  const [freeInstCount, setFreeInstCount] = useState(3);
  const startTsRef = useRef<number>(Date.now());
  const firedStagesRef = useRef<Set<string>>(new Set());
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
        p_version: QUIZ_VERSION,
      })).catch(() => {});
    } catch { /* never block quiz */ }
  };

  useEffect(() => {
    captureUtms();
    captureMetaClickData();
    // Camada 1: salva tracking session no mount — quando chegar no CTA já está no banco
    void saveTrackingSession(getOrCreateExternalId()).catch(() => {});
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

  // Persiste em localStorage (sobrevive fechar aba). Salva em questions + contact/result/offer.
  useEffect(() => {
    if (preview) return;
    if (stage === "hero" || stage === "loading") return;
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify({
        stage, qIndex, answers, name, whatsapp, email, savedAt: Date.now(),
      }));
    } catch {
      // armazenamento indisponível → ignora, não quebra
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, qIndex, answers, name, whatsapp, email]);

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

    // G1-v5: reação como balão da guia (formato único pra tudo)
    const { text: reactionText, durationMs } = getGuideReaction(q.key, value);
    setReaction(reactionText);

    const isLast = idx === QUESTIONS.length - 1;
    const nextQ = !isLast ? QUESTIONS[idx + 1] : null;
    const nextHasTransition = nextQ && (nextQ.transition || nextQ.transitionFrom);

    // Se próxima pergunta tem transição, encadear reação+transição num balão só
    if (nextHasTransition) {
      pendingReactionRef.current = reactionText;
    }

    window.setTimeout(() => {
      setReaction(null);

      if (isLast) {
        window.setTimeout(() => setStage("loading"), 200);
        return;
      }

      // encorajamento a cada 3 perguntas
      if ((idx + 1) % 3 === 0) {
        const msg = ENCOURAGEMENTS[Math.min(Math.floor((idx + 1) / 3) - 1, ENCOURAGEMENTS.length - 1)];
        setEncouragement(msg);
        window.setTimeout(() => {
          setEncouragement(null);
          setQIndex((i) => i + 1);
          answeringRef.current = false;
        }, 2500);
      } else {
        setQIndex((i) => i + 1);
        answeringRef.current = false;
      }
    }, durationMs);
  };

  // Análise de abandono: marca cada pergunta EXIBIDA. No Meta, o funil de eventos
  // QuizStep mostra exatamente em qual pergunta o usuário desiste (a contagem cai).
  // Fire-and-forget via fbq trackCustom — sem sendBeacon, nunca quebra o fluxo.
  useEffect(() => {
    if (stage !== "questions") return;
    const q = QUESTIONS[qIndex];
    if (!q) return;
    try {
      if (typeof window !== "undefined" &&
          ["sacra.rotinadepaz.com.br", "rotinadepaz.com.br"].includes(window.location.hostname)) {
        (window as { fbq?: (...a: unknown[]) => void }).fbq?.("trackCustom", "QuizStep", {
          step: qIndex + 1,
          total: QUESTIONS.length,
          question: q.key,
        });
      }
    } catch {
      /* analytics nunca bloqueia o quiz */
    }
    trackStep("question", q.key);
  }, [stage, qIndex]);

  // G4-v2: Loading com ritmo lento (1.1s/item) + card de micro-recompensa (2s) entre itens 2-3
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [loadingStatCard, setLoadingStatCard] = useState(false);
  useEffect(() => {
    if (stage !== "loading") return;
    setLoadingMsg(0);
    setLoadingStatCard(false);
    const step = 1100;
    const timers: number[] = [];
    // Items 0,1 at step intervals
    timers.push(window.setTimeout(() => setLoadingMsg(1), step));
    // After item 1: show stat card — fica visível até o fim do loading
    const statStart = step * 2;
    timers.push(window.setTimeout(() => setLoadingStatCard(true), statStart));
    const statEnd = statStart + 3500;
    timers.push(window.setTimeout(() => setLoadingMsg(2), statEnd));
    // Items 3,4 after the stat card
    timers.push(window.setTimeout(() => setLoadingMsg(3), statEnd + step));
    timers.push(window.setTimeout(() => setLoadingMsg(4), statEnd + step * 2));
    // Transition to contact (card fica visível até aqui)
    timers.push(window.setTimeout(() => setStage("contact"), statEnd + step * 2 + 1000));
    // Persiste lead no Supabase (best effort). Lead event disparado na captura de contato.
    // A promise é guardada em leadPromiseRef para o submitContact fazer await.
    leadPromiseRef.current = persistLead(answers).catch(() => null);
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Funnel: result/offer/contact stage beacons (1× per session per stage)
  useEffect(() => {
    if (preview) return;
    // "contact" (não "contact_gate"): o CHECK de quiz_funnel_events.stage em PROD
    // só aceita arrival/question/contact/result/offer/cta. "contact_gate" dava 400
    // (23514) e o evento de funil de contato se perdia no admin.
    const steps: Record<string, string> = { contact: "contact", result: "result", offer: "offer" };
    const stepName = steps[stage];
    if (!stepName || firedStagesRef.current.has(stepName)) return;
    firedStagesRef.current.add(stepName);
    trackStep(stepName);
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
      p_external_id: getOrCreateExternalId(),
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
        if (typeof window !== "undefined" &&
            ["sacra.rotinadepaz.com.br", "rotinadepaz.com.br"].includes(window.location.hostname)) {
          const fbq = (window as any).fbq;
          if (fbq) {
            const eid = getOrCreateExternalId();
            const ph = hasWhatsapp ? `55${digits}` : undefined;
            const PIXEL = "863734499693171";
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
    // Camada 2: beacon keepalive — sobrevive ao redirect, não bloqueia
    sendTrackingBeacon(externalId);
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
    <main className="relative min-h-dvh bg-[color:var(--milk)]">
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
            reaction={reaction}
            pendingReaction={pendingReactionRef}
            encouragement={encouragement}
            answers={answers}
            resumeBanner={showResumeBanner}
            onDismissResume={() => setShowResumeBanner(false)}
          />
        )}

        {stage === "loading" && (
          <LoadingScreen key="loading" step={loadingMsg} answers={answers} name={name} statCard={loadingStatCard} />
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

// C4-v3: cascata animada, campo pulsando, chevron, menos texto.
// Stagger cascade: cada bloco entra com fade+translateY, 0.15s stagger.
const EASE_SOFT: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
const cascade = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.1 + i * 0.15, ease: EASE_SOFT },
});
const cascadePop = (i: number) => ({
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.5, delay: 0.1 + i * 0.15, ease: EASE_SOFT },
});

function HeroScreen({
  name,
  setName,
  onStart,
}: {
  name: string;
  setName: (s: string) => void;
  onStart: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const prefersReduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const anim = prefersReduced
    ? { initial: undefined, animate: undefined, transition: undefined }
    : {};

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-end px-6 pb-0 pt-4 text-center sm:justify-center sm:px-8 sm:py-16"
    >
      {/* 0. Avatar + bubble */}
      <motion.div className="flex w-full items-start justify-center gap-3 sm:gap-4" {...(prefersReduced ? {} : cascade(0))}>
        <GuideAvatar size="corner" />
        <SpeechBubble text="Olá. Eu sou sua guia nessa jornada." typingDelay={400} />
      </motion.div>

      {/* 1. Headline 38px */}
      <motion.h1
        className="rdp-title-gradient mt-10 font-display text-[38px] leading-[1.05] tracking-tight sm:mt-12 sm:text-[72px]"
        {...(prefersReduced ? {} : cascade(1))}
      >
        Não é a sua oração que está <em className="italic">falhando</em>.
      </motion.h1>

      {/* 2. Subheadline 19px */}
      <motion.p
        className="mt-7 font-display text-[19px] italic leading-[1.45] text-[color:var(--amethyst)] sm:mt-7 sm:text-[28px]"
        {...(prefersReduced ? {} : cascade(2))}
      >
        Descubra o que está{" "}
        <strong className="font-bold">abafando essa paz</strong>
        {" "}— e o caminho pro seu padrão.
      </motion.p>

      {/* 3–6. Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length >= 2) onStart();
        }}
        className="relative mt-12 flex w-full max-w-[340px] flex-col items-center sm:mt-14"
      >
        {/* Micro-CTA com coração heartbeat */}
        <motion.p
          className="flex items-center gap-1.5 text-[13px] italic text-[color:var(--amethyst)]"
          {...(prefersReduced ? {} : cascade(3))}
        >
          <span>Me diz seu nome — quero te chamar por ele</span>
          <span
            className="inline-block text-base"
            style={prefersReduced ? {} : { animation: "rdp-heartbeat 1.6s ease-in-out infinite", color: "#D85A75" }}
            aria-hidden
          >
            ♥
          </span>
        </motion.p>

        {/* Seta arco SVG — absolute canto direito */}
        <motion.div
          className="pointer-events-none absolute right-0 top-[20px] z-10 sm:right-[-8px] sm:top-[22px]"
          {...(prefersReduced ? {} : cascade(3))}
          aria-hidden
        >
          <svg viewBox="0 0 28 44" fill="none" className="block h-[44px] w-[28px] sm:hidden">
            <path d="M4 3 C20 3, 24 18, 18 38" stroke="var(--amethyst)" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" pathLength="1"
              style={prefersReduced ? {} : { strokeDasharray: 1, strokeDashoffset: 0, animation: "rdp-draw 0.7s ease-out 0.8s both" }} />
            <path d="M14 34 L18 41 L22 34" stroke="var(--amethyst)" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1"
              style={prefersReduced ? {} : { strokeDasharray: 1, strokeDashoffset: 0, animation: "rdp-draw 0.3s ease-out 1.3s both" }} />
          </svg>
          <svg viewBox="0 0 36 52" fill="none" className="hidden h-[52px] w-[36px] sm:block">
            <path d="M4 3 C26 3, 32 22, 22 45" stroke="var(--amethyst)" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" pathLength="1"
              style={prefersReduced ? {} : { strokeDasharray: 1, strokeDashoffset: 0, animation: "rdp-draw 0.7s ease-out 0.8s both" }} />
            <path d="M18 40 L22 48 L26 40" stroke="var(--amethyst)" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1"
              style={prefersReduced ? {} : { strokeDasharray: 1, strokeDashoffset: 0, animation: "rdp-draw 0.3s ease-out 1.3s both" }} />
          </svg>
        </motion.div>

        {/* Input — 12px após micro-CTA, mesma largura do botão */}
        <motion.div className="mt-3 w-full" {...(prefersReduced ? {} : cascade(4))}>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { if (!name) setFocused(false); }}
            placeholder="Seu primeiro nome"
            className="w-full rounded-full border border-[color:var(--border)] bg-white/70 px-5 py-3 text-center text-base text-[color:var(--deep-purple)] placeholder:text-[color:var(--amethyst)]/60 focus:border-[color:var(--lavender)] focus:outline-none focus:ring-4 focus:ring-[color:var(--lavender)]/20 transition-shadow duration-200"
            style={
              !focused && !name && !prefersReduced
                ? { animation: "rdp-field-pulse 2.4s ease-in-out infinite" }
                : {}
            }
            autoComplete="given-name"
            required
            minLength={2}
            maxLength={40}
          />
        </motion.div>

        {/* Botão — 20px após input */}
        <motion.button
          type="submit"
          disabled={name.trim().length < 2}
          className="rdp-btn-gradient-hover mt-5 inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 py-3.5 text-[13px] font-medium uppercase tracking-[0.12em] text-white shadow-[0_18px_40px_-18px_rgba(68,58,82,0.6)] transition-transform active:scale-[0.98] hover:-translate-y-[1px] disabled:hover:translate-y-0"
          {...(prefersReduced ? {} : cascadePop(5))}
        >
          {name.trim().length >= 2
            ? <><span>Pronta, {name.trim().split(/\s/)[0]}? Começar</span> <span aria-hidden>→</span></>
            : <><span>Descobrir meu padrão</span> <span aria-hidden>→</span></>
          }
        </motion.button>

        {/* Microtexto — 14px após botão */}
        <motion.p className="mt-3.5 text-[12px] text-[color:var(--amethyst)]/70" {...(prefersReduced ? {} : cascade(6))}>
          Leva menos de 3 minutos · 7 perguntas
        </motion.p>
      </form>

      {/* Prova social — próximo do microtexto, não no rodapé distante */}
      <motion.p
        className="mt-8 max-w-[300px] pb-8 text-center text-[13px] leading-[1.45] text-[color:var(--amethyst)]"
        {...(prefersReduced ? {} : cascade(7))}
      >
        Mais de <span className="font-semibold text-[color:var(--gold-warm)]">70 mulheres</span> fizeram esse diagnóstico nos últimos dias.
      </motion.p>
    </motion.section>
  );
}

/* ============================== QUESTIONS ============================== */

function QuestionScreen({
  qIndex,
  total,
  answer,
  reaction,
  pendingReaction,
  encouragement,
  answers,
  resumeBanner,
  onDismissResume,
}: {
  qIndex: number;
  total: number;
  answer: (v: string) => void | Promise<void>;
  reaction: string | null;
  pendingReaction: React.RefObject<string | null>;
  encouragement: string | null;
  answers: Record<string, string>;
  resumeBanner: boolean;
  onDismissResume: () => void;
}) {
  const safeIndex = qIndex >= 0 && qIndex < QUESTIONS.length ? qIndex : 0;
  const q = QUESTIONS[safeIndex];
  const rawTransition = getTransition(safeIndex, answers);
  const [showOptions, setShowOptions] = useState(false);
  const [showPrompt, setShowPrompt] = useState(!rawTransition);
  const [picked, setPicked] = useState<string | null>(null);

  // G1-v5: encadear reação pendente + transição num balão só
  const chainedReaction = pendingReaction.current;
  const transition = chainedReaction && rawTransition
    ? `${chainedReaction}\n\n${rawTransition}`
    : rawTransition;

  // Limpa a reação pendente após consumir
  useEffect(() => {
    if (chainedReaction) pendingReaction.current = null;
  });

  useEffect(() => {
    if (!q) return;
    setShowOptions(false);
    setShowPrompt(!transition);
    setPicked(null);
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
      className="mx-auto flex min-h-dvh max-w-2xl flex-col overflow-x-clip px-5 pb-6 pt-4 sm:px-8 sm:pb-10 sm:pt-6"
    >
      <EmotionalProgress current={qIndex + 1} total={total} answers={answers} />

      {/* Retomada: banner de boas-vindas */}
      <AnimatePresence>
        {resumeBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onAnimationComplete={() => {
              window.setTimeout(onDismissResume, 3000);
            }}
            className="mt-3 rounded-xl bg-[color:var(--milk-warm)] px-4 py-2.5 text-center text-sm text-[color:var(--amethyst)]"
          >
            Que bom que você voltou. Suas respostas estão guardadas — faltam só {total - qIndex}.
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-5 flex items-start gap-3 sm:mt-8 sm:gap-5">
        <GuideAvatar size="corner" />
        <div className="min-w-0 flex-1 space-y-2 pt-1 sm:space-y-3">
          {/* G1-v5: reação da guia como balão (mesmo visual das transições) */}
          <AnimatePresence>
            {reaction && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <SpeechBubble text={reaction} italic resetKey={reaction} typingDelay={0} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transição (pode ter reação encadeada no início) */}
          {!reaction && transition && (
            <SpeechBubble
              text={transition}
              resetKey={`t-${qIndex}`}
              italic
              instant={!chainedReaction}
              typingDelay={chainedReaction ? 0 : undefined}
            />
          )}
          {!reaction && showPrompt && (
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
          {!reaction && showOptions &&
            q.options.map((opt, i) => (
              <motion.button
                key={opt.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.18, duration: 0.35, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                disabled={!!picked}
                onClick={() => {
                  if (picked) return;
                  setPicked(opt.value);
                  window.setTimeout(() => answer(opt.value), 280);
                }}
                className={`group relative flex items-start gap-3 overflow-hidden rounded-2xl border bg-white px-5 py-4 text-left text-base text-[color:var(--deep-purple)] transition-all sm:text-lg ${
                  picked === opt.value
                    ? "rdp-option-picked"
                    : "border-[color:var(--border)] hover:-translate-y-0.5 hover:border-[color:var(--gold-warm)]/60"
                }`}
              >
                {/* Checkbox quadradinho */}
                <span aria-hidden className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-all duration-200 ${
                  picked === opt.value
                    ? "border-[color:var(--gold-warm)] bg-[color:var(--gold-warm)]"
                    : "border-[color:var(--lavender)]/50 bg-white group-hover:border-[color:var(--gold-warm)]"
                }`}>
                  <svg viewBox="0 0 12 10" fill="none" className={`h-3 w-3 transition-all duration-200 ${
                    picked === opt.value ? "scale-100 opacity-100" : "scale-50 opacity-0"
                  }`}>
                    <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span className="relative z-10">{opt.label}</span>
              </motion.button>
            ))}
        </AnimatePresence>
      </div>

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

function LoadingScreen({ step, answers, name, statCard }: { step: number; answers: Record<string, string>; name: string; statCard: boolean }) {
  const particles = Array.from({ length: 28 });

  // G4-v2: pills reais com destaque dourado
  const pillOf = (key: string): string => {
    const val = answers[key];
    if (!val) return "";
    const q = QUESTIONS.find((q) => q.key === key);
    const opt = q?.options.find((o) => o.value === val);
    return opt?.pill ?? "";
  };

  const pillSituacao = pillOf("situacao");
  const pillSintoma = pillOf("sintoma");
  const pillComportamento = pillOf("comportamento");

  // Stat card: estatística real por sintoma
  const sintoma = answers["sintoma"] ?? "";
  const statText = SYMPTOM_STATS[sintoma] ?? SYMPTOM_STATS["todos"] ?? "";

  // Mensagens com marcadores para split gold (texto entre ** fica dourado)
  const messages: Array<{ prefix: string; gold: string; suffix: string }> = [
    { prefix: "Analisando seu contexto: ", gold: pillSituacao || "suas respostas", suffix: "…" },
    { prefix: "Cruzando: ", gold: `${pillSintoma || "sintomas"} + ${pillComportamento || "comportamento"}`, suffix: "…" },
    { prefix: "Identificando seu padrão ", gold: "entre os 4", suffix: "…" },
    { prefix: "Localizando os capítulos ", gold: "do método pro seu caso", suffix: "…" },
    { prefix: `Pronto${name ? `, ${name}` : ""}. `, gold: "Seu resultado chegou", suffix: "." },
  ];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="rdp-night fixed inset-0 z-50 grid place-items-center overflow-hidden"
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

        {/* G4-v2: Checklist com gold + checkmarks */}
        <ul className="mt-6 max-w-[320px] space-y-2.5 px-4 text-left">
          {messages.map((m, i) => {
            const done = i <= step;
            return (
              <li
                key={i}
                className={`flex items-start gap-2.5 font-display text-sm italic transition-all duration-500 ${
                  done ? "text-[color:rgba(232,201,160,0.85)]" : "text-white/15"
                }`}
              >
                {/* Checkmark animado */}
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                  done ? "bg-[color:rgba(232,201,160,0.25)]" : "bg-white/5"
                }`}>
                  {done && (
                    <Check className="h-2.5 w-2.5 text-[color:rgba(232,201,160,0.9)]" strokeWidth={3} />
                  )}
                </span>
                <span>
                  {m.prefix}
                  <span className={`font-semibold transition-colors duration-500 ${
                    done ? "text-[color:var(--gold-warm)]" : ""
                  }`}>
                    {m.gold}
                  </span>
                  {m.suffix}
                </span>
              </li>
            );
          })}
        </ul>

        {/* G4-v2: Micro-recompensa — card de estatística real */}
        <AnimatePresence>
          {statCard && statText && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
              className="mx-4 mt-5 max-w-sm rounded-xl border border-[color:rgba(232,201,160,0.2)] bg-white/5 px-5 py-4 text-center backdrop-blur-sm"
            >
              <p className="font-display text-[13px] italic leading-relaxed text-[color:rgba(232,201,160,0.9)]">
                {statText}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
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
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center overflow-x-clip px-5 py-10"
    >
      {/* Avatar + balao */}
      <div className="flex w-full items-start gap-3 sm:gap-5">
        <GuideAvatar size="corner" />
        <div className="min-w-0 flex-1 pt-1">
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

/* ============================== RESULT (extraído para ./ResultScreen.tsx) ============================== */


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