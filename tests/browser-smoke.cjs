'use strict';

const fs = require('node:fs');
const zlib = require('node:zlib');

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

  if (label === 'local') {
    const initial = await page.evaluate(async () => {
      const key = 'diycraft_peaceful_voxel_v1';
      const prefix = 'DIYCraft:gzip:v1:';
      const stored = localStorage.getItem(key);
      if (!stored || !stored.startsWith(prefix)) return { format: 'not-compressed' };
      const binary = atob(stored.slice(prefix.length));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const raw = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      return { format: 'gzip', raw, world: JSON.parse(raw) };
    });
    if (initial.format !== 'gzip' || !Array.isArray(initial.world.blocks)) {
      throw new Error('local: new autosaves were not stored as valid compressed worlds.');
    }
    const originalBlockCount = initial.world.blocks.length;
    await page.evaluate(raw => localStorage.setItem('diycraft_peaceful_voxel_v1', raw), JSON.stringify(initial.world));
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(900);
    const migrated = await page.evaluate(async () => {
      const prefix = 'DIYCraft:gzip:v1:';
      const stored = localStorage.getItem('diycraft_peaceful_voxel_v1');
      if (!stored || !stored.startsWith(prefix)) return null;
      const binary = atob(stored.slice(prefix.length));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const raw = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      return JSON.parse(raw);
    });
    if (!migrated || migrated.blocks.length !== originalBlockCount) {
      throw new Error('local: an existing JSON world did not migrate safely to compressed storage.');
    }
  }

  const [backupDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#menuBtn').click().then(() => page.locator('#backupBtn').click())
  ]);
  const backupPath = await backupDownload.path();
  if (!backupPath) throw new Error(label + ': backup download did not produce a file.');
  const backupBytes = fs.readFileSync(backupPath);
  const backupJson = backupDownload.suggestedFilename().endsWith('.gz')
    ? zlib.gunzipSync(backupBytes).toString('utf8')
    : backupBytes.toString('utf8');
  const backupWorld = JSON.parse(backupJson);
  if (!Array.isArray(backupWorld.blocks)) throw new Error(label + ': backup file did not contain a valid world.');
  await page.locator('#menuShade [data-close]').first().click();

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

  // Profile the real renderer using its built-in debug HUD before any tuning.
  await page.goto(label === 'local'
    ? 'http://127.0.0.1:4173/?debug=1'
    : 'https://protegeeballe-jpg.github.io/diycraft/?debug=1&perf-smoke=1',
    { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3200);
  const performanceText = await page.locator('#performanceHud').textContent().catch(() => '');
  if (!performanceText || !performanceText.includes('DRAW')) {
    throw new Error(label + ': performance HUD did not produce renderer measurements.');
  }
  console.log(label + ' renderer baseline:\n' + performanceText);

  if (errors.length) throw new Error(label + ': browser console/runtime errors:\n' + errors.join('\n\n'));
  console.log(label + ' browser test passed. Canvas: ' + JSON.stringify(canvasState));
  console.log(label + ': settings, close, camera view, flight and animal-care controls responded.');
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
