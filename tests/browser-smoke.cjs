'use strict';

const { chromium } = require('playwright');
const { spawn } = require('node:child_process');

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], {
    stdio: 'ignore'
  });
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const canvas = page.locator('#game');
    if (!(await canvas.count())) throw new Error('Main game canvas is missing.');
    const canvasState = await canvas.evaluate(el => {
      const ctx = el.getContext('2d');
      const w = el.width, h = el.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      const colors = new Set();
      for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 24))) {
        for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 24))) {
          const i = (y * w + x) * 4;
          colors.add(data[i] + ',' + data[i + 1] + ',' + data[i + 2]);
        }
      }
      return { width: w, height: h, sampledColors: colors.size };
    });
    if (canvasState.width < 100 || canvasState.height < 100 || canvasState.sampledColors < 8) {
      throw new Error('World canvas did not render a varied scene: ' + JSON.stringify(canvasState));
    }

    await page.locator('#menuBtn').click();
    if (!(await page.locator('#menuShade').evaluate(el => el.classList.contains('open')))) {
      throw new Error('Settings button did not open the settings menu.');
    }
    await page.locator('#menuShade [data-close]').first().click();
    if (await page.locator('#menuShade').evaluate(el => el.classList.contains('open'))) {
      throw new Error('Settings menu close button did not close the menu.');
    }

    const beforeView = await page.locator('#viewBtn').innerText();
    await page.locator('#viewBtn').click();
    const afterView = await page.locator('#viewBtn').innerText();
    if (beforeView === afterView) throw new Error('Camera view button did not change state.');

    await page.locator('#flyBtn').click();
    if (!(await page.locator('#status').evaluate(el => el.classList.contains('show')))) {
      throw new Error('Flight button did not respond.');
    }

    if (errors.length) throw new Error('Browser console/runtime errors:\n' + errors.join('\n\n'));
    console.log('Browser smoke test passed. Canvas:', JSON.stringify(canvasState));
    console.log('Settings, close, camera view, and flight controls responded.');
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
