import { chromium } from "playwright";
const OUT = "/private/tmp/claude-501/-Users-guilhermehenrique/99f1b6b3-fda9-479c-b246-43939e905d8e/scratchpad";
const url = "https://rotinadepaz.com.br/sacra/quiz/";
const sizes = [ [360, 800], [390, 844], [430, 932] ];
const b = await chromium.launch();
for (const [w, h] of sizes) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForTimeout(5000); // espera o typewriter terminar
  await p.screenshot({ path: `${OUT}/hero-${w}.png` });
  console.log(`ok ${w}x${h}`);
  await ctx.close();
}
await b.close();
