import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:4174/sacra/quiz/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const erros = [];
  page.on('pageerror', (e) => erros.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push('CONSOLE: ' + m.text());
  });

  const t0 = Date.now();
  let renderizou = false;
  let msAteRender = null;
  let telasAvancadas = 0;

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    erros.push('GOTO_ERROR: ' + e.message);
  }

  try {
    await Promise.race([
      page.getByText(/oração|paz|seu nome/i).first().waitFor({ state: 'visible', timeout: 15000 }),
      page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 }),
    ]);
    renderizou = true;
    msAteRender = Date.now() - t0;
  } catch (e) {
    renderizou = false;
    msAteRender = Date.now() - t0;
    erros.push('RENDER_WAIT_ERROR: ' + e.message);
  }

  await page.screenshot({ path: '/tmp/quiz-1-inicio.png' }).catch((e) => erros.push('SCREENSHOT1_ERROR: ' + e.message));

  // Tenta avançar telas
  try {
    const nameInput = page.locator('input').first();
    if (await nameInput.count() > 0) {
      await nameInput.fill('Maria').catch(() => {});
    }

    const startBtn = page.getByRole('button', { name: /começar|come/i }).first();
    if (await startBtn.count() > 0) {
      await startBtn.click({ timeout: 5000 }).catch(() => {});
      telasAvancadas++;
      await page.waitForTimeout(1000);
    }

    for (let i = 0; i < 2; i++) {
      let clicked = false;
      const continuarBtn = page.getByText(/continuar/i).first();
      if (await continuarBtn.count() > 0) {
        await continuarBtn.click({ timeout: 5000 }).catch(() => {});
        clicked = true;
      } else {
        const optionBtn = page.locator('button, [role="button"], [class*="option"]').nth(i);
        if (await optionBtn.count() > 0) {
          await optionBtn.click({ timeout: 5000 }).catch(() => {});
          clicked = true;
        }
      }
      if (clicked) {
        telasAvancadas++;
        await page.waitForTimeout(1000);
      }
    }
  } catch (e) {
    erros.push('AVANCAR_ERROR: ' + e.message);
  }

  await page.screenshot({ path: '/tmp/quiz-2-pergunta.png' }).catch((e) => erros.push('SCREENSHOT2_ERROR: ' + e.message));

  console.log('RENDERIZOU:', renderizou ? 'sim' : 'nao');
  console.log('MS_ATE_RENDER:', msAteRender);
  console.log('ERROS:', JSON.stringify(erros));
  console.log('TELAS_AVANCADAS:', telasAvancadas);

  await browser.close();
})();
