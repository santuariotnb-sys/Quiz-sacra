import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertTriangle,
  Calendar,
  Clock,
  Heart,
  BookOpen,
  Brain,
  Video,
  ArrowRight,
  Lock,
} from "lucide-react";
import { buildKirvanoUrl } from "@/lib/utm";
import { getOrCreateExternalId, saveTrackingSession, trackInitiateCheckout } from "@/lib/tracking";
import { CheckoutModal } from "./CheckoutModal";
import type { OfferContent, OfferBullet } from "@/data/funil";
import chaveGratidaoMockup from "@/assets/chave-gratidao-mockup.webp";

type Props = {
  content: OfferContent;
  declineTo: string;
  showProcessing?: boolean;
  /** Dispara pixel Purchase ao carregar. Deve ser true APENAS na primeira view (upsell), NUNCA no downsell. */
  firePurchasePixel?: boolean;
};

const BULLET_ICON: Record<NonNullable<OfferBullet["icon"]>, typeof Calendar> = {
  video: Video,
  brain: Brain,
  calendar: Calendar,
  clock: Clock,
  heart: Heart,
  book: BookOpen,
};

/**
 * Dispara pixel Purchase UMA vez, com deduplicação via eventID.
 * - value vem do query param do redirect Kirvano (ex: ?value=47.00)
 * - eventID vem do transaction_id do Kirvano ou gera UUID
 * - Se value não existir na URL, dispara SEM value (não chumba valor falso)
 * - Guard: só dispara se flag firePurchasePixel=true (previne disparo no downsell)
 */
function firePixelPurchase() {
  try {
    const fbq = (window as any).fbq;
    if (!fbq) return;

    const params = new URLSearchParams(window.location.search);

    // Dedup: usa transaction_id do Kirvano se disponível, senão gera UUID
    const eventId =
      params.get("transaction_id") ||
      params.get("tid") ||
      crypto.randomUUID();

    // Guard: verifica se já disparou nesta sessão (reload protection)
    const dedupKey = `rdp_purchase_fired_${eventId}`;
    if (sessionStorage.getItem(dedupKey)) return;
    sessionStorage.setItem(dedupKey, "1");

    // Value: lê do Kirvano redirect param. Se não existir, dispara sem value.
    const rawValue = params.get("value") || params.get("amount");
    const purchaseData: Record<string, any> = {
      currency: "BRL",
      content_name: "Rotina de Paz",
      content_ids: ["rotina_de_paz"],
    };
    if (rawValue) {
      const parsed = parseFloat(rawValue);
      if (!isNaN(parsed) && parsed > 0) {
        purchaseData.value = parsed;
      }
    }

    fbq("track", "Purchase", purchaseData, { eventID: eventId });
  } catch {
    // Pixel nunca deve bloquear o fluxo
  }
}

export function OfferPage({
  content,
  declineTo,
  showProcessing = false,
  firePurchasePixel = false,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(showProcessing);
  const [step, setStep] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!showProcessing) return;
    const t1 = setTimeout(() => setStep(2), 600);
    const t2 = setTimeout(() => setIsProcessing(false), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [showProcessing]);

  // BUG 1 fix: pixel dispara UMA vez, só no upsell (não no downsell), com dedup
  useEffect(() => {
    if (firePurchasePixel) {
      firePixelPurchase();
    }
  }, [firePurchasePixel]);

  const handleAccept = async () => {
    const externalId = getOrCreateExternalId();
    // Fire-and-forget: salva tracking session para cruzar no webhook do upsell
    void saveTrackingSession(externalId).catch(() => {});
    // InitiateCheckout antes de abrir o modal (tick de 300ms para beacon sair)
    await trackInitiateCheckout(externalId, {
      contentName: content.offer.title,
      value: parseFloat(content.offer.price.replace(/[^\d,.]/g, "").replace(",", ".")) || undefined,
    });
    setCheckoutOpen(true);
  };

  const handleDecline = () => {
    window.location.href = declineTo;
  };

  const percent = Math.round(
    (content.cycle.progressDone / content.cycle.progressTotal) * 100,
  );
  const externalId = getOrCreateExternalId();
  const checkoutSrc = buildKirvanoUrl(content.checkoutUrl, { externalId });

  return (
    <div className="min-h-dvh bg-[color:var(--milk)] text-[color:var(--deep-purple)] flex flex-col">
      <TopBanner
        kind={content.topBanner.kind}
        label={content.topBanner.label}
        step={step}
      />

      <header className="border-b border-[color:var(--border)] bg-white/40 backdrop-blur-sm py-4">
        <div className="max-w-2xl mx-auto px-4 flex justify-center">
          <span className="font-display text-xl tracking-wide text-[color:var(--deep-purple)]">
            Rotina de Paz
          </span>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="processing"
                className="text-center py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="w-16 h-16 mx-auto mb-5 rounded-full border-2 border-[color:var(--lavender)]/30 border-t-[color:var(--deep-purple)] flex items-center justify-center animate-spin">
                  <Loader2 className="w-7 h-7 text-[color:var(--deep-purple)]" />
                </div>
                <p className="text-[color:var(--amethyst)] text-sm">
                  Sincronizando o seu acesso completo…
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.2, 0.7, 0.3, 1] }}
              >
                <div className="flex justify-center mb-5">
                  <Badge tone={content.badge.tone}>
                    {content.badge.text}
                  </Badge>
                </div>

                <div className="text-center mb-8">
                  <h1 className="font-display text-3xl sm:text-4xl leading-tight text-[color:var(--deep-purple)] mb-3">
                    {content.intro.headline}
                  </h1>
                  <p className="text-[color:var(--amethyst)] text-base sm:text-lg max-w-md mx-auto mb-3">
                    {content.intro.sub}
                  </p>
                  {(content.intro.hook || content.intro.hookHighlight) && (
                    <p className="text-[color:var(--deep-purple)] text-base sm:text-lg font-semibold leading-relaxed">
                      {content.intro.hook && (
                        <span className="block sm:inline">
                          {content.intro.hook}{" "}
                        </span>
                      )}
                      {content.intro.hookHighlight && (
                        <span
                          className="inline-block rounded-md px-2 py-0.5 font-bold text-[1.15em] text-[color:var(--deep-purple)]"
                          style={{
                            background:
                              "linear-gradient(90deg, var(--lavender) 0%, var(--gold-warm) 100%)",
                          }}
                        >
                          {content.intro.hookHighlight}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <Card delay={0.1}>
                  <p className="text-[color:var(--deep-purple)] text-sm sm:text-base leading-relaxed mb-2">
                    {content.cycle.title}
                    {content.cycle.titleHighlight && (
                      <span className="font-bold">
                        {content.cycle.titleHighlight}
                      </span>
                    )}
                  </p>
                  <p className="text-[color:var(--amethyst)] text-xs sm:text-sm mb-4">
                    {content.cycle.body}
                  </p>
                  <ProgressBar
                    done={content.cycle.progressDone}
                    total={content.cycle.progressTotal}
                    percent={percent}
                  />
                  {content.cycle.footnote && (
                    <p className="text-[color:var(--amethyst)] text-xs mt-3">
                      {content.cycle.footnote}
                    </p>
                  )}
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <CompareCard
                    tone="have"
                    title={content.compare.haveTitle}
                    text={content.compare.haveText}
                  />
                  <CompareCard
                    tone="missing"
                    title={content.compare.missingTitle}
                    text={content.compare.missingText}
                  />
                </div>

                {content.consequence && (
                  <Card delay={0.2} className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-5 h-5 text-[color:var(--gold-warm)]" />
                      <h3 className="text-[color:var(--deep-purple)] font-semibold text-sm sm:text-base">
                        {content.consequence.title}
                      </h3>
                    </div>
                    <div className="space-y-2.5 text-sm">
                      {content.consequence.steps.map((s) => (
                        <ConsequenceLine
                          key={s.text}
                          tone={s.tone}
                          text={s.text}
                        />
                      ))}
                    </div>
                  </Card>
                )}

                <p className="text-center text-[color:var(--amethyst)] text-sm sm:text-base italic mb-6 px-2">
                  {content.bridge}
                </p>

                <OfferCard content={content} onAccept={handleAccept} />

                <motion.button
                  onClick={handleDecline}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="w-full mt-5 px-6 py-4 rounded-2xl border-2 border-red-400/40 bg-red-50/50 text-red-600 text-sm sm:text-base font-medium hover:bg-red-100/50 hover:border-red-400/60 transition"
                >
                  ✕ {content.declineLabel}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        src={checkoutSrc}
      />
    </div>
  );
}

/* ========== Sub-componentes ========== */

function TopBanner({
  kind,
  label,
  step,
}: {
  kind: "loading" | "warning";
  label: string;
  step: number;
}) {
  if (kind === "loading") {
    return (
      <div className="relative z-10">
        <div
          className="py-3 px-4 text-center overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #FFD60A 0%, #FFB800 100%)",
            boxShadow: "0 4px 24px rgba(255,184,0,0.5)",
          }}
        >
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 text-[color:var(--deep-purple)]">
            <motion.span
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex"
            >
              <AlertTriangle className="w-[18px] h-[18px]" />
            </motion.span>
            <p className="text-xs sm:text-sm font-bold tracking-wide uppercase">
              {label}{" "}
              <span className="hidden sm:inline opacity-80">
                (passo {step} de 2)
              </span>
            </p>
          </div>
        </div>
        <div className="py-2 px-4 text-center bg-[color:var(--deep-purple)] text-white text-[11px] sm:text-xs font-medium tracking-wider">
          <Lock className="inline w-3 h-3 mr-1.5 -mt-0.5" />
          Não feche esta página até concluir a liberação
        </div>
      </div>
    );
  }
  return (
    <motion.div
      className="py-4 px-4 text-center bg-[color:var(--deep-purple)] text-white"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.p
        className="font-display text-base sm:text-lg tracking-wide"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ✋ {label}
      </motion.p>
    </motion.div>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "success" | "warning";
  children: React.ReactNode;
}) {
  const styles =
    tone === "success"
      ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700"
      : "bg-amber-500/10 border-amber-500/40 text-amber-700";
  const Icon = tone === "success" ? Check : AlertTriangle;
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-medium ${styles}`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </motion.div>
  );
}

function Card({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-2xl p-5 sm:p-6 mb-5 bg-white border border-[color:var(--border)] shadow-sm ${className}`}
    >
      {children}
    </motion.div>
  );
}

function ProgressBar({
  done,
  total,
  percent,
}: {
  done: number;
  total: number;
  percent: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-[color:var(--milk-warm)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, var(--lavender) 0%, var(--rose-dust) 45%, var(--gold-warm) 100%)",
          }}
          initial={{ width: "0%" }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </div>
      <span className="text-[color:var(--deep-purple)] text-sm font-semibold whitespace-nowrap">
        {done}/{total}
      </span>
    </div>
  );
}

function CompareCard({
  tone,
  title,
  text,
}: {
  tone: "have" | "missing";
  title: string;
  text: string;
}) {
  const accent =
    tone === "have"
      ? "text-emerald-700 border-emerald-500/30"
      : "text-[color:var(--deep-purple)] border-[color:var(--lavender)]/40";
  const icon = tone === "have" ? "✓" : "+";
  return (
    <div className={`p-4 rounded-xl bg-white border ${accent}`}>
      <p className={`text-xs sm:text-sm font-semibold mb-2 ${accent}`}>
        {title}
      </p>
      <p className="text-[color:var(--deep-purple)] text-sm flex items-start gap-2">
        <span className={`flex-shrink-0 font-bold ${accent}`}>{icon}</span>
        <span>{text}</span>
      </p>
    </div>
  );
}

function ConsequenceLine({
  tone,
  text,
}: {
  tone: "good" | "warn" | "bad";
  text: string;
}) {
  const map = {
    good: { color: "text-emerald-600", icon: "✓" },
    warn: { color: "text-amber-600", icon: "⚠" },
    bad: { color: "text-red-500", icon: "✕" },
  } as const;
  const m = map[tone];
  return (
    <p className="flex items-start gap-2 text-[color:var(--deep-purple)]">
      <span className={`flex-shrink-0 font-bold ${m.color}`}>{m.icon}</span>
      <span>{text}</span>
    </p>
  );
}

function OfferCard({
  content,
  onAccept,
}: {
  content: OfferContent;
  onAccept: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.35 }}
      className="relative rounded-3xl bg-white border border-[color:var(--lavender)]/40 p-6 sm:p-8 overflow-hidden rdp-shadow-soft"
    >
      <div
        className="absolute top-0 inset-x-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--gold), transparent)",
        }}
      />

      <div className="flex justify-center mb-4">
        <motion.div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--lavender)]/50 bg-[color:var(--milk-warm)]"
          animate={{
            boxShadow: [
              "0 0 8px rgba(201,168,118,0.2)",
              "0 0 20px rgba(201,168,118,0.4)",
              "0 0 8px rgba(201,168,118,0.2)",
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Sparkles className="w-4 h-4 text-[color:var(--gold-warm)]" />
          <span className="text-[color:var(--deep-purple)] text-xs sm:text-sm font-semibold tracking-wide uppercase">
            {content.offer.eyebrow}
          </span>
        </motion.div>
      </div>

      <h2 className="font-display text-2xl sm:text-3xl text-center text-[color:var(--deep-purple)] leading-tight mb-2">
        {content.offer.title}
      </h2>
      <p className="text-center text-[color:var(--amethyst)] text-sm sm:text-base mb-5">
        {content.offer.subtitle}
      </p>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
        {content.offer.bullets.map((b, i) => {
          const Icon = b.icon ? BULLET_ICON[b.icon] : Check;
          return (
            <motion.li
              key={b.text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.07 }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-[color:var(--milk-warm)] border border-[color:var(--border)]"
            >
              <div className="w-7 h-7 rounded-md bg-[color:var(--rose-soft)] flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-[color:var(--deep-purple)]" />
              </div>
              <span className="text-xs sm:text-sm text-[color:var(--deep-purple)] leading-snug">
                {b.text}
              </span>
            </motion.li>
          );
        })}
      </ul>

      <motion.img
        src={chaveGratidaoMockup}
        alt={content.offer.title}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="w-full max-w-md mx-auto rounded-2xl mb-6"
      />

      <div className="text-center mb-5">
        {content.offer.priceFrom && (
          <div className="text-xs text-[color:var(--amethyst)] line-through">
            de {content.offer.priceFrom}
          </div>
        )}
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-[color:var(--amethyst)] text-xl">por</span>
          <span className="font-display text-5xl sm:text-6xl font-semibold text-[color:var(--deep-purple)] ml-2">
            {content.offer.price}
          </span>
        </div>
        {content.offer.installments && (
          <div className="text-xs text-[color:var(--amethyst)] mt-1">
            {content.offer.installments}
          </div>
        )}
      </div>

      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-2xl blur-xl"
          style={{
            background:
              "linear-gradient(135deg, var(--gold), var(--gold-warm))",
          }}
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <motion.button
          onClick={onAccept}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rdp-btn-gradient-hover relative w-full py-4 sm:py-5 rounded-2xl font-semibold text-base sm:text-lg text-white overflow-hidden flex items-center justify-center gap-2"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.2 }}
          />
          <Lock className="w-4 h-4 relative z-10" />
          <span className="relative z-10">{content.offer.ctaLabel}</span>
          <motion.span
            className="relative z-10"
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            <ArrowRight className="w-5 h-5" />
          </motion.span>
        </motion.button>
      </div>

      {content.offer.guarantee && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-[color:var(--amethyst)] mt-4">
          <ShieldCheck className="w-4 h-4" />
          {content.offer.guarantee}
        </div>
      )}
    </motion.div>
  );
}
