// Percorre o quiz no PREVIEW (tracking gateado por hostname → zero eventos) e captura frames.
import { chromium } from "playwright";
const OUT = "/private/tmp/claude-501/-Users-guilhermehenrique/99f1b6b3-fda9-479c-b246-43939e905d8e/scratchpad";
const url = "https://preview.rotina-de-paz.pages.dev/sacra/quiz/";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
const p = await ctx.newPage();
const shot = async (name) => { await p.screenshot({ path: `${OUT}/qf-${name}.png` }); console.log("shot", name); };
const clickFirstOption = async () => {
  // opções são botões grandes; ignora botões de navegação conhecidos
  const btns = p.locator("button:visible");
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    const t = (await btns.nth(i).innerText()).trim();
    if (t && !/voltar|continuar|come[çc]ar|quero|avan[çc]ar/i.test(t) && t.length > 8) {
      await btns.nth(i).click(); console.log("  clicou:", t.slice(0, 48)); return t;
    }
  }
  // fallback: clica "continuar/avançar" se existir
  for (let i = 0; i < n; i++) {
    const t = (await btns.nth(i).innerText()).trim();
    if (/continuar|avan[çc]ar|come[çc]ar/i.test(t)) { await btns.nth(i).click(); console.log("  clicou(nav):", t); return t; }
  }
  console.log("  (nenhuma opcao encontrada)"); return null;
};

await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(4500);           // typewriter da hero termina
await shot("01-hero");

// CTA da hero
await p.locator("button", { hasText: "Quero ver meu padrão" }).first().click();
await p.waitForTimeout(2000); await shot("02-transicao");   // fala da guia antes da Q1
await p.waitForTimeout(4500); await shot("03-q1");

for (let q = 1; q <= 7; q++) {
  const picked = await clickFirstOption();
  if (!picked) break;
  await p.waitForTimeout(2200); if (q <= 2) await shot(`04-reacao-q${q}`); // reação da guia
  await p.waitForTimeout(5200);                                            // reação+transição terminam
  if (q === 2) await shot("05-q3");
  if (q === 4) await shot("06-q5");
}
await p.waitForTimeout(3000); await shot("07-pos-perguntas"); // loading/micro-recompensa
await p.waitForTimeout(6000); await shot("08-contato");       // gate de contato (não submete!)
await b.close();
console.log("done");
