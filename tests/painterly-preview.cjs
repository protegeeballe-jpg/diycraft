'use strict';

const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

(async () => {
  await fs.promises.mkdir('preview', { recursive: true });
  const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], { stdio: 'ignore' });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
      serviceWorkers: 'block'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(() => !!localStorage.getItem('diycraft_peaceful_voxel_v1'), null, { timeout: 15000 });
    await page.waitForTimeout(700);

    await page.evaluate(async () => {
      const key = 'diycraft_peaceful_voxel_v1';
      const prefix = 'DIYCraft:gzip:v1:';
      const stored = localStorage.getItem(key);
      let raw = stored;
      if (stored.startsWith(prefix)) {
        const binary = atob(stored.slice(prefix.length));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        raw = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
      }
      const world = JSON.parse(raw);
      // Create a temporary sample scene in this browser session only.
      // The GitHub branch and the live game are never modified by this fixture.
      world.player = { ...world.player, x: 0, y: 0, z: 11, yaw: 0, pitch: -0.28 };
      world.blocks = world.blocks.filter(b => !(b.x >= -3 && b.x <= 3 && b.z >= 5 && b.z <= 9));
      const addTile = (x, z, color, tilePattern) => world.blocks.push({
        x, y: 0, z, type: 'tile', color, tilePattern
      });
      addTile(-2, 7, '#e8a4b8', 'floral');
      addTile(-1, 7, '#f3cf85', 'checker');
      addTile(0, 7, '#9bc7b0', 'waves');
      addTile(1, 7, '#9db8df', 'diamond');
      addTile(2, 7, '#c3a5d7', 'floral');
      addTile(-2, 8, '#f0c8a1', 'brick');
      addTile(-1, 8, '#b5d59a', 'dots');
      addTile(0, 8, '#e7b3c9', 'floral');
      addTile(1, 8, '#9bc7b0', 'hexagon');
      addTile(2, 8, '#f0d58f', 'checker');

      for (const [x, z, color] of [
        [-3, 6, '#e8a4b8'], [-3, 8, '#f0c875'], [3, 6, '#9ebbe3'],
        [3, 8, '#c4a2d7'], [-4, 5, '#e8a4b8'], [4, 5, '#f0c875']
      ]) {
        world.blocks.push({ x, y: 0, z, type: 'flower', color });
      }
      for (const [x, z] of [[-4, 6], [-4, 7], [4, 6], [4, 7], [-3, 9], [3, 9]]) {
        world.blocks.push({ x, y: 0, z, type: 'tall_grass' });
      }

      // A little pond, using the game's existing excavation/water data format.
      const pond = [];
      for (let x = 5; x <= 7; x++) {
        for (let z = -2; z <= 0; z++) {
          pond.push([x, z]);
        }
      }
      world.excavations = (world.excavations || []).filter(v => !pond.some(([x, z]) => v[0] === x && v[1] === z));
      world.waterCells = pond;
      world.waterLevels = pond.map(([x, z]) => [x, z, 1]);

      world.animals = [
        { id: 'preview-sheep', species: 'sheep', name: 'Pip', x: -1.8, z: -1.2, facing: 0, phase: 1.2 },
        { id: 'preview-cat', species: 'cat', name: 'Mochi', x: 2.0, z: -1.7, facing: 0.4, phase: 2.1 },
        { id: 'preview-dog', species: 'dog', name: 'Buddy', x: 0.2, z: -3.2, facing: -0.3, phase: 0.4 }
      ];
      world.timeMode = 'day';
      localStorage.setItem(key, JSON.stringify(world));
    });

    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(() => document.getElementById('game')?.width > 100, null, { timeout: 15000 });
    await page.waitForTimeout(900);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: 'preview/painterly-world-detail.png' });
    await page.locator('#viewBtn').click();
    await page.waitForTimeout(1200);

    const canvas = page.locator('#game');
    const state = await canvas.evaluate(el => {
      const c = el.getContext('2d');
      const d = c.getImageData(0, 0, el.width, el.height).data;
      const colors = new Set();
      for (let i = 0; i < d.length; i += 4 * 997) {
        if (d[i + 3] > 0) colors.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      }
      return { width: el.width, height: el.height, sampledColors: colors.size };
    });
    if (state.width < 100 || state.height < 100 || state.sampledColors < 20) {
      throw new Error('Preview scene did not render a varied canvas: ' + JSON.stringify(state));
    }
    if (errors.length) throw new Error('Browser errors: ' + errors.join('\n'));
    await page.screenshot({ path: 'preview/painterly-world-preview.png' });
    console.log('Painterly preview captured: ' + JSON.stringify(state));
    await context.close();
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
