'use strict';

const { chromium } = require('playwright');
const { spawn } = require('node:child_process');

async function verifyGame(page, label) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(label === 'local'
    ? 'http://127.0.0.1:4173/'
    : 'https://protegeeballe-jpg.github.io/diycraft/?browser-smoke=1',
    { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);

  const canvas = page.locator('#game');
  if (!(await canvas.count())) throw new Error(label + ': main game canvas is missing.');
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
    throw new Error(label + ': world canvas did not render a varied scene: ' + JSON.stringify(canvasState));
  }

  await page.locator('#menuBtn').click();
  if (!(await page.locator('#menuShade').evaluate(el => el.classList.contains('open')))) {
    throw new Error(label + ': settings button did not open the settings menu.');
  }
  await page.locator('#menuShade [data-close]').first().click();
  if (await page.locator('#menuShade').evaluate(el => el.classList.contains('open'))) {
    throw new Error(label + ': settings menu close button did not close the menu.');
  }

  const beforeView = await page.locator('#viewBtn').innerText();
  await page.locator('#viewBtn').click();
  const afterView = await page.locator('#viewBtn').innerText();
  if (beforeView === afterView) throw new Error(label + ': camera view button did not change state.');

  await page.locator('#flyBtn').click();
  if (!(await page.locator('#status').evaluate(el => el.classList.contains('show')))) {
    throw new Error(label + ': flight button did not respond.');
  }

  await page.locator('#menuBtn').click();
  await page.locator('#animalCareBtn').click();
  if (!(await page.locator('#animalCareShade').evaluate(el => el.classList.contains('open')))) {
    throw new Error(label + ': animal-care button did not open its care panel.');
  }
  await page.locator('#animalCareShade [data-close]').click();

  if (errors.length) throw new Error(label + ': browser console/runtime errors:\n' + errors.join('\n\n'));
  console.log(label + ' browser test passed. Canvas: ' + JSON.stringify(canvasState));
  console.log(label + ': settings, close, camera view, and flight controls responded.');
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], {
    stdio: 'ignore'
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await verifyGame(await context.newPage(), 'local');
    await verifyGame(await context.newPage(), 'live');
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
