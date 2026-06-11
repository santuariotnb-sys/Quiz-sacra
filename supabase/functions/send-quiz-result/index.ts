// Edge Function: send-quiz-result
// Email persuasivo pós-quiz: dor → reconciliação → desejo → mecanismo → oferta
// Deploy: supabase functions deploy send-quiz-result --project-ref cemjibbauvvyfaxilrvm

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  if (origin === "https://rotinadepaz.com.br" || origin.endsWith(".rotina-de-paz.pages.dev")) {
    return origin;
  }
  return "https://rotinadepaz.com.br";
}

function corsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getCorsOrigin(req),
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-api-version, x-application-name",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const KIRVANO_URL =
  "https://pay.kirvano.com/0b6125dc-2775-401d-8abc-90676c29031c?utm_source=email&utm_medium=quiz_result&utm_campaign=sacra";
const FROM = "Rotina de Paz <ola@rotinadepaz.com.br>";
const OFFER_IMG =
  "https://cemjibbauvvyfaxilrvm.supabase.co/storage/v1/object/public/email-assets/oferta-topo.jpg";

const C = {
  milk: "#FAF6F4", milkWarm: "#F6EFEA", deep: "#443A52", amethyst: "#75617F",
  lavender: "#C4A8BC", gold: "#D9C5A5", goldWarm: "#C9A876", border: "#EFE6E0",
  cardBg: "#fbf6ec", cardBorder: "#e6d8be", desireBg: "#fbf7f1", desireBorder: "#e7ddd1",
};

type Chapter = { num?: string; title?: string; period?: string; description?: string };
type Body = {
  email?: string; name?: string; desire?: string;
  archetypeName: string; tagline?: string; bridge?: string | null;
  happening?: string; mirror?: string;
  truthTitle?: string; truthTitleEm?: string; truthBody?: string;
  verseRef?: string; verseText?: string; seal?: string;
  chapters?: Chapter[]; ctaLabel?: string; quote?: string | null;
};

// Beats de desejo — mesmo conteudo do quiz.ts
const DESIRE_BEATS: Record<string, { eyebrow: string; title: string; body: string; closing: string }> = {
  dormir: {
    eyebrow: "O que muda quando o alarme desliga",
    title: "Imagine a primeira noite inteira.",
    body: "Voce deita. O corpo entende que pode soltar. E pela primeira vez em anos, voce <strong>nao acorda as 3h pra checar se esta tudo bem</strong>. Acorda quando o sol chega — leve, inteira, descansada.",
    closing: "<strong>Nao e fe a mais que falta.</strong> E o seu corpo recebendo o sinal de que pode descansar — <strong>14 sinais em 7 dias</strong>, ate o alarme aprender a desligar.",
  },
  descansar: {
    eyebrow: "O que muda quando voce se permite parar",
    title: "Imagine descansar sem culpa.",
    body: "Voce senta. Nao faz nada por 15 minutos. E pela primeira vez, <strong>a culpa nao dispara junto</strong>. O ombro desce. A pressa solta.",
    closing: "Descansar deixa de ser pecado e volta a ser o que sempre foi: <strong>confiar que Deus continua agindo enquanto voce para</strong> — um pouco a cada dia, na ordem certa.",
  },
  orar: {
    eyebrow: "O que muda quando o ruido baixa",
    title: "Imagine sentir Deus de novo.",
    body: "Voce fecha os olhos pra orar — e a mente <strong>nao dispara mil pensamentos</strong>. O ruido baixa. A Palavra alcanca o fundo. E aquela presenca que parecia distante <strong>volta a ser sentida, nao so lembrada</strong>.",
    closing: "Nao e falta de fe. E o corpo em alerta abafando o que a sua fe ja tem — e da pra silenciar esse ruido, um pouco a cada dia.",
  },
  "parar-pior": {
    eyebrow: "O que muda quando o 'e se' perde a forca",
    title: "Imagine a mente quieta.",
    body: "Algo acontece — e pela primeira vez voce <strong>nao roda cinco cenarios catastroficos antes de respirar</strong>. O 'e se' perde a forca. Voce volta pro presente, que estava ali o tempo todo te esperando.",
    closing: "Nao e exagero seu. E um cerebro que aprendeu a prever perigo onde nao tem — e que <strong>pode reaprender</strong>, na ordem certa.",
  },
};
const DESIRE_FALLBACK = {
  eyebrow: "O que muda quando o alarme desliga",
  title: "Imagine a sua primeira noite de paz.",
  body: "O corpo entende que pode soltar. A mente para de rodar. E pela primeira vez em anos, <strong>voce descansa de verdade</strong>.",
  closing: "<strong>Nao e fe a mais que falta.</strong> E o seu corpo recebendo o sinal certo — <strong>14 sinais em 7 dias</strong>, na ordem certa.",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!),
  );
const rich = (h: unknown) => String(h ?? "");

function fmtBRL(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function buildHtml(d: Body, priceCents = 4700, anchorCents = 19700) {
  const priceWhole = Math.round(priceCents / 100);
  const installmentValue = (priceCents / 10 / 100).toFixed(2).replace(".", ",");
  const anchorFormatted = fmtBRL(anchorCents);
  const greet = d.name ? esc(d.name) : "";
  const seal = String(d.seal || "").split("\n").map(esc).join("<br>");
  const beat = (d.desire && DESIRE_BEATS[d.desire]) || DESIRE_FALLBACK;

  const chapters = (d.chapters ?? []).map((c) => `
    <tr><td style="padding:0 0 12px">
      <table role="presentation" style="width:100%;border-radius:14px;border:1px solid ${C.cardBorder};background:#fff"><tr>
        <td style="padding:16px 18px">
          <p style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.goldWarm};margin:0 0 4px">${esc(c.period)}</p>
          <p style="font-size:18px;font-weight:bold;color:${C.deep};margin:0 0 4px">${esc(c.title)}</p>
          <p style="font-size:14px;line-height:1.5;color:${C.amethyst};margin:0">${esc(c.description)}</p>
        </td>
      </tr></table>
    </td></tr>`).join("");

  return `<!doctype html><html><body style="margin:0;padding:0;background:#ece4d9;font-family:Georgia,serif">
  <div style="max-width:600px;margin:0 auto;background:${C.milk};padding:0">

    <!-- HEADER: saudacao pessoal -->
    <table role="presentation" style="width:100%;background:${C.deep}"><tr><td style="padding:28px 24px;text-align:center">
      <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.gold};margin:0 0 8px">✦ Padrão raiz identificado ✦</p>
      <h1 style="font-size:36px;line-height:1;color:#fcf7ef;margin:0 0 6px;font-weight:bold">${esc(d.archetypeName)}</h1>
      ${d.tagline ? `<p style="font-size:17px;color:${C.lavender};margin:0;font-style:italic">${esc(d.tagline)}</p>` : ""}
    </td></tr></table>

    <div style="padding:28px 24px">

    <!-- 1. ACOLHER A DOR -->
    ${greet ? `<p style="font-size:18px;color:${C.deep};margin:0 0 16px">${greet}, aqui esta a sua leitura completa.</p>` : ""}

    ${d.bridge ? `<p style="font-size:19px;line-height:1.5;font-style:italic;color:${C.deep};text-align:center;margin:0 0 24px;padding:0 8px">${esc(d.bridge)}</p>` : ""}

    ${d.happening ? `<h2 style="font-size:20px;color:${C.deep};margin:0 0 10px"><span style="color:${C.goldWarm}">›</span> O que esta acontecendo</h2>
    <div style="font-size:15px;line-height:1.65;color:${C.amethyst};margin:0 0 14px">${rich(d.happening)}</div>` : ""}

    ${d.mirror ? `<table role="presentation" style="width:100%;margin:0 0 28px"><tr>
      <td style="border-left:3px solid ${C.goldWarm};padding:6px 0 6px 18px">
        <p style="font-size:18px;font-style:italic;line-height:1.5;color:${C.deep};margin:0">"${esc(d.mirror)}"</p>
      </td>
    </tr></table>` : ""}

    <!-- 2. RECONCILIAR: a verdade (card texturizado) -->
    <table role="presentation" style="width:100%;margin:0 0 28px"><tr><td style="background:${C.cardBg};border:1px solid ${C.cardBorder};border-radius:18px;padding:28px 22px;text-align:center">
      <p style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.goldWarm};margin:0 0 10px">A verdade que voce precisa ouvir</p>
      ${(d.truthTitle || d.truthTitleEm) ? `<p style="font-size:24px;line-height:1.2;font-weight:bold;color:${C.deep};margin:0 0 12px">${esc(d.truthTitle)} <span style="font-style:italic;color:${C.goldWarm}">${esc(d.truthTitleEm)}</span></p>` : ""}
      ${d.truthBody ? `<div style="font-size:15px;line-height:1.6;color:${C.amethyst};margin:0 0 16px">${rich(d.truthBody)}</div>` : ""}
      ${(d.verseText || d.verseRef) ? `<table role="presentation" style="width:100%;margin:0 0 14px"><tr><td style="border:1px solid ${C.border};border-radius:12px;padding:14px 16px;background:#fff">
        ${d.verseRef ? `<p style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${C.goldWarm};margin:0 0 4px">${esc(d.verseRef)}</p>` : ""}
        ${d.verseText ? `<p style="font-size:17px;font-style:italic;line-height:1.45;color:${C.deep};margin:0">"${esc(d.verseText)}"</p>` : ""}
      </td></tr></table>` : ""}
      ${seal ? `<p style="font-size:16px;font-style:italic;line-height:1.55;color:${C.amethyst};margin:0">${seal}</p>` : ""}
    </td></tr></table>

    <!-- 3. DESEJO: a virada emocional -->
    <table role="presentation" style="width:100%;margin:0 0 28px"><tr><td style="background:${C.desireBg};border:1px solid ${C.desireBorder};border-radius:18px;padding:28px 22px;text-align:center">
      <p style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.goldWarm};margin:0 0 8px">${esc(beat.eyebrow)}</p>
      <p style="font-size:26px;line-height:1.15;font-weight:bold;color:${C.deep};margin:0 0 14px">${esc(beat.title)}</p>
      <div style="font-size:15px;line-height:1.65;color:${C.amethyst};margin:0 0 14px">${beat.body}</div>
      <div style="font-size:15px;line-height:1.65;color:${C.amethyst};margin:0">${beat.closing}</div>
    </td></tr></table>

    <!-- 4. MECANISMO: o que voce recebe -->
    <p style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.goldWarm};margin:0 0 8px;text-align:center">✦ O metodo ✦</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 6px;color:${C.amethyst}"><strong style="color:${C.deep}">14 sessoes guiadas em audio</strong>: <strong style="color:${C.deep}">7 capitulos</strong> pra usar de manha e <strong style="color:${C.deep}">7 a noite</strong>.</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:${C.amethyst}">Cada sessao tem de <strong style="color:${C.deep}">8 a 12 minutos</strong> — cabe entre uma tarefa e outra, antes de dormir, antes da casa acordar.</p>

    <!-- Capitulos especificos -->
    ${chapters ? `<table role="presentation" style="width:100%;border:1.5px solid ${C.cardBorder};border-radius:18px;background:${C.cardBg};margin:0 0 24px"><tr><td style="padding:20px 16px">
      <p style="text-align:center;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:${C.goldWarm};margin:0 0 4px">✦ Feito pro seu padrao ✦</p>
      <p style="text-align:center;font-size:14px;color:${C.amethyst};margin:0 0 14px">Dois capitulos desenhados <strong style="color:${C.deep}">especificamente pra voce</strong>:</p>
      <table role="presentation" style="width:100%">${chapters}</table>
    </td></tr></table>` : ""}

    <!-- Imagem da oferta -->
    <img src="${OFFER_IMG}" alt="Rotina de Paz" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:16px;margin:0 0 24px" />

    <!-- 5. PRECO + CTA -->
    <table role="presentation" style="width:100%;background:${C.milkWarm};border:1px solid ${C.border};border-radius:16px;margin:0 0 20px"><tr><td style="padding:24px 20px;text-align:center">
      <p style="font-size:15px;color:${C.amethyst};margin:0;text-decoration:line-through">De ${anchorFormatted}</p>
      <p style="margin:4px 0 0;color:${C.deep}"><span style="font-size:22px;vertical-align:top">R$</span> <span style="font-size:56px;font-style:italic;color:${C.goldWarm};line-height:1">${priceWhole}</span></p>
      <p style="font-size:15px;margin:6px 0 0;color:${C.deep}">a vista <span style="color:${C.amethyst}">ou</span> <strong>10x de R$ ${installmentValue}</strong></p>
      <p style="font-size:12px;font-style:italic;color:${C.amethyst};margin:8px 0 0">Pagamento unico · Acesso permanente · Sem mensalidade</p>
    </td></tr></table>

    <table role="presentation" style="width:100%;margin:0 0 8px"><tr><td align="center">
      <a href="${KIRVANO_URL}" style="display:inline-block;background:linear-gradient(135deg,${C.deep},#3a3048);color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:18px 32px;border-radius:999px;box-shadow:0 16px 36px -12px rgba(63,53,80,0.6)">${esc(d.ctaLabel || "Eu creio — quero minha paz")} →</a>
    </td></tr></table>
    <p style="text-align:center;font-size:11px;color:${C.amethyst};margin:0 0 24px">🔒 Acesso imediato · Pagamento 100% seguro</p>

    <!-- 6. GARANTIA -->
    <table role="presentation" style="width:100%;background:${C.milkWarm};border:1px solid ${C.border};border-radius:14px;margin:0 0 8px"><tr><td style="padding:18px 20px">
      <p style="font-size:17px;margin:0 0 6px;color:${C.deep}">🛡 Garantia incondicional de 7 dias</p>
      <p style="font-size:14px;line-height:1.6;color:${C.amethyst};margin:0">Faca a jornada completa. Se nao sentir mudanca, devolvo cada centavo. Sem formulario, sem pergunta. Voce so me escreve.</p>
    </td></tr></table>

    </div>

    <!-- FOOTER -->
    <table role="presentation" style="width:100%;border-top:1px solid ${C.border}"><tr><td style="padding:18px 24px;text-align:center">
      <p style="font-size:12px;color:${C.lavender};margin:0">Rotina de Paz · rotinadepaz.com.br</p>
    </td></tr></table>

  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders(req) });

  try {
    const body = (await req.json()) as Body;
    const email = String(body.email ?? "").trim().toLowerCase();
    const archetypeName = String(body.archetypeName ?? "").trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !archetypeName) {
      return new Response(JSON.stringify({ error: "invalid_params" }), { status: 400, headers: corsHeaders(req) });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: lead } = await sb.from("leads").select("id").eq("email", email).limit(1).maybeSingle();
    if (!lead) {
      return new Response(JSON.stringify({ error: "lead_not_found" }), { status: 403, headers: corsHeaders(req) });
    }

    // Fetch preço do produto principal do DB (fonte única de preço)
    let priceCents = 4700;
    let anchorCents = 19700;
    try {
      const { data: prod } = await sb
        .from("products")
        .select("price_cents, anchor_price_cents")
        .eq("slug", "rotina-de-paz")
        .eq("status", "active")
        .maybeSingle();
      if (prod) {
        priceCents = prod.price_cents ?? priceCents;
        anchorCents = prod.anchor_price_cents ?? anchorCents;
      }
    } catch { /* fallback to defaults */ }

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "no_resend_key" }), { status: 503, headers: corsHeaders(req) });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: `${body.name ? body.name + ", " : ""}seu resultado: ${archetypeName} 🤍`,
        html: buildHtml(body, priceCents, anchorCents),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: "resend_failed", detail: t.slice(0, 150) }), { status: 502, headers: corsHeaders(req) });
    }
    return new Response(JSON.stringify({ sent: true }), { status: 200, headers: corsHeaders(req) });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e).slice(0, 150) }), { status: 500, headers: corsHeaders(req) });
  }
});
