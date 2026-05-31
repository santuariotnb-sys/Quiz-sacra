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
    // cover: string quando chave-gratidao-cover.png existir em src/assets/
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

// Upsell — após compra da Rotina de Paz (R$47)
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
    footnote: "Você já tem a prática. Falta o ensino que firma o novo padrão.",
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
      { tone: "warn", text: "Semanas seguintes: o corpo tenta retomar o automático antigo" },
      { tone: "bad", text: "Sem o ensino que sustenta: recaída em 30–60 dias" },
    ],
  },
  bridge: "Não deixe o alívio virar ilusão de cura — leve o ensino por menos do que um almoço fora.",
  offer: {
    eyebrow: "Oferta única desta página",
    title: "A Chave da Gratidão",
    subtitle: "7 videoaulas de fé e transformação — o ensino que dá raiz à sua Rotina de Paz, agora por um valor que cabe.",
    bullets: [
      { icon: "video", text: "7 videoaulas de 15–20 min (ensino bíblico aplicado)" },
      { icon: "heart", text: "Fé aplicada à rotina — pra firmar o novo padrão" },
      { icon: "clock", text: "Acesso vitalício no app — no seu tempo" },
      { icon: "book", text: "Devocional com Oração de fé" },
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

// Downsell — quando recusa o upsell (R$37)
export const DOWNSELL_CONTENT: OfferContent = {
  id: "downsell-chave-gratidao",
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
    footnote: "Falta só a segunda metade: o ensino que firma o novo padrão.",
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
      { tone: "warn", text: "Semanas seguintes: o corpo tenta retomar o automático antigo" },
      { tone: "bad", text: "Sem o ensino que sustenta: recaída em 30–60 dias" },
    ],
  },
  bridge: "Não deixe o alívio virar ilusão de cura — leve o ensino por menos do que um almoço fora.",
  offer: {
    eyebrow: "Oferta única desta página",
    title: "A Chave da Gratidão",
    subtitle: "7 videoaulas de fé e transformação — o ensino que dá raiz à sua Rotina de Paz, agora por um valor que cabe.",
    bullets: [
      { icon: "video", text: "7 videoaulas de 15–20 min (ensino bíblico aplicado)" },
      { icon: "heart", text: "Fé aplicada à rotina — pra firmar o novo padrão" },
      { icon: "clock", text: "Acesso vitalício no app — no seu tempo" },
      { icon: "book", text: "Devocional com Oração de fé" },
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
