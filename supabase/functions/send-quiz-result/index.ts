// Edge Function: send-quiz-result
// Espelha a página de oferta (Sessão Oferta) num email: arquétipo + capítulos
// personalizados + versículo + método + bônus + preço (De R$129 → R$47) + garantia.
// Chamada pelo quiz após o lead informar o email. Segurança: só envia para leads que
// existem na tabela (anti-spam) e valida o formato do email.
//
// Deploy:
//   cd ~/Quiz-sacra && supabase link --project-ref cemjibbauvvyfaxilrvm
//   supabase secrets set RESEND_API_KEY=re_... --project-ref cemjibbauvvyfaxilrvm
//   supabase functions deploy send-quiz-result --project-ref cemjibbauvvyfaxilrvm

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "https://rotinadepaz.com.br",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KIRVANO_URL =
  "https://pay.kirvano.com/0b6125dc-2775-401d-8abc-90676c29031c?utm_source=email&utm_medium=quiz_result&utm_campaign=sacra";
const FROM = "Rotina de Paz <ola@rotinadepaz.com.br>";

// Paleta da marca (igual src/styles.css)
const C = {
  milk: "#FAF6F4", milkWarm: "#F6EFEA", deep: "#443A52", amethyst: "#75617F",
  lavender: "#C4A8BC", gold: "#D9C5A5", goldWarm: "#C9A876", border: "#EFE6E0",
};

type Chapter = { num?: string; title?: string; period?: string; description?: string };
type Body = {
  name?: string; archetypeName: string; subtitle?: string;
  chapters?: Chapter[]; verseRef?: string; verseText?: string; seal?: string;
  ctaLabel?: string; quote?: string | null;
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)
  );

const cta = (label: string) =>
  `<table role="presentation" style="width:100%;margin:6px 0"><tr><td align="center">
    <a href="${KIRVANO_URL}" style="display:inline-block;background:linear-gradient(135deg,#D9C5A5 0%,#C9A876 100%);color:${C.deep};font-size:16px;font-weight:bold;text-decoration:none;padding:16px 32px;border-radius:999px;box-shadow:0 10px 24px -8px rgba(201,168,118,0.6)">${esc(label)} →</a>
  </td></tr></table>`;

const sectionTitle = (t: string) =>
  `<p style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${C.goldWarm};margin:0 0 4px"><span style="color:${C.lavender}">—</span> ${esc(t)}</p>`;

function buildHtml(d: Body) {
  const greet = d.name ? `${esc(d.name)}, ` : "";
  const seal = String(d.seal || "").split("\n").map(esc).join("<br>");

  const chapters = (d.chapters ?? []).map((c) => `
    <tr><td style="padding:0 0 12px">
      <table role="presentation" style="width:100%;background:linear-gradient(135deg,#574868 0%,#41345a 100%);border-radius:14px"><tr>
        <td style="padding:16px 18px;color:#fcf7ef">
          <p style="font-size:17px;margin:0 0 4px;font-style:italic">${esc(c.title)}</p>
          <p style="font-size:13px;line-height:1.5;color:#d6cdda;margin:0"><strong style="color:${C.goldWarm}">${esc(c.period)}.</strong> ${esc(c.description)}</p>
        </td>
      </tr></table>
    </td></tr>`).join("");

  const leva = [
    ["Método completo dentro do APP", ""],
    ["App guiado", "tudo organizado e didático no seu celular — o caminho na ordem certa."],
    ["Volume I — Despertar", "7 Manhãs de Renovação Neural"],
    ["Volume II — Repouso", "7 Noites de Selagem Profunda"],
    ["Acesso vitalício pelo app", "ouça quando quiser, quantas vezes precisar"],
  ].map(([t, desc]) =>
    `<tr><td style="padding:7px 0;font-size:15px;line-height:1.5;vertical-align:top;color:${C.deep}"><span style="color:${C.goldWarm}">✓</span>&nbsp; <strong>${esc(t)}</strong>${desc ? ` <span style="color:${C.amethyst}">— ${esc(desc)}</span>` : ""}</td></tr>`
  ).join("");

  const bonus = ["148 Louvores em Salmos", "Dormir Melhor Hoje", "Devocional 30 Dias com Jesus"]
    .map((b) => `<tr><td style="padding:5px 0;font-size:14px;color:${C.deep}"><span style="color:${C.goldWarm}">✦</span>&nbsp; ${esc(b)}</td></tr>`).join("");

  return `<!doctype html><html><body style="margin:0;padding:0;background:${C.milk};font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:28px 20px;color:${C.deep}">

    <!-- HEADER ARQUÉTIPO -->
    <p style="text-align:center;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.goldWarm};margin:0 0 6px;font-style:italic">Método completo · 7 dias</p>
    <h1 style="text-align:center;font-size:36px;line-height:1.05;margin:0 0 4px;color:${C.deep}">${esc(d.archetypeName)}</h1>
    ${d.subtitle ? `<p style="text-align:center;font-size:16px;color:${C.amethyst};margin:0 0 22px;font-style:italic">${esc(d.subtitle)}</p>` : ""}
    <p style="text-align:center;font-size:15px;line-height:1.6;color:${C.amethyst};margin:0 0 26px">${greet}seu resultado está pronto — e abaixo está o caminho específico pro seu padrão.</p>

    <!-- O QUE VOCÊ RECEBE -->
    ${sectionTitle("O que você recebe")}
    <p style="font-size:15px;line-height:1.6;margin:4px 0 6px;color:${C.amethyst}"><strong style="color:${C.deep}">14 sessões guiadas em áudio</strong>: <strong style="color:${C.deep}">7 capítulos</strong> pra usar de manhã e <strong style="color:${C.deep}">7 à noite</strong>.</p>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:${C.amethyst}">Cada sessão tem de <strong style="color:${C.deep}">8 a 12 minutos</strong> — cabe entre uma tarefa e outra, antes de dormir, antes da casa acordar.</p>

    <!-- ESPECIALMENTE PRA VOCÊ -->
    ${chapters ? `${sectionTitle("Especialmente pra você")}
    <p style="font-size:15px;margin:4px 0 14px;color:${C.amethyst}">Dois capítulos foram feitos especificamente para o seu padrão:</p>
    <table role="presentation" style="width:100%">${chapters}</table>` : ""}

    <!-- CARD ESCURO: VERSÍCULO -->
    ${(d.verseText || seal) ? `<table role="presentation" style="width:100%;margin:8px 0 26px"><tr><td style="background:${C.deep};border-radius:16px;padding:24px;color:#fff">
      ${d.verseText ? `<p style="font-size:18px;line-height:1.5;font-style:italic;margin:0 0 8px">"${esc(d.verseText)}"</p>` : ""}
      ${d.verseRef ? `<p style="font-size:13px;color:${C.lavender};margin:0 0 14px">— ${esc(d.verseRef)}</p>` : ""}
      ${seal ? `<p style="font-size:15px;line-height:1.5;margin:0;color:#fcf7ef">${seal}</p>` : ""}
    </td></tr></table>` : ""}

    <!-- JUNTO COM O MÉTODO -->
    ${sectionTitle("Junto com o método, você leva")}
    <table role="presentation" style="width:100%;margin:6px 0 18px">${leva}</table>

    <!-- BÔNUS -->
    <table role="presentation" style="width:100%;background:${C.milkWarm};border:1px solid ${C.border};border-radius:14px;margin:0 0 28px"><tr><td style="padding:16px 18px">
      <p style="font-size:14px;font-style:italic;color:${C.goldWarm};margin:0 0 8px">✦ Bônus para fortalecer sua Rotina de Paz</p>
      <table role="presentation" style="width:100%">${bonus}</table>
    </td></tr></table>

    <!-- PREÇO -->
    <table role="presentation" style="width:100%;background:${C.milkWarm};border:1px solid ${C.lavender}55;border-radius:16px;margin:0 0 24px"><tr><td style="padding:26px 20px;text-align:center">
      <p style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.goldWarm};margin:0 0 8px">● Oferta especial desta página</p>
      <p style="font-size:15px;color:${C.amethyst};margin:0;text-decoration:line-through">De R$ 129,00</p>
      <p style="margin:4px 0 0;color:${C.deep}"><span style="font-size:24px;vertical-align:top">R$</span> <span style="font-size:60px;font-style:italic;color:${C.goldWarm};line-height:1">47</span></p>
      <p style="font-size:15px;margin:6px 0 0;color:${C.deep}">à vista <span style="color:${C.amethyst}">ou</span> <strong>10× de R$ 5,60</strong></p>
      <p style="font-size:13px;font-style:italic;color:${C.amethyst};margin:10px 0 0">Pagamento único · Acesso permanente · Sem mensalidade</p>
      <p style="font-size:11px;color:${C.amethyst};margin:6px 0 0">🔒 Acesso imediato · Pagamento 100% seguro</p>
    </td></tr></table>

    <!-- FECHAMENTO + CTA -->
    ${d.quote ? `<p style="text-align:center;font-size:16px;font-style:italic;color:${C.amethyst};margin:0 0 8px">Você lembra do seu desejo: "${esc(d.quote)}"</p>` : ""}
    <p style="text-align:center;font-size:20px;margin:0 0 18px;color:${C.deep}">Esse é o caminho específico pra ele.</p>
    ${cta(d.ctaLabel || "Eu creio — quero minha paz")}
    <p style="text-align:center;font-size:11px;color:${C.amethyst};margin:8px 0 24px">🔒 Acesso imediato após pagamento · Pagamento 100% seguro</p>

    <!-- GARANTIA -->
    <table role="presentation" style="width:100%;background:${C.milkWarm};border:1px solid ${C.lavender}55;border-radius:14px"><tr><td style="padding:18px 20px">
      <p style="font-size:17px;margin:0 0 8px;color:${C.deep}">🛡 Garantia incondicional de 7 dias</p>
      <p style="font-size:14px;line-height:1.6;color:${C.deep};margin:0">Faça a jornada completa. Se não sentir mudança, devolvo cada centavo. Sem formulário, sem pergunta, sem julgamento. Você só me escreve.</p>
    </td></tr></table>

    <p style="text-align:center;font-size:12px;color:${C.lavender};margin:28px 0 0">Rotina de Paz · rotinadepaz.com.br</p>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const body = (await req.json()) as Body;
    const email = String((body as { email?: string }).email ?? "").trim().toLowerCase();
    const archetypeName = String(body.archetypeName ?? "").trim();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !archetypeName) {
      return new Response(JSON.stringify({ error: "invalid_params" }), { status: 400, headers: CORS });
    }

    // Anti-spam: só envia para leads que realmente existem (vieram do quiz).
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: lead } = await sb.from("leads").select("id").eq("email", email).limit(1).maybeSingle();
    if (!lead) {
      return new Response(JSON.stringify({ error: "lead_not_found" }), { status: 403, headers: CORS });
    }

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return new Response(JSON.stringify({ error: "no_resend_key" }), { status: 503, headers: CORS });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: email,
        subject: `${body.name ? body.name + ", " : ""}seu resultado: ${archetypeName} 🤍`,
        html: buildHtml(body),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: "resend_failed", detail: t.slice(0, 150) }), { status: 502, headers: CORS });
    }
    return new Response(JSON.stringify({ sent: true }), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e).slice(0, 150) }), { status: 500, headers: CORS });
  }
});
