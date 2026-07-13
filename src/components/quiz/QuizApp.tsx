import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { GuideAvatar } from "./Avatar";
import { SpeechBubble } from "./SpeechBubble";
import jaquelineAvatar from "@/assets/jaqueline-avatar.webp";
import { EmotionalProgress } from "./EmotionalProgress";
import { WhatsProofCard } from "./WhatsProof";
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
import {
  AGE_BANDS,
  getAgeBand,
  ALERT_HEADLINES,
  ALERT_SUBS,
  ALERT_EMOTIONAL,
} from "@/data/age-data";
import { ResultScreen } from "./ResultScreen";
import { OfferScreen } from "./OfferScreen";
import { Component, type ErrorInfo } from "react";
import { playDing } from "@/lib/sound";
import { buildKirvanoUrl, captureUtms } from "@/lib/utm";
import { getSupabase } from "@/lib/supabase";
import { captureMetaClickData, getMetaClickData, getOrCreateExternalId, readFbCookies, saveTrackingSession, sendTrackingBeacon, trackInitiateCheckout } from "@/lib/tracking";
import { fetchProductPrices, fetchInstallmentFreeCount, formatBRL } from "@/lib/prices";
import { QUIZ_ID, PIXEL_ID } from "@/lib/quiz-config";
import logoSrc from "@/assets/rotina-de-paz-logo.webp";
import crossBrushSrc from "@/assets/cross-brush.webp";
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

type Stage = "hero" | "acolhimento" | "questions" | "age" | "alert" | "loading" | "contact" | "result" | "offer";

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
// Flag de sessão: marca que o usuário chegou ao resultado NESTA sessão de aba.
// sessionStorage limpa ao fechar a aba → nova visita recomeça; refresh mantém.
const SESSION_RESULT_KEY = "sacra_quiz_reached_result";

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
    // Retoma perguntas e contato sempre.
    // Resultado/oferta só são restaurados se o usuário CHEGOU ao resultado nesta
    // sessão de aba (sessionStorage existe) — distingue refresh de nova visita.
    // Nova visita com quiz já respondido → NÃO descarta tudo: rebaixa para
    // "contact" preservando answers/name/whatsapp (evita refazer as 7 perguntas
    // e re-disparar Lead duplicado).
    const reachedResult = sessionStorage.getItem(SESSION_RESULT_KEY) === "1";
    const restorable: Stage[] = ["questions", "contact", "result", "offer"];
    if (
      restorable.includes(s?.stage) &&
      s?.answers &&
      typeof s.answers === "object"
    ) {
      const savedStage = s.stage as Stage;
      const isResultLike = savedStage === "result" || savedStage === "offer";
      const stage: Stage = isResultLike && !reachedResult ? "contact" : savedStage;
      return {
        stage,
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
  const [age, setAge] = useState(saved?.answers?.["idade"] ?? "");
  const [painPoint, setPainPoint] = useState<string | null>(null);
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
  // Garante que persistLead rode 1× — no loading OU ao restaurar direto em "contact".
  const leadStartedRef = useRef(false);

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
      // Domain-guard: só registra o funil em produção — evita poluir quiz_funnel_events
      // com localhost/preview de branch (mesmo modelo do pushVslEvent/pixel).
      const h = typeof window !== "undefined" ? window.location.hostname : "";
      if (h !== "rotinadepaz.com.br" && h !== "sacra.rotinadepaz.com.br") return;
      const sb = getSupabase();
      if (!sb) return;
      void Promise.resolve(sb.rpc("track_quiz_step", {
        p_session_id: getOrCreateExternalId(),
        p_stage: stage,
        p_question_key: questionKey ?? null,
        p_version: QUIZ_VERSION,
        p_quiz_id: QUIZ_ID,
      })).catch(() => {});
    } catch { /* never block quiz */ }
  };

  // Grava flag de sessão quando chega ao resultado/oferta.
  // sessionStorage sobrevive ao refresh mas limpa ao fechar a aba —
  // isso distingue "refresh na página de resultado" de "nova visita pelo link".
  useEffect(() => {
    if (stage === "result" || stage === "offer") {
      // try/catch: storage bloqueado (webview/incógnito restrito) lança
      // SecurityError — não pode derrubar a árvore no ponto mais valioso do funil.
      try {
        sessionStorage.setItem(SESSION_RESULT_KEY, "1");
      } catch { /* storage indisponível → segue sem a flag de sessão */ }
    }
  }, [stage]);

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
  // "acolhimento" NÃO é persistido: é alcançável em 1 toque a partir do hero e não é
  // um stage restaurável (loadSavedState só retoma questions/contact/result/offer) —
  // salvá-lo geraria um snapshot que o restore descarta, apagando estado anterior válido.
  useEffect(() => {
    if (preview) return;
    if (stage === "hero" || stage === "acolhimento" || stage === "loading") return;
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

      // Intercept: após pergunta 3 (idx=2, key="sintoma") → tela de idade
      if (idx === 2 && q.key === "sintoma") {
        setQIndex(idx + 1);
        window.setTimeout(() => setStage("age"), 200);
        answeringRef.current = false;
        return;
      }

      // Intercept: após pergunta 5 (idx=4, key="frase") → tela de alerta
      if (idx === 4 && q.key === "frase") {
        setQIndex(idx + 1);
        window.setTimeout(() => setStage("alert"), 200);
        answeringRef.current = false;
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
  const [loadingProof, setLoadingProof] = useState(0);
  useEffect(() => {
    if (stage !== "loading") return;
    setLoadingMsg(0);
    setLoadingStatCard(false);
    setLoadingProof(0);
    const step = 1100;
    const timers: number[] = [];
    // Items 0,1 at step intervals
    timers.push(window.setTimeout(() => setLoadingMsg(1), step));
    // After item 1: show stat card
    const statStart = step * 2;
    timers.push(window.setTimeout(() => setLoadingStatCard(true), statStart));
    const statEnd = statStart + 3500;
    timers.push(window.setTimeout(() => setLoadingMsg(2), statEnd));
    // Stat card dá lugar à prova social (prints WhatsApp de quem entendeu o padrão)
    timers.push(window.setTimeout(() => { setLoadingStatCard(false); setLoadingProof(1); }, statEnd));
    timers.push(window.setTimeout(() => setLoadingProof(2), statEnd + 1300));
    // Items 3,4 after the stat card
    timers.push(window.setTimeout(() => setLoadingMsg(3), statEnd + step));
    timers.push(window.setTimeout(() => setLoadingMsg(4), statEnd + step * 2));
    // Transition to contact (prova fica visível até aqui)
    timers.push(window.setTimeout(() => setStage("contact"), statEnd + step * 2 + 2200));
    // Persiste lead no Supabase (best effort). Lead event disparado na captura de contato.
    // A promise é guardada em leadPromiseRef para o submitContact fazer await.
    ensureLeadStarted();
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Dispara persistLead 1× — no fluxo normal via loading, e também quando o quiz é
  // restaurado direto no gate de contato (loading nunca roda). Sem isso o
  // leadPromiseRef fica em Promise.resolve(null) e submitContact não salva o contato.
  function ensureLeadStarted() {
    if (leadStartedRef.current) return;
    leadStartedRef.current = true;
    leadPromiseRef.current = persistLead(answers).catch(() => null);
  }
  useEffect(() => {
    if (preview) return;
    if (stage === "contact") ensureLeadStarted();
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
      p_quiz_id: QUIZ_ID,
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
      const { error: rpcErr } = await sb.rpc("persist_quiz_responses", { p_rows: rows, p_quiz_id: QUIZ_ID });
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
          const eid = getOrCreateExternalId();
          const ph = hasWhatsapp ? `55${digits}` : undefined;
          const fbq = (window as any).fbq;
          if (fbq) {
            const PIXEL = PIXEL_ID;
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
          // CAPI Lead (server-side) — mesmo eventID do pixel → dedup no Meta.
          // Cobre os ~75% de leads que o pixel client-side perde (adblock/iOS).
          try {
            // fbc via getMetaClickData: aplica o fallback fbclid→fb.1.<ts>.<fbclid>
            // (usuária sem cookie _fbc mas com fbclid — exatamente o público server-side).
            const cached = getMetaClickData();
            const fresh = readFbCookies();
            const fbp = fresh.fbp ?? cached.fbp;
            const fbc = cached.fbc ?? fresh.fbc;
            void getSupabase()?.functions.invoke("track-event", {
              body: {
                event_name: "Lead",
                event_id: `lead_${eid}`,
                event_source_url: window.location.href,
                visitor_id: eid,
                fbp,
                fbc,
                user_agent: navigator.userAgent,
                properties: {
                  content_name: "Rotina de Paz",
                  ...(ph ? { customer_phone: ph } : {}),
                  ...(hasEmail ? { customer_email: email.toLowerCase().trim() } : {}),
                  ...(name.trim() ? { customer_first_name: name.trim().split(" ")[0] } : {}),
                },
              },
            }).catch(() => {});
          } catch { /* nunca bloqueia o fluxo */ }
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
            onPickPain={(p) => {
              const slug = p.includes("cansaço") ? "cansaco" : p.includes("oração") ? "oracao" : "culpa";
              if (!preview) trackStep("hero_intent", slug);
              setPainPoint(p);
              setStage("acolhimento");
            }}
          />
        )}

        {stage === "acolhimento" && (
          <AcolhimentoScreen
            key="acolhimento"
            painPoint={painPoint}
            name={name}
            setName={setName}
            onContinue={startQuiz}
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

        {stage === "age" && (
          <AgeScreen
            key="age"
            age={age}
            setAge={setAge}
            onContinue={(ageVal) => {
              setAge(ageVal);
              setAnswers((prev) => ({ ...prev, idade: ageVal }));
              setStage("questions");
            }}
          />
        )}

        {stage === "alert" && (
          <AlertScreen
            key="alert"
            age={age}
            situacao={answers["situacao"] ?? ""}
            onContinue={() => setStage("questions")}
            onBackAge={() => setStage("age")}
          />
        )}

        {stage === "loading" && (
          <LoadingScreen key="loading" step={loadingMsg} answers={answers} name={name} statCard={loadingStatCard} proof={loadingProof} />
        )}

        {stage === "contact" && (
          <ContactGateScreen
            key="contact"
            name={name}
            setName={setName}
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
            leadName={name}
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

function HeroScreen({ onPickPain }: { onPickPain: (p: string) => void }) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-5 py-10 text-center sm:px-6 sm:py-16"
    >
      {/* Cruz decorativa brush-stroke — removida do fundo, agora inline na headline */}

      <div className="relative z-10 flex w-full items-start justify-center gap-3 sm:gap-4">
        <GuideAvatar size="corner" />
        <SpeechBubble
          text="Deus não te chamou pra viver de plantão."
          typingDelay={400}
        />
      </div>

      <h1 className="rdp-title-gradient relative z-10 mt-7 text-balance font-display text-[30px] leading-[1.1] tracking-tight sm:mt-8 sm:text-[48px] sm:leading-[1.08]">
        Existem <strong className="font-semibold">4 padrões</strong> diferentes de <em className="italic not-italic" style={{ fontVariant: "normal", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.85em" }}>esgotamento</em> entre mulheres cristãs.
        <img src={crossBrushSrc} alt="" aria-hidden="true" className="ml-2 inline-block h-[1.6em] w-auto align-middle opacity-40" style={{ mixBlendMode: "multiply", transform: "rotate(-8deg)" }} />
      </h1>

      <p className="mt-5 max-w-xl text-balance text-base leading-relaxed text-[color:var(--deep-purple)] sm:mt-6 sm:text-xl">
        E é por isso que a <span className="rounded px-1 bg-[color:var(--gold-vivid)]/35 font-semibold text-[color:var(--deep-purple)]">sua dor não é resolvida</span>, mesmo quando a sua fé é verdadeira.
      </p>

      <div className="mt-8 flex flex-col items-center gap-1.5 sm:mt-10">
        <p className="font-display text-lg font-semibold italic text-[color:var(--deep-purple)] sm:text-xl">
          Toque no que mais dói hoje:
        </p>
        <span className="rdp-bob text-[color:var(--amethyst)] text-xl" aria-hidden="true">↓</span>
      </div>

      <div className="mt-4 flex w-full max-w-md flex-col gap-3 sm:mt-5">
        {[
          "O cansaço que me esmaga",
          "Minha oração não passa do teto",
          "Sinto culpa por querer sumir",
        ].map((label, i) => (
          <motion.button
            key={label}
            type="button"
            onClick={() => onPickPain(label)}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="rdp-btn-pain group relative overflow-hidden rounded-2xl border border-[color:var(--lavender)] px-6 py-4.5 text-left text-base font-medium text-[color:var(--deep-purple)] shadow-[0_8px_24px_-12px_rgba(117,97,127,0.25)] transition-shadow hover:border-[color:var(--amethyst)] hover:shadow-[0_14px_34px_-14px_rgba(117,97,127,0.45)] sm:text-lg"
          >
            <span className="relative z-10 flex items-center justify-between gap-3">
              {label}
              <span className="rdp-arrow-pulse inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--deep-purple)]/10 text-[color:var(--deep-purple)] transition-colors group-hover:bg-[color:var(--deep-purple)] group-hover:text-white">
                →
              </span>
            </span>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent opacity-0 transition-opacity duration-300 group-hover:border-[color:var(--gold-warm)]/40 group-hover:opacity-100"
            />
          </motion.button>
        ))}
      </div>

      <p className="mt-8 max-w-md text-base leading-relaxed text-[color:var(--deep-purple)]/90">
        Descubra o seu padrão de <em className="italic">esmagamento</em> e como ter alívio desse peso todo.
      </p>

      <p className="mt-6 text-sm text-[color:var(--amethyst)]/80">
        Sem julgamento · 2 minutos · Grátis
      </p>
    </motion.section>
  );
}

/* ============================== ACOLHIMENTO ============================== */

const PAIN_RESPONSES: Record<string, { body: string; closing: string }> = {
  "O cansaço que me esmaga": {
    body: "Não é preguiça, nem falta de fé. É um padrão de esgotamento que se instalou devagar, enquanto você cuidava de todo mundo — e continua drenando você porque ninguém te ensinou a enxergar de onde ele vem.",
    closing: "Vamos dar nome ao que te esmaga. Assim você pode, enfim, descansar sem culpa.",
  },
  "Minha oração não passa do teto": {
    body: "Quando a mente não desliga e a alma parece muda, quase nunca é Deus distante. É um padrão interno, cansado e barulhento, que abafa a voz d'Ele. E ele pode, sim, ser interrompido.",
    closing: "Vamos entender juntas o que está entre você e a paz que você tanto espera.",
  },
  "Sinto culpa por querer sumir": {
    body: "É o seu corpo implorando pausa numa vida que não te deixa parar. A culpa que vem junto não é convicção do Espírito — é o eco de tudo que te ensinaram sobre se anular pra ser amada.",
    closing: "Vamos identificar o padrão que te prende no plantão e o caminho pra sair dele com paz.",
  },
};

function AcolhimentoScreen({
  painPoint,
  name,
  setName,
  onContinue,
}: {
  painPoint: string | null;
  name: string;
  setName: (s: string) => void;
  onContinue: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 py-12 text-center sm:px-6 sm:py-16"
    >
      {/* Social proof */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mb-8 flex items-center gap-2 rounded-full border border-[color:var(--lavender)]/40 bg-white/60 px-4 py-2 text-sm text-[color:var(--amethyst)]"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--gold-warm)]" />
        +120 mulheres já se encontraram
      </motion.div>

      {/* Card principal */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full rounded-3xl bg-gradient-to-b from-white via-[color:var(--milk-warm)] to-[color:var(--blush)]/20 p-8 shadow-[0_16px_48px_-16px_rgba(68,58,82,0.15)] sm:p-10"
      >
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold-warm)]"
        >
          A dor tem nome
        </motion.p>

        {/* Headline — apontar o inimigo */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="mt-4 font-display text-[24px] font-bold leading-tight text-[color:var(--deep-purple)] sm:text-[32px]"
        >
          O inimigo não é a sua falta de fé.
        </motion.h2>

        {/* Sub-headline — acento dourado */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.5 }}
          className="mt-3 font-display text-[20px] font-bold leading-snug text-[color:var(--gold-warm)] sm:text-[26px]"
        >
          É o alarme da ansiedade e os sintomas do estresse.
        </motion.p>

        {/* Body */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="mt-5 text-balance text-base leading-relaxed text-[color:var(--deep-purple)]/80 sm:text-lg"
        >
          Quando seu corpo vive em alerta, a mente não silencia, a oração fica pesada e a culpa começa a falar mais alto.
        </motion.p>

        {/* CTA */}
        <motion.button
          type="button"
          onClick={onContinue}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="rdp-gradient-cta mt-8 w-full rounded-full px-8 py-4.5 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_18px_44px_-16px_rgba(201,168,118,0.55)]"
          style={{ animation: "rdp-cta-pulse 2.5s ease-in-out infinite" }}
        >
          Entendi. Quero descobrir meu padrão <Check className="ml-1 inline-block h-4 w-4" />
        </motion.button>
      </motion.div>

      {/* Sub-CTA */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.7, duration: 0.4 }}
        className="mt-5 text-sm text-[color:var(--amethyst)]/70"
      >
        O quiz vai apontar qual padrão está drenando sua paz hoje.
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

function LoadingScreen({ step, answers, name, statCard, proof }: { step: number; answers: Record<string, string>; name: string; statCard: boolean; proof: number }) {
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
                  done ? "text-white/90" : "text-white/15"
                }`}
              >
                {/* Checkmark animado */}
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
                  done ? "bg-white/20" : "bg-white/5"
                }`}>
                  {done && (
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
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
        <AnimatePresence mode="wait">
          {statCard && statText && (
            <motion.div
              key="stat"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
              className="mx-4 mt-5 max-w-sm rounded-xl border border-white/15 bg-white/5 px-5 py-4 text-center backdrop-blur-sm"
            >
              <p className="font-display text-[13px] italic leading-relaxed text-white/85">
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
  setName,
  email,
  setEmail,
  whatsapp,
  setWhatsapp,
  onSubmit,
  onSkip,
  sending,
}: {
  name: string;
  setName: (s: string) => void;
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
  const nameRef = useRef<HTMLInputElement>(null);
  const whatsDigits = whatsapp.replace(/\D/g, "");
  const validWhatsapp = whatsDigits.length >= 10;
  const validName = name.trim().length >= 2;

  const handleSubmit = () => {
    if (!validName) {
      nameRef.current?.focus();
      return;
    }
    if (!validWhatsapp) {
      setHint(true);
      whatsappRef.current?.focus();
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
            text="Seu resultado está pronto."
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
          Antes de revelar, como posso te chamar?
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--amethyst)]">
          Quero falar com você pelo nome — e te mandar o resultado no WhatsApp pra reler quando a ansiedade apertar.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!sending) handleSubmit();
          }}
          className="mt-5 flex flex-col gap-3"
        >
          {/* Nome */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-xs font-medium text-[color:var(--amethyst)]">Seu primeiro nome</span>
              <span className="rdp-bob text-[10px] text-[color:var(--gold-warm)]" aria-hidden>↓</span>
            </div>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ana"
              autoFocus
              maxLength={40}
              className="w-full rounded-full border border-[color:var(--border)] bg-[color:var(--milk-warm)] px-5 py-3.5 text-sm text-[color:var(--deep-purple)] placeholder:text-[color:var(--lavender)] focus:border-[color:var(--lavender)] focus:outline-none focus:ring-4 focus:ring-[color:var(--lavender)]/20"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-xs font-medium text-[color:var(--amethyst)]">WhatsApp</span>
              <span className="text-[10px] text-[color:var(--gold-warm)]" aria-hidden>— receba seu diagnóstico</span>
            </div>
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
          </div>

          {/* CTA principal */}
          <motion.button
            type="submit"
            disabled={sending}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="rdp-btn-gradient-hover mt-2 inline-flex w-full items-center justify-center gap-2.5 rounded-full px-10 py-4.5 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_18px_40px_-18px_rgba(68,58,82,0.6)] disabled:opacity-50"
          >
            {sending ? "Revelando…" : "Revelar meu diagnóstico"}{" "}
            <span aria-hidden className="rdp-arrow-pulse">→</span>
          </motion.button>
        </form>

        {/* Pular */}
        <button
          type="button"
          onClick={onSkip}
          disabled={sending}
          className="mt-4 w-full text-center text-[13px] text-[color:var(--amethyst)] transition-colors hover:text-[color:var(--deep-purple)] disabled:opacity-50"
        >
          Só ver na tela
        </button>
      </motion.div>

      {/* Micro-CTA segurança */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-4 text-center text-xs text-[color:var(--amethyst)]/60"
      >
        Seus dados ficam seguros. Nada é compartilhado.
      </motion.p>
    </motion.section>
  );
}

/* ============================== AGE SCREEN ============================== */

function AgeScreen({
  age,
  setAge,
  onContinue,
}: {
  age: string;
  setAge: (s: string) => void;
  onContinue: (age: string) => void;
}) {
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const num = parseInt(age, 10);
    if (!age || isNaN(num) || num < 18 || num > 99) {
      setError("Digite uma idade entre 18 e 99.");
      inputRef.current?.focus();
      return;
    }
    setError("");
    onContinue(age);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 py-12 text-center"
    >
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--gold-warm)]"
      >
        Sua idade
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-4 font-display text-[28px] font-bold leading-tight text-[color:var(--deep-purple)] sm:text-[36px]"
      >
        Qual é a sua idade?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-4 max-w-sm text-balance text-base leading-relaxed text-[color:var(--amethyst)]"
      >
        Sua idade ajuda a contextualizar os dados reais que você verá na próxima etapa. O objetivo não é só diagnosticar, é mostrar que esse alarme interno tem nome.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="mt-8"
      >
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={18}
          max={99}
          value={age}
          onChange={(e) => { setAge(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="00"
          autoFocus
          className="w-28 rounded-2xl border border-[color:var(--border)] bg-white px-4 py-5 text-center font-display text-[40px] font-bold text-[color:var(--deep-purple)] placeholder:text-[color:var(--lavender)]/40 focus:border-[color:var(--gold-warm)] focus:outline-none focus:ring-4 focus:ring-[color:var(--gold-warm)]/20"
        />
        {error && (
          <p className="mt-2 text-xs text-red-400">{error}</p>
        )}
      </motion.div>

      <motion.button
        type="button"
        onClick={handleSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.4 }}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="rdp-gradient-cta mt-8 rounded-full px-10 py-4.5 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_18px_44px_-16px_rgba(201,168,118,0.55)]"
      >
        Continuar →
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-5 max-w-xs text-xs leading-relaxed text-[color:var(--amethyst)]/60"
      >
        Na próxima tela, você verá uma leitura curta com dados reais para aquecer sua consciência antes de continuar.
      </motion.p>
    </motion.section>
  );
}

/* ============================== ALERT SCREEN ============================== */

function AlertScreen({
  age,
  situacao,
  onContinue,
  onBackAge,
}: {
  age: string;
  situacao: string;
  onContinue: () => void;
  onBackAge: () => void;
}) {
  const numAge = parseInt(age, 10) || 33;
  const band = getAgeBand(numAge);
  const bandData = AGE_BANDS[band];
  const headline = ALERT_HEADLINES[situacao] ?? ALERT_HEADLINES["casada-filhos-pequenos"];
  const sub = ALERT_SUBS[situacao] ?? ALERT_SUBS["casada-filhos-pequenos"];
  const emotional = ALERT_EMOTIONAL[situacao] ?? ALERT_EMOTIONAL["casada-filhos-pequenos"];

  const bars = [
    { label: "Ansiedade na sua faixa etária", value: bandData.ansiedade },
    { label: "Sintomas depressivos na sua faixa", value: bandData.depressao },
    { label: "Mães em sobrecarga silenciosa", value: bandData.sobrecarga },
  ];

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-auto flex min-h-dvh max-w-lg flex-col items-center px-4 pb-40 pt-0"
    >
      {/* Banner topo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="rdp-alert-banner w-full rounded-b-2xl px-5 py-4 text-center"
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">
          ⚠ Alerta: O inimigo foi nomeado
        </p>
      </motion.div>

      {/* Headline */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-7 px-2 text-center font-display text-[22px] font-bold leading-tight text-[color:var(--deep-purple)] sm:text-[28px]"
      >
        {headline}
      </motion.h2>

      {/* Sub */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-3 px-2 text-center text-sm leading-relaxed text-[color:var(--amethyst)]"
      >
        {sub}
      </motion.p>

      {/* Faixa badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-[color:var(--milk-warm)] px-4 py-2 text-sm text-[color:var(--deep-purple)]"
      >
        <span className="font-bold">{numAge} anos</span>
        <span className="text-[color:var(--amethyst)]">·</span>
        <span>{bandData.label}</span>
      </motion.div>

      {/* Card dados — barras animadas */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="mt-6 w-full rounded-2xl border border-[color:var(--border)] bg-white p-5 shadow-sm"
      >
        <div className="space-y-4">
          {bars.map((bar, i) => (
            <div key={bar.label}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-xs text-[color:var(--amethyst)]">{bar.label}</span>
                <span className="text-xs font-bold text-[color:var(--deep-purple)]">{bar.value}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[color:var(--milk-warm)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${bar.value}%` }}
                  transition={{ delay: 1.0 + i * 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="rdp-alert-bar h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bloco emocional */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.5 }}
        className="mt-6 w-full rounded-2xl border border-[color:var(--gold-warm)]/30 bg-gradient-to-b from-[color:var(--milk-warm)] to-white p-5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[color:var(--gold-warm)]">
          O que isso tem causado dentro da sua casa?
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--deep-purple)]/80">
          {emotional}
        </p>
      </motion.div>

      {/* Disclaimer */}
      <p className="mt-6 text-center text-[10px] leading-relaxed text-[color:var(--amethyst)]/50">
        Fontes: CDC/NCHS 2022 · Pew Research 2023. Não substitui avaliação médica.
      </p>

      {/* CTA fixo bottom */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.0, duration: 0.4 }}
        style={{
          position: "fixed", insetInline: 0, bottom: 0, zIndex: 40,
          background: "linear-gradient(180deg, rgba(246,240,228,0), rgba(246,240,228,.95) 30%, #F6F0E4 60%)",
          padding: "28px 20px calc(16px + env(safe-area-inset-bottom))",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        }}
      >
        <motion.button
          type="button"
          onClick={onContinue}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="rdp-gradient-cta w-full max-w-md rounded-full px-8 py-4.5 text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_18px_44px_-16px_rgba(201,168,118,0.55)]"
          style={{ animation: "rdp-cta-pulse 2.5s ease-in-out infinite" }}
        >
          Continuar o quiz →
        </motion.button>
        <button
          type="button"
          onClick={onBackAge}
          className="text-xs text-[color:var(--amethyst)] transition-colors hover:text-[color:var(--deep-purple)]"
        >
          ← Rever minha idade
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
              Tivemos um probleminha ao carregar esta tela.
            </p>
            <p className="mt-1 text-sm text-[color:var(--deep-purple)]/70">
              Toque abaixo para recarregar — suas respostas estão salvas.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-[color:var(--gold-warm)] px-6 py-3 text-sm font-medium text-white"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}