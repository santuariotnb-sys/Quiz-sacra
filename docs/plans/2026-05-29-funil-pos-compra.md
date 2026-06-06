# Funil Pós-Compra (Obrigado + Upsell + Downsell)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar página de obrigado com pixel Purchase, upsell (R$67) e downsell (R$37) ao Quiz Sacra, com checkout Kirvano em modal inline (sem redirecionar).

**Architecture:** Após compra no Kirvano, redirect para `/sacra/obrigado` que dispara pixel Purchase e exibe upsell com animação de "liberando acesso". Aceitar abre modal com iframe Kirvano. Recusar vai para downsell (mesma página, `?offer=downsell`). Recusar downsell redireciona para app login.

**Tech Stack:** React 19, TanStack Router (file-based, basepath `/sacra`), Framer Motion, Tailwind 4, Lucide React (novo), Meta Pixel

---

## Contexto Importante

- **Projeto:** `~/Quiz-sacra/` — SPA standalone deployado em Cloudflare Pages como subdiretório `/sacra/` do `rotina-de-paz`
- **Basepath:** Todas as rotas são relativas a `/sacra/` (ex: `/sacra/obrigado`)
- **Deploy:** Build → copiar dist para `~/rotina-de-paz/dist/sacra/` → criar fallback HTML por rota → wrangler deploy `--branch=main`
- **Material de origem:** `~/Downloads/Upsell -QUIZ:SACRA  /` — gerado por Lovable, precisa limpeza de metadados (imports lovable, SSR patterns, TanStack Start)
- **Pixel:** Não está instalado no index.html — precisa adicionar
- **Cover image:** `chave-gratidao-cover.png` NÃO existe nos assets — precisa ser criada/fornecida pelo usuário (plano inclui placeholder)
- **Kirvano URLs:** Precisam ser configuradas em `.env` (`VITE_KIRVANO_UPSELL_URL`, `VITE_KIRVANO_DOWNSELL_URL`)

## File Map

| Ação | Arquivo | Responsabilidade |
|------|---------|------------------|
| Criar | `src/data/funil.ts` | Dados de conteúdo das ofertas (upsell + downsell) |
| Criar | `src/components/funil/CheckoutModal.tsx` | Modal com iframe Kirvano (substitui shadcn Dialog) |
| Criar | `src/components/funil/OfferPage.tsx` | Componente genérico da página de oferta |
| Criar | `src/routes/obrigado.tsx` | Rota `/sacra/obrigado` — thank you + upsell/downsell |
| Modificar | `index.html` | Adicionar Meta Pixel base code |
| Modificar | `package.json` | Adicionar `lucide-react` |
| Modificar | `Guia.md` | Documentar novas rotas e fluxo |

---

### Task 1: Instalar dependência lucide-react

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar lucide-react**

```bash
cd ~/Quiz-sacra && npm install lucide-react
```

- [ ] **Step 2: Verificar instalação**

```bash
cd ~/Quiz-sacra && node -e "require('lucide-react')" 2>&1 || echo "ESM only - OK"
```

Expected: módulo ESM, OK.

- [ ] **Step 3: Commit**

```bash
cd ~/Quiz-sacra && git add package.json package-lock.json && git commit -m "deps: add lucide-react for funil icons"
```

---

### Task 2: Adicionar Meta Pixel ao index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Adicionar pixel base code no `<head>`**

No `index.html`, adicionar antes do `</head>`:

```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'SEU_PIXEL_ID');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=SEU_PIXEL_ID&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
```

**ATENÇÃO:** Substituir `SEU_PIXEL_ID` pelo ID real do pixel do usuário.

- [ ] **Step 2: Commit**

```bash
cd ~/Quiz-sacra && git add index.html && git commit -m "feat: add Meta Pixel base code"
```

---

### Task 3: Criar `src/data/funil.ts`

**Files:**
- Create: `src/data/funil.ts`

- [ ] **Step 1: Criar arquivo de dados do funil**

Copiar de `~/Downloads/Upsell -QUIZ:SACRA  /funil.ts` com as seguintes limpezas:
- Remover import de asset `chave-gratidao-cover.png` (usar string path até asset existir)
- Remover qualquer referência a Lovable
- Manter `import.meta.env` para URLs Kirvano

```typescript
// src/data/funil.ts
// Funil pós-quiz — Upsell + Downsell
// Tom de guia feminina, vocabulário do alarme/automático/ciclo.

export type OfferBullet = {
  icon?: "video" | "brain" | "calendar" | "clock" | "heart" | "book";
  text: string;
};

export type OfferContent = {
  id: string;
  topBanner: { kind: "loading" | "warning"; label: string };
  badge: { tone: "success" | "warning"; text: string };
  intro: {
    headline: string;
    sub: string;
    hook?: string;
    hookHighlight?: string;
  };
  cycle: {
    title: string;
    body: string;
    progressDone: number;
    progressTotal: number;
    footnote?: string;
    titleHighlight?: string;
  };
  compare: {
    haveTitle: string;
    haveText: string;
    missingTitle: string;
    missingText: string;
  };
  consequence?: {
    title: string;
    steps: { tone: "good" | "warn" | "bad"; text: string }[];
  };
  bridge: string;
  offer: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cover?: string;
    coverAlt?: string;
    bullets: OfferBullet[];
    priceFrom?: string;
    price: string;
    installments?: string;
    ctaLabel: string;
    guarantee?: string;
  };
  declineLabel: string;
  checkoutUrl: string;
};

export const UPSELL_CONTENT: OfferContent = {
  id: "upsell-chave-gratidao",
  topBanner: {
    kind: "loading",
    label: "AGUARDE: liberando o seu acesso completo",
  },
  badge: { tone: "success", text: "Sua Rotina de Paz foi liberada" },
  intro: {
    headline: "Você já fez o mais difícil. Falta só o mais importante.",
    sub: "Você garantiu A Jornada — a prática que desarma o alarme. Isso já vai te dar alívio nos próximos dias.",
    hook: "Agora me dá 60 segundos só pra você não parar antes da hora.",
  },
  cycle: {
    title: "A maioria das mulheres precisa de ",
    titleHighlight: "21 dias pra desativar o alarme de vez.",
    body: "Não é mística — é o tempo que o corpo leva pra deixar de operar no automático antigo e firmar o novo padrão.",
    progressDone: 1,
    progressTotal: 2,
    footnote:
      "Você já tem a prática. Falta o ensino que firma o novo padrão.",
  },
  compare: {
    haveTitle: "O que você já tem",
    haveText: "A Jornada — a prática que desarma o alarme.",
    missingTitle: "O que ainda falta",
    missingText: "As 7 videoaulas de ensino que dão raiz à prática.",
  },
  consequence: {
    title: "O que costuma acontecer quando se para só na prática:",
    steps: [
      { tone: "good", text: "Primeiros dias: alívio real, o alarme desliga" },
      {
        tone: "warn",
        text: "Semanas seguintes: o corpo tenta retomar o automático antigo",
      },
      {
        tone: "bad",
        text: "Sem o ensino que sustenta: recaída em 30–60 dias",
      },
    ],
  },
  bridge:
    "Não deixe o alívio virar ilusão de cura — leve o ensino por menos do que um almoço fora.",
  offer: {
    eyebrow: "Oferta única desta página",
    title: "A Chave da Gratidão",
    subtitle:
      "7 videoaulas de fé e transformação — o ensino que dá raiz à sua Rotina de Paz, agora por um valor que cabe.",
    bullets: [
      {
        icon: "video",
        text: "7 videoaulas de 15–20 min (ensino bíblico aplicado)",
      },
      {
        icon: "heart",
        text: "Fé aplicada à rotina — pra firmar o novo padrão",
      },
      {
        icon: "clock",
        text: "Acesso vitalício no app — no seu tempo",
      },
    ],
    priceFrom: "R$ 197",
    price: "R$ 67",
    installments: "ou 6x de R$ 12,90 sem juros",
    ctaLabel: "Sim, quero A Chave da Gratidão",
    guarantee: "7 dias de garantia incondicional",
  },
  declineLabel: "Não, vou seguir só com a Jornada",
  checkoutUrl:
    (import.meta.env.VITE_KIRVANO_UPSELL_URL as string | undefined) ||
    "https://pay.kirvano.com/sua-oferta-upsell",
};

export const DOWNSELL_CONTENT: OfferContent = {
  id: "downsell-mini-jornada",
  topBanner: {
    kind: "warning",
    label: "Espera — não posso deixar você sem o ensino",
  },
  badge: { tone: "warning", text: "Oferta única só agora nesta página" },
  intro: {
    headline: "Eu entendo que o custo pode apertar.",
    sub: "Mas não posso deixar você sem o ensino que sustenta a prática. A Jornada vai te dar o alívio — mas é A Chave da Gratidão que ensina o seu coração a NÃO voltar pro automático antigo.",
    hook: "Por isso vou fazer uma oferta única agora:",
    hookHighlight: "R$ 37,00. Te ajuda?",
  },
  cycle: {
    title: "Você está bem no meio do caminho.",
    body: "Já tem a prática (a Jornada). Falta o ensino que dá profundidade — sem ele, o alívio vira lembrança em poucas semanas.",
    progressDone: 1,
    progressTotal: 2,
    footnote:
      "Falta só a segunda metade: o ensino que firma o novo padrão.",
  },
  compare: {
    haveTitle: "O que você já tem",
    haveText: "A Jornada — a prática que desarma o alarme.",
    missingTitle: "O que ainda falta",
    missingText: "As 7 videoaulas de ensino que dão raiz à prática.",
  },
  consequence: {
    title: "O que costuma acontecer quando se para só na prática:",
    steps: [
      { tone: "good", text: "Primeiros dias: alívio real, o alarme desliga" },
      {
        tone: "warn",
        text: "Semanas seguintes: o corpo tenta retomar o automático antigo",
      },
      {
        tone: "bad",
        text: "Sem o ensino que sustenta: recaída em 30–60 dias",
      },
    ],
  },
  bridge:
    "Não deixe o alívio virar ilusão de cura — leve o ensino por menos do que um almoço fora.",
  offer: {
    eyebrow: "Oferta única desta página",
    title: "A Chave da Gratidão",
    subtitle:
      "7 videoaulas de fé e transformação — o ensino que dá raiz à sua Rotina de Paz, agora por um valor que cabe.",
    bullets: [
      {
        icon: "video",
        text: "7 videoaulas de 15–20 min (ensino bíblico aplicado)",
      },
      {
        icon: "heart",
        text: "Fé aplicada à rotina — pra firmar o novo padrão",
      },
      {
        icon: "clock",
        text: "Acesso vitalício no app — no seu tempo",
      },
    ],
    priceFrom: "R$ 67",
    price: "R$ 37",
    installments: "ou 2x de R$ 19,50 sem juros",
    ctaLabel: "Sim, quero A Chave da Gratidão por R$ 37",
    guarantee: "7 dias de garantia",
  },
  declineLabel: "Não, prefiro seguir sem o ensino agora",
  checkoutUrl:
    (import.meta.env.VITE_KIRVANO_DOWNSELL_URL as string | undefined) ||
    "https://pay.kirvano.com/sua-oferta-downsell",
};
```

- [ ] **Step 2: Commit**

```bash
cd ~/Quiz-sacra && git add src/data/funil.ts && git commit -m "feat: add funil data (upsell + downsell content)"
```

---

### Task 4: Criar `src/components/funil/CheckoutModal.tsx`

**Files:**
- Create: `src/components/funil/CheckoutModal.tsx`

Substitui o shadcn `Dialog` por um modal nativo leve (sem dependência Radix).

- [ ] **Step 1: Criar o modal**

```tsx
// src/components/funil/CheckoutModal.tsx
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  src: string;
};

export function CheckoutModal({ open, onClose, src }: Props) {
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3"
          onClick={(e) => {
            if (e.target === overlayRef.current) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-3xl h-[90vh] rounded-2xl overflow-hidden bg-[color:var(--milk)] shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[color:var(--deep-purple)] shadow-sm hover:bg-white transition"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[color:var(--milk)] z-[5]">
                <Loader2 className="w-8 h-8 animate-spin text-[color:var(--amethyst)]" />
                <p className="text-sm text-[color:var(--amethyst)]">
                  Carregando checkout seguro…
                </p>
              </div>
            )}

            <iframe
              src={open ? src : "about:blank"}
              title="Checkout Kirvano"
              onLoad={() => setLoading(false)}
              className="w-full h-full border-0"
              allow="payment *"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/Quiz-sacra && mkdir -p src/components/funil && git add src/components/funil/CheckoutModal.tsx && git commit -m "feat: add CheckoutModal for Kirvano iframe embed"
```

---

### Task 5: Criar `src/components/funil/OfferPage.tsx`

**Files:**
- Create: `src/components/funil/OfferPage.tsx`

Adaptado do material original. Mudanças vs original:
- Substitui `Dialog`/`DialogContent`/`DialogTitle` por `CheckoutModal`
- Usa palette do Quiz Sacra (CSS vars: `--deep-purple`, `--amethyst`, `--gold-warm`, `--lavender`, etc)
- Remove qualquer import/referência Lovable
- Remove variáveis CSS não definidas (`--gold-vivid`, `--primary`, `--muted-foreground`, etc) — usa vars existentes

- [ ] **Step 1: Criar o componente OfferPage**

```tsx
// src/components/funil/OfferPage.tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
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
import { CheckoutModal } from "./CheckoutModal";
import type { OfferContent, OfferBullet } from "@/data/funil";

type Props = {
  content: OfferContent;
  declineTo: string;
  showProcessing?: boolean;
};

const BULLET_ICON: Record<NonNullable<OfferBullet["icon"]>, typeof Calendar> = {
  video: Video,
  brain: Brain,
  calendar: Calendar,
  clock: Clock,
  heart: Heart,
  book: BookOpen,
};

export function OfferPage({ content, declineTo, showProcessing = false }: Props) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(showProcessing);
  const [step, setStep] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!showProcessing) return;
    const t1 = setTimeout(() => setStep(2), 600);
    const t2 = setTimeout(() => setIsProcessing(false), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [showProcessing]);

  // Dispara pixel Purchase quando a página carrega (= compra confirmada pelo Kirvano)
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("track", "Purchase", {
          value: 67.0,
          currency: "BRL",
          content_name: "Rotina de Paz",
        });
      }
    } catch {}
  }, []);

  const handleAccept = () => setCheckoutOpen(true);
  const handleDecline = () => navigate({ to: declineTo });
  const percent = Math.round(
    (content.cycle.progressDone / content.cycle.progressTotal) * 100,
  );
  const checkoutSrc = buildKirvanoUrl(content.checkoutUrl);

  return (
    <div className="min-h-dvh bg-[color:var(--milk)] text-[color:var(--deep-purple)] flex flex-col">
      {/* Top banner */}
      <TopBanner kind={content.topBanner.kind} label={content.topBanner.label} step={step} />

      {/* Header */}
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
                {/* Badge */}
                <div className="flex justify-center mb-5">
                  <Badge tone={content.badge.tone}>{content.badge.text}</Badge>
                </div>

                {/* Intro */}
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
                        <span className="block sm:inline">{content.intro.hook} </span>
                      )}
                      {content.intro.hookHighlight && (
                        <span className="inline-block rounded-md px-2 py-0.5 font-bold text-[1.15em] text-[color:var(--deep-purple)]" style={{ background: "linear-gradient(90deg, var(--lavender) 0%, var(--gold-warm) 100%)" }}>
                          {content.intro.hookHighlight}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Cycle card */}
                <Card delay={0.1}>
                  <p className="text-[color:var(--deep-purple)] text-sm sm:text-base leading-relaxed mb-2">
                    {content.cycle.title}
                    {content.cycle.titleHighlight && <span className="font-bold">{content.cycle.titleHighlight}</span>}
                  </p>
                  <p className="text-[color:var(--amethyst)] text-xs sm:text-sm mb-4">{content.cycle.body}</p>
                  <ProgressBar done={content.cycle.progressDone} total={content.cycle.progressTotal} percent={percent} />
                  {content.cycle.footnote && <p className="text-[color:var(--amethyst)] text-xs mt-3">{content.cycle.footnote}</p>}
                </Card>

                {/* Compare grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <CompareCard tone="have" title={content.compare.haveTitle} text={content.compare.haveText} />
                  <CompareCard tone="missing" title={content.compare.missingTitle} text={content.compare.missingText} />
                </div>

                {/* Consequence */}
                {content.consequence && (
                  <Card delay={0.2} className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-5 h-5 text-[color:var(--gold-warm)]" />
                      <h3 className="text-[color:var(--deep-purple)] font-semibold text-sm sm:text-base">{content.consequence.title}</h3>
                    </div>
                    <div className="space-y-2.5 text-sm">
                      {content.consequence.steps.map((s) => (
                        <ConsequenceLine key={s.text} tone={s.tone} text={s.text} />
                      ))}
                    </div>
                  </Card>
                )}

                {/* Bridge */}
                <p className="text-center text-[color:var(--amethyst)] text-sm sm:text-base italic mb-6 px-2">{content.bridge}</p>

                {/* Offer card */}
                <OfferCard content={content} onAccept={handleAccept} />

                {/* Decline */}
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

      {/* Checkout modal */}
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} src={checkoutSrc} />
    </div>
  );
}

/* ========== Sub-componentes ========== */

function TopBanner({ kind, label, step }: { kind: "loading" | "warning"; label: string; step: number }) {
  if (kind === "loading") {
    return (
      <div className="relative z-10">
        <div className="py-3 px-4 text-center overflow-hidden" style={{ background: "linear-gradient(135deg, var(--gold-warm) 0%, var(--gold) 100%)", boxShadow: "0 4px 24px rgba(201,168,118,0.4)" }}>
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 text-[color:var(--deep-purple)]">
            <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="inline-flex">
              <AlertTriangle className="w-4 h-4" />
            </motion.span>
            <p className="text-xs sm:text-sm font-bold tracking-wide uppercase">
              {label} <span className="hidden sm:inline opacity-80">(passo {step} de 2)</span>
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
    <motion.div className="py-4 px-4 text-center bg-[color:var(--deep-purple)] text-white" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <motion.p className="font-display text-base sm:text-lg tracking-wide" animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity }}>
        ✋ {label}
      </motion.p>
    </motion.div>
  );
}

function Badge({ tone, children }: { tone: "success" | "warning"; children: React.ReactNode }) {
  const styles = tone === "success"
    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700"
    : "bg-amber-500/10 border-amber-500/40 text-amber-700";
  const Icon = tone === "success" ? Check : AlertTriangle;
  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 22 }} className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-medium ${styles}`}>
      <Icon className="w-4 h-4" />
      {children}
    </motion.div>
  );
}

function Card({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className={`rounded-2xl p-5 sm:p-6 mb-5 bg-white border border-[color:var(--border)] shadow-sm ${className}`}>
      {children}
    </motion.div>
  );
}

function ProgressBar({ done, total, percent }: { done: number; total: number; percent: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-[color:var(--milk-warm)] overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, var(--lavender) 0%, var(--rose-dust) 45%, var(--gold-warm) 100%)" }} initial={{ width: "0%" }} animate={{ width: `${percent}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.3 }} />
      </div>
      <span className="text-[color:var(--deep-purple)] text-sm font-semibold whitespace-nowrap">{done}/{total}</span>
    </div>
  );
}

function CompareCard({ tone, title, text }: { tone: "have" | "missing"; title: string; text: string }) {
  const accent = tone === "have" ? "text-emerald-700 border-emerald-500/30" : "text-[color:var(--deep-purple)] border-[color:var(--lavender)]/40";
  const icon = tone === "have" ? "✓" : "+";
  return (
    <div className={`p-4 rounded-xl bg-white border ${accent}`}>
      <p className={`text-xs sm:text-sm font-semibold mb-2 ${accent}`}>{title}</p>
      <p className="text-[color:var(--deep-purple)] text-sm flex items-start gap-2">
        <span className={`flex-shrink-0 font-bold ${accent}`}>{icon}</span>
        <span>{text}</span>
      </p>
    </div>
  );
}

function ConsequenceLine({ tone, text }: { tone: "good" | "warn" | "bad"; text: string }) {
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

function OfferCard({ content, onAccept }: { content: OfferContent; onAccept: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }} className="relative rounded-3xl bg-white border border-[color:var(--lavender)]/40 p-6 sm:p-8 overflow-hidden rdp-shadow-soft">
      <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, var(--gold), transparent)" }} />

      <div className="flex justify-center mb-4">
        <motion.div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[color:var(--lavender)]/50 bg-[color:var(--milk-warm)]" animate={{ boxShadow: ["0 0 8px rgba(201,168,118,0.2)", "0 0 20px rgba(201,168,118,0.4)", "0 0 8px rgba(201,168,118,0.2)"] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <Sparkles className="w-4 h-4 text-[color:var(--gold-warm)]" />
          <span className="text-[color:var(--deep-purple)] text-xs sm:text-sm font-semibold tracking-wide uppercase">{content.offer.eyebrow}</span>
        </motion.div>
      </div>

      <h2 className="font-display text-2xl sm:text-3xl text-center text-[color:var(--deep-purple)] leading-tight mb-2">{content.offer.title}</h2>
      <p className="text-center text-[color:var(--amethyst)] text-sm sm:text-base mb-5">{content.offer.subtitle}</p>

      {content.offer.cover && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 }} className="relative mx-auto mb-6 w-full max-w-xs rounded-2xl overflow-hidden border border-[color:var(--lavender)]/40 rdp-shadow-soft">
          <img src={content.offer.cover} alt={content.offer.coverAlt ?? content.offer.title} className="block w-full h-auto" loading="lazy" />
        </motion.div>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
        {content.offer.bullets.map((b, i) => {
          const Icon = b.icon ? BULLET_ICON[b.icon] : Check;
          return (
            <motion.li key={b.text} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.07 }} className="flex items-center gap-2.5 p-3 rounded-xl bg-[color:var(--milk-warm)] border border-[color:var(--border)]">
              <div className="w-7 h-7 rounded-md bg-[color:var(--rose-soft)] flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-[color:var(--deep-purple)]" />
              </div>
              <span className="text-xs sm:text-sm text-[color:var(--deep-purple)] leading-snug">{b.text}</span>
            </motion.li>
          );
        })}
      </ul>

      <div className="text-center mb-5">
        {content.offer.priceFrom && <div className="text-xs text-[color:var(--amethyst)] line-through">de {content.offer.priceFrom}</div>}
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-[color:var(--amethyst)] text-xl">por</span>
          <span className="font-display text-5xl sm:text-6xl font-semibold text-[color:var(--deep-purple)] ml-2">{content.offer.price}</span>
        </div>
        {content.offer.installments && <div className="text-xs text-[color:var(--amethyst)] mt-1">{content.offer.installments}</div>}
      </div>

      {/* CTA */}
      <div className="relative">
        <motion.div className="absolute inset-0 rounded-2xl blur-xl" style={{ background: "linear-gradient(135deg, var(--gold), var(--gold-warm))" }} animate={{ opacity: [0.25, 0.5, 0.25] }} transition={{ duration: 2.5, repeat: Infinity }} />
        <motion.button onClick={onAccept} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="rdp-btn-gradient-hover relative w-full py-4 sm:py-5 rounded-2xl font-semibold text-base sm:text-lg text-white overflow-hidden flex items-center justify-center gap-2">
          <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" initial={{ x: "-100%" }} animate={{ x: "200%" }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.2 }} />
          <Lock className="w-4 h-4 relative z-10" />
          <span className="relative z-10">{content.offer.ctaLabel}</span>
          <motion.span className="relative z-10" animate={{ x: [0, 5, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
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
```

- [ ] **Step 2: Commit**

```bash
cd ~/Quiz-sacra && git add src/components/funil/OfferPage.tsx && git commit -m "feat: add OfferPage component (upsell/downsell)"
```

---

### Task 6: Criar rota `src/routes/obrigado.tsx`

**Files:**
- Create: `src/routes/obrigado.tsx`

Rota `/sacra/obrigado` — combina thank you + upsell. Search param `?offer=downsell` para downsell.

- [ ] **Step 1: Criar a rota**

```tsx
// src/routes/obrigado.tsx
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { OfferPage } from "@/components/funil/OfferPage";
import { UPSELL_CONTENT, DOWNSELL_CONTENT } from "@/data/funil";

export const Route = createFileRoute("/obrigado")({
  validateSearch: (search: Record<string, unknown>) => ({
    offer: (search.offer as string) === "downsell" ? "downsell" as const : "upsell" as const,
  }),
  head: ({ match }) => {
    const isDownsell = match.search.offer === "downsell";
    return {
      meta: [
        {
          title: isDownsell
            ? "Última chance — Rotina de Paz"
            : "Oferta exclusiva — Rotina de Paz",
        },
        { name: "robots", content: "noindex,nofollow" },
      ],
    };
  },
  component: ObrigadoPage,
});

function ObrigadoPage() {
  const { offer } = useSearch({ from: "/obrigado" });
  const isDownsell = offer === "downsell";

  return (
    <OfferPage
      content={isDownsell ? DOWNSELL_CONTENT : UPSELL_CONTENT}
      declineTo={isDownsell ? "https://rotina-de-paz-app.vercel.app/login" : "/obrigado?offer=downsell"}
      showProcessing={!isDownsell}
    />
  );
}
```

**Nota:** O `declineTo` do downsell aponta para o app login (URL externa). O `navigate()` no OfferPage vai precisar de um ajuste para URLs externas — quando `declineTo` começa com `http`, usar `window.location.href` em vez de `navigate()`.

- [ ] **Step 2: Ajustar OfferPage para suportar URLs externas no decline**

No `src/components/funil/OfferPage.tsx`, mudar o `handleDecline`:

```tsx
  const handleDecline = () => {
    if (declineTo.startsWith("http")) {
      window.location.href = declineTo;
    } else {
      navigate({ to: declineTo });
    }
  };
```

- [ ] **Step 3: Rodar dev server e verificar que a rota carrega**

```bash
cd ~/Quiz-sacra && npm run dev
```

Acessar `http://localhost:5174/sacra/obrigado` — deve mostrar upsell.
Acessar `http://localhost:5174/sacra/obrigado?offer=downsell` — deve mostrar downsell.

- [ ] **Step 4: Commit**

```bash
cd ~/Quiz-sacra && git add src/routes/obrigado.tsx src/components/funil/OfferPage.tsx && git commit -m "feat: add obrigado route with upsell/downsell flow"
```

---

### Task 7: Deploy com novas rotas

**Files:**
- Modify: deploy script (manual)

- [ ] **Step 1: Build**

```bash
cd ~/Quiz-sacra && npm run build
```

- [ ] **Step 2: Copiar dist e criar SPA fallbacks**

```bash
rm -rf ~/rotina-de-paz/dist/sacra
cp -r ~/Quiz-sacra/dist/ ~/rotina-de-paz/dist/sacra/

# SPA fallbacks para cada sub-rota
for route in quiz quiz-sacra obrigado; do
  mkdir -p ~/rotina-de-paz/dist/sacra/$route
  cp ~/rotina-de-paz/dist/sacra/index.html ~/rotina-de-paz/dist/sacra/$route/index.html
done
```

- [ ] **Step 3: Deploy para produção**

```bash
cd ~/rotina-de-paz && npx wrangler pages deploy dist --project-name=rotina-de-paz --branch=main --commit-dirty=true
```

- [ ] **Step 4: Verificar em produção**

Acessar `rotinadepaz.com.br/sacra/obrigado` — deve carregar upsell.

- [ ] **Step 5: Configurar Kirvano**

No painel Kirvano, configurar a URL de redirecionamento pós-compra para:
`https://rotinadepaz.com.br/sacra/obrigado`

---

### Task 8: Atualizar Guia.md

**Files:**
- Modify: `Guia.md`

- [ ] **Step 1: Adicionar novas rotas à tabela**

Na seção "Rotas" do Quiz Sacra, adicionar:

```markdown
| `/sacra/obrigado` | `src/routes/obrigado.tsx` | Thank you + Upsell (R$67) |
| `/sacra/obrigado?offer=downsell` | `src/routes/obrigado.tsx` | Downsell (R$37) |
```

Na seção "Arquivos-chave":

```markdown
├── components/funil/
│   ├── OfferPage.tsx    → Página genérica de oferta (upsell/downsell)
│   └── CheckoutModal.tsx → Modal com iframe Kirvano
├── data/funil.ts        → Conteúdo das ofertas (copy, preços, bullets)
```

Na seção "Config", adicionar:

```markdown
.env → VITE_KIRVANO_UPSELL_URL, VITE_KIRVANO_DOWNSELL_URL
```

Na seção "Build & Deploy", atualizar o script para incluir `obrigado` no loop de fallbacks.

- [ ] **Step 2: Commit**

```bash
cd ~/Quiz-sacra && git add Guia.md && git commit -m "docs: update Guia.md with funil routes"
```

---

## Checklist pré-implementação

- [ ] **Pixel ID:** Obter o ID real do Meta Pixel e substituir `SEU_PIXEL_ID` no `index.html`
- [ ] **URLs Kirvano:** Obter as URLs de checkout da oferta de upsell e downsell no Kirvano e configurar em `.env`
- [ ] **Cover image:** Obter `chave-gratidao-cover.png` (capa do entregável) e colocar em `src/assets/`. Ou remover o campo `cover` do `UPSELL_CONTENT`/`DOWNSELL_CONTENT` até ter a imagem
- [ ] **Kirvano redirect:** Após implementação, configurar no painel Kirvano a URL de retorno pós-compra para `https://rotinadepaz.com.br/sacra/obrigado`
- [ ] **Kirvano iframe:** Verificar se o Kirvano permite embed via iframe (precisa de header `X-Frame-Options: ALLOW` ou sem header). Se não permitir, fallback para `window.location.href`

## Fluxo completo

```
Quiz (7 perguntas)
  → Resultado (arquétipo)
    → Bridge (ponte emocional)
      → Oferta (Rotina de Paz R$67)
        → Checkout Kirvano (redirect)
          → Kirvano processa pagamento
            → Redirect para /sacra/obrigado
              → Pixel Purchase dispara
              → Animação "liberando acesso" (1.2s)
              → Upsell: A Chave da Gratidão (R$67)
                → Aceita: modal Kirvano (iframe inline)
                → Recusa: /sacra/obrigado?offer=downsell
                  → Downsell: mesma oferta por R$37
                    → Aceita: modal Kirvano (iframe inline)
                    → Recusa: redirect para app login
```
