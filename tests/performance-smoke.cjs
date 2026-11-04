'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('diycraft.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const iconSvg = fs.readFileSync('diycraft-icon.svg', 'utf8');

// Painterly art is a rendering-only layer. Keep the original game systems,
 // saved color values and existing animation entry points in the regression suite.
const painterlyRequirements = [
  ['cached watercolor/pencil texture generator', 'function drawPainterlySurfaceFinish('],
  ['single cached whole-scene paper pattern', 'const painterlyCanvasPattern=(()=>{'],
  ['whole-scene finish is applied during rendering', 'paintPainterlyCanvasOverlay(w,h);'],
  ['material textures receive the finish', 'drawPainterlySurfaceFinish(c,painterlySeed(id),.82)'],
  ['tile patterns receive the finish', "drawPainterlySurfaceFinish(c,painterlySeed('tile-'+design.id),.68)"],
  ['existing tile color picker remains active', "tileSpectrumPicker=bindSpectrumPicker('tile','tileColor',setDraftTileColor)"],
  ['existing tile hex color handling remains active', 'function setDraftTileColor(color)'],
  ['existing custom block color picker remains active', "customBlockSpectrumPicker=bindSpectrumPicker('customBlock','customBlockColor',setDraftCustomColor)"],
  ['existing moving-water renderer remains present', 'function paintWaterFace(poly,time)'],
  ['existing swaying-plant renderer remains present', 'function drawWindSwayingPlant('],
  ['existing 3D animal renderer remains present', 'function pushAnimalModel(']
];
for (const [label, snippet] of painterlyRequirements) {
  assert(source.includes(snippet), `The watercolor/pencil theme must preserve ${label}.`);
}
assert(source.includes('function paintPainterlyCanvasOverlay(width,height)') &&
       source.includes('ctx.globalAlpha=.82;ctx.fillStyle=painterlyCanvasPattern;ctx.fillRect(0,0,width,height)'),
  'The painterly finish must use its prebuilt canvas pattern, not per-frame image filters.');
const helperStart = source.indexOf('function renderChunkKey');
const helperEnd = source.indexOf('function rebuildFishRenderChunks', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'Chunk-cache helpers must remain available in the engine source.');

const helpers = source.slice(helperStart, helperEnd);
const faceMatch = source.match(/const FACES=(\[[\s\S]*?\]);/);
assert(faceMatch, 'Voxel face definitions are required.');
const faces = Function('return ' + faceMatch[1])();

const solidTypes = ['grass', 'dirt', 'stone', 'wood', 'leaves', 'brick', 'glass', 'flower', 'sand', 'snow'];
const opaqueTypes = new Set([...solidTypes, 'custom']);
const isPlantBlock = block => !!block && (block.type === 'flower' || block.type === 'tall_grass');
const blockMap = new Map([
  ['grass', { color: '#70b85a' }],
  ['custom', { color: '#aa83d8' }]
]);
const keyBlock = (x, y, z) => x + ',' + y + ',' + z;
const validHex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback;
const shadeColor = color => color;
const cubeVerts = (x, y, z, sx = 1, sy = 1, sz = 1) => [
  { x, y, z }, { x: x + sx, y, z }, { x: x + sx, y, z: z + sz }, { x, y, z: z + sz },
  { x, y: y + sy, z }, { x: x + sx, y: y + sy, z },
  { x: x + sx, y: y + sy, z: z + sz }, { x, y: y + sy, z: z + sz }
];
const project = vertex => ({ x: vertex.x, y: vertex.y, d: 1 });

function makeApi(blocks = [], cacheLimit = 16) {
  const lookup = new Map(blocks.map(block => [keyBlock(block.x, block.y, block.z), block]));
  for (const block of blocks) {
    if (block.type === 'door') lookup.set(keyBlock(block.x, block.y + 1, block.z), block);
  }
  const cache = new Map();
  const chunks = new Map();
  const create = new Function(
    'RENDER_CHUNK_SIZE', 'MAX_BLOCK_CHUNK_CACHE', 'isPlantBlock', 'OPAQUE_CUBE_TYPES',
    'blockChunkMeshCache', 'blockRenderChunks', 'blockMap', 'blockLookup',
    'keyBlock', 'validHex', 'shadeColor', 'cubeVerts', 'FACES', 'project',
    'TILE_DESIGNS', 'TILE_BASE_OFFSET', 'TILE_THICKNESS', 'textureTiles',
    helpers + '\nreturn {renderChunkKey,isOpaqueCubeBlock,projectedPolygonVisible,chunkBoundsVisible,invalidateBlockChunkMeshesAt,buildBlockChunkMesh,getBlockChunkMesh,visitNearbyBlockChunkMeshes,appendBlockChunkMesh,addRenderChunkItem,removeRenderChunkItem,visitNearbyRenderChunks};'
  );
  const api = create(
    16, cacheLimit, isPlantBlock, opaqueTypes, cache, chunks, blockMap, lookup,
    keyBlock, validHex, shadeColor, cubeVerts, faces, project,
    [{ id: 'grid' }], 0.02, 0.13, new Map([['tile-grid', { id: 'grid-texture' }]])
  );
  return { api, lookup, cache, chunks };
}

let passed = 0;
function check(condition, message) {
  assert.ok(condition, message);
  passed++;
}

check(source.includes('function pushAnimalEllipsoid') &&
  source.includes('function pushAnimalModel') &&
  source.includes('for(const animal of animals)pushAnimalModel(polys,cam,w,h,animal,tick);'),
  'Animals must use rounded, depth-sorted 3D world geometry rather than screen-space cartoon sprites.');
check(!source.includes('function drawAnimalSprite') && !source.includes('poly.animalSprite'),
  'The old flat animal sprite renderer must stay removed.');

assert(source.includes('function setPlayerActivity(activity)'), 'Player activity actions must be available.');
assert(source.includes("const labels={sleep:'Sleep Here',transformer:'Transformer Sleep',bed:'Go Home & Sleep'"), 'The activity handler must expose three distinct sleep modes.');
assert(source.includes("if(activity==='sleep'||activity==='transformer'||activity==='bed'){"), 'Stationary sleep, Transformer sleep, and Go to Bed must share the lying-down pose.');
assert(source.includes("const dancing=activity==='dance',working=activity==='work',sitting=activity==='sit'"), 'Sit, work and dance must have distinct animation states.');
assert(source.includes('activity:playerActivity'), 'The selected activity must be passed to the third-person avatar.');
assert(source.includes('function isStationaryRestActivity(activity)'), 'Sleep Here and Go Home & Sleep must use a shared stationary-rest rule.');
assert(source.includes("if(activity==='sleep'||activity==='transformer'||p.y<=floor+.35){"), 'Anywhere sleep must settle the avatar onto the local ground surface.');
assert(source.includes('function shouldDrawTemporaryRestBed(activity,homeBed,x,z)'), 'Anywhere sleep must draw a temporary bed.');
assert(source.includes("playerActivity&&playerActivity!=='transformer'&&(moveX!==0"), 'Only Transformer sleep may keep moving without dropping the lying-down pose.');
assert(source.includes('function resolveRestActivity(activity,bed)'), 'Go Home & Sleep must fall back to local stationary sleep when no home bed is saved.');
const restRuleStart = source.indexOf('function resolveRestActivity(activity,bed)');
const restRuleEnd = source.indexOf('function setPlayerActivity', restRuleStart);
assert(restRuleStart >= 0 && restRuleEnd > restRuleStart, 'The saved-bed fallback rule must be extractable.');
const resolveRestActivity = new Function(source.slice(restRuleStart, restRuleEnd) + '\nreturn resolveRestActivity;')();
check(resolveRestActivity('bed', { x: 12, z: -4 }) === 'bed', 'A saved home bed must keep Go Home & Sleep as a home-bed action.');
check(resolveRestActivity('bed', null) === 'sleep', 'Without a saved home bed, Go Home & Sleep must become stationary Sleep Here.');
check(resolveRestActivity('sleep', null) === 'sleep' && resolveRestActivity('transformer', null) === 'transformer', 'The two anywhere-sleep modes must remain distinct.');
const stationaryRuleStart = source.indexOf('function isStationaryRestActivity(activity)');
const stationaryRuleEnd = source.indexOf('function shouldDrawTemporaryRestBed', stationaryRuleStart);
const isStationaryRestActivity = new Function(source.slice(stationaryRuleStart, stationaryRuleEnd) + '\nreturn isStationaryRestActivity;')();
check(isStationaryRestActivity('sleep') && isStationaryRestActivity('bed') && !isStationaryRestActivity('transformer'), 'Only ordinary sleep and Go Home & Sleep must be stationary.');
const temporaryBedRuleStart = source.indexOf('function shouldDrawTemporaryRestBed(activity,homeBed,x,z)');
const temporaryBedRuleEnd = source.indexOf('function move(dt)', temporaryBedRuleStart);
const shouldDrawTemporaryRestBed = new Function(source.slice(temporaryBedRuleStart, temporaryBedRuleEnd) + '\nreturn shouldDrawTemporaryRestBed;')();
check(shouldDrawTemporaryRestBed('sleep', null, 20, 20) && shouldDrawTemporaryRestBed('transformer', { x: 0, z: 0 }, 20, 20), 'Anywhere sleep modes must draw a local bed when there is no nearby saved bed.');
check(!shouldDrawTemporaryRestBed('transformer', { x: 20, z: 20 }, 20, 20) && !shouldDrawTemporaryRestBed('bed', null, 20, 20), 'The home bed must not be duplicated, and Go Home & Sleep must use its registered bed.');
assert(source.includes('function drawPlayerBed(queue,cam,w,h,bed)'), 'A persistent home bed must be rendered in the world.');
assert(source.includes("piece(0,.15,-.10,'#795438',1.16,.18,2.02)"), 'The persistent home bed must include a wooden frame.');
assert(source.includes("piece(0,.32,-.10,'#f5f1e9',1.04,.14,1.90)"), 'The persistent home bed must include a mattress.');
assert(source.includes('drawPlayerBed(polys,cam,w,h,world.player.bed)'), 'The saved bed must remain visible while the player is away.');
assert(source.includes('drawPlayerBed(polys,cam,w,h,{x:restPlayer.x,y:surfaceHeightAt(restPlayer.x,restPlayer.z,restPlayer.y),z:restPlayer.z,yaw:restPlayer.yaw})'), 'Anywhere sleep must draw a temporary bed at the current player position when away from home.');
assert(source.includes('x:p.x,y:p.y,z:p.z,facing:p.yaw'), 'The player avatar must use the player’s actual floor height.');
assert(source.includes('baseY+y*unitScale'), 'The sleeping bed and avatar must be rendered at the current floor elevation.');
assert(source.includes('y:(Number.isFinite(n.y)?n.y:0)+y*scale'), 'Sleeping face details must follow the avatar’s floor elevation.');
assert(source.includes("const sleeping=n.activity==='sleep'||n.activity==='transformer'||n.activity==='bed';"), 'Face decals must use the lowered sleeping-face coordinates for all three sleep modes.');
assert(source.includes("sleepCube(0,.43,-.20,'#91b7c8',.78,.18,1.22)"), 'The sleeper must be raised onto the mattress and covered with a quilt.');
assert(source.includes("p.bed={x:Math.round(p.x*100)/100,y:floor,z:Math.round(p.z*100)/100,yaw:p.yaw}"), 'Players must be able to save a bed location at their current position.');
assert(source.includes("p.x=bed.x;p.z=bed.z;p.y=surfaceHeightAt(p.x,p.z,bed.y);p.yaw=bed.yaw||0"), 'Go Home & Sleep must teleport the player to the saved bed location.');
assert(source.includes('w.player.bed=null;'), 'Old saved worlds without a registered bed must use the local-rest fallback.');
assert(source.includes("bed:{x:-1,y:0,z:-11,yaw:0}"), 'New worlds must include a starter bed inside the welcome cottage.');
assert(html.includes('id="activityBtn"') && html.includes('id="activityShade"'), 'The activity menu must be reachable from the game HUD.');
for (const activity of ['sleep','transformer','bed','set-bed','sit','work','dance','stop']) {
  if (!html.includes('data-player-activity="' + activity + '"')) throw new Error('Missing player activity control: ' + activity);
}
assert(source.includes('const FIXED_UPDATE_STEP=1/60'), 'A fixed 60 Hz simulation step is required.');
assert(source.includes('function interpolatePlayerState(previous,current,alpha)'), 'The player render state must interpolate between fixed simulation updates.');
assert(source.includes('MIN_RENDER_INTERVAL=1000/60-.5'), 'Full-world rendering must be capped near the 60 Hz simulation rate.');
assert(source.includes('renderAccumulator+=frameElapsedMs;') && source.includes('if(renderAccumulator>=MIN_RENDER_INTERVAL){'), 'Render timing must use an accumulator so high-refresh displays do not cause uneven frame pacing.');
assert(source.includes('renderPlayerFrame(frameAccumulator/FIXED_UPDATE_STEP);'), 'Player rendering must continue to use interpolated simulation state.');
assert(!source.includes('if(steps>0)render();'), 'Rendering must remain independent of whether a simulation step ran on that display frame.');
assert(!source.includes("else if(b.type==='tile')pushTileSlab(polys,cam,w,h,b)"), 'Decorative tiles must not be projected as dynamic per-frame geometry.');
assert(source.includes("tileTexture:textureTiles.get('tile-'+pattern)"), 'Cached floor tiles must preserve their selected pattern texture.');
assert(source.includes('MAX_FRAME_DELTA=.1'), 'Frame delta must be clamped after tab suspension or a long frame.');
assert(!source.includes('time-lastTime<30'), 'The old 30 ms frame gate must not return.');
assert(source.includes('render();\n}'), 'The animation loop must render on startup.');
assert(source.includes("const DEBUG_PERFORMANCE=new URLSearchParams(location.search).get('debug')==='1';"),
  'The on-screen performance monitor must be opt-in through the debug query parameter.');
assert(source.includes("panel.id='performanceHud'") && source.includes("pointer-events:none"),
  'The diagnostics panel must be a non-interactive overlay that does not intercept game controls.');
assert(source.includes("const door=block.type==='door',tile=block.type==='tile'") && source.includes('function chunkBoundsVisible(bounds,cam,w,h,margin=16)'), 'Chunk culling must preserve type-aware mesh bounds and conservative viewport tests.');
assert(source.includes('function renderMeasuredFrame()') && source.includes('function updatePerformanceHud(time)'),
  'The diagnostics must measure actual draw cost and periodically report performance.');
assert(source.includes("'RAF '+rate(performanceMetrics.rafFrames)") &&
  source.includes("rate(performanceMetrics.renderFrames)") &&
  source.includes("'Sim   '+average(performanceMetrics.updateMsTotal"),
  'The diagnostics must distinguish browser frame rate, game draw rate, and simulation update cost.');
assert(source.includes('function trackPointerHandler(name,handler)') &&
  source.includes("'Input D/U '+eventMetric(inputEventMetrics.down)"),
  'The debug monitor must measure pointerdown and pointerup callback time.');
assert(source.includes('function processPendingLook()') &&
  source.includes('pendingLookPoint={x:e.clientX,y:e.clientY};'),
  'Pointer-move camera updates must be coalesced and processed from the animation loop.');
assert(source.includes('function handleWorldTap(px,py,target=null)') &&
  source.includes('buildOrFillAtScreen(px,py,hit);'),
  'A tap must reuse its raycast result through the world action path.');
assert(source.includes('digAtScreen(px,py,current);'),
  'Long-press digging must reuse its initial target rather than raycasting it again.');


function simulateCadence(refreshRate) {
  const step = 1 / 60;
  const maxFrameDelta = 0.1;
  const maxSteps = 6;
  const minRenderInterval = 1000 / 60 - 0.5;
  let last = 0;
  let accumulator = 0;
  let renderAccumulator = 0;
  let updates = 0;
  let renders = 0;
  for (let frame = 1; frame <= refreshRate; frame++) {
    const now = frame * 1000 / refreshRate;
    const frameElapsedMs = Math.max(0, now - last);
    const elapsed = Math.min(maxFrameDelta, frameElapsedMs / 1000);
    last = now;
    accumulator = Math.min(accumulator + elapsed, step * maxSteps);
    renderAccumulator += frameElapsedMs;
    let count = 0;
    while (accumulator + 1e-9 >= step && count < maxSteps) {
      updates++;
      count++;
      accumulator -= step;
    }
    if (renderAccumulator >= minRenderInterval) {
      renderAccumulator %= minRenderInterval;
      renders++;
    }
  }
  return { updates, renders };
}
for (const hz of [30, 60, 75, 120, 144, 165]) {
  const cadence = simulateCadence(hz);
  check(cadence.updates === 60, hz + ' Hz display should advance exactly 60 fixed updates per second.');
  if (hz <= 60) {
    check(cadence.renders === hz, hz + ' Hz display should retain its native render cadence.');
  } else {
    check(cadence.renders >= 58 && cadence.renders <= 63, hz + ' Hz display should avoid redundant full-world draws while keeping roughly 60 FPS.');
  }
}

const routeCacheStart = source.indexOf('function getNeighborRouteSegments(route,speed)');
const routeCacheEnd = source.indexOf('\nfunction neighborOnRoute', routeCacheStart);
assert(routeCacheStart >= 0 && routeCacheEnd > routeCacheStart, 'Neighbor route segment cache must be extractable.');
const createRouteCache = new Function(
  'WeakMap', 'findNeighborPath', 'neighborPathLength',
  'let worldGeometryRevision=1; const neighborRouteSegmentsCache=new WeakMap();' +
  source.slice(routeCacheStart, routeCacheEnd) +
  '\nreturn {getNeighborRouteSegments,setRevision(value){worldGeometryRevision=value;}};'
);
let routePathCalls = 0;
const routeCacheApi = createRouteCache(
  WeakMap,
  (start, end) => { routePathCalls++; return [start, end]; },
  path => Math.hypot(path[1].x - path[0].x, path[1].z - path[0].z)
);
const routeFixture = [{x:0,z:0,pause:1},{x:3,z:0,pause:2},{x:3,z:4,pause:1}];
const firstRouteSegments = routeCacheApi.getNeighborRouteSegments(routeFixture, 1.05);
const reusedRouteSegments = routeCacheApi.getNeighborRouteSegments(routeFixture, 1.05);
check(firstRouteSegments === reusedRouteSegments && routePathCalls === routeFixture.length,
  'Neighbor route segments and path lengths must be reused across render frames.');
routeCacheApi.setRevision(2);
const refreshedRouteSegments = routeCacheApi.getNeighborRouteSegments(routeFixture, 1.05);
check(refreshedRouteSegments !== firstRouteSegments && routePathCalls === routeFixture.length * 2,
  'Neighbor route cache must rebuild after world geometry changes.');

let apiSet = makeApi();
check(apiSet.api.projectedPolygonVisible([
  { x: -4, y: 40 }, { x: 6, y: 40 }, { x: 6, y: 50 }, { x: -4, y: 50 }
], 100, 100), 'A polygon crossing the left viewport edge must remain visible.');
check(!apiSet.api.projectedPolygonVisible([
  { x: -30, y: 40 }, { x: -20, y: 40 }, { x: -20, y: 50 }, { x: -30, y: 50 }
], 100, 100), 'A polygon fully outside the viewport must be culled.');
const cullCamera = { pos: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 0 };
check(apiSet.api.chunkBoundsVisible(
  { minX: -5, minY: 20, minZ: -12, maxX: 5, maxY: 30, maxZ: -8 },
  cullCamera, 100, 100
), 'A chunk whose projected bounds cross the viewport must remain visible.');
check(!apiSet.api.chunkBoundsVisible(
  { minX: 180, minY: 20, minZ: -12, maxX: 190, maxY: 30, maxZ: -8 },
  cullCamera, 100, 100
), 'A complete chunk outside the viewport must be rejected before per-face projection.');
check(apiSet.api.chunkBoundsVisible(
  { minX: 180, minY: 20, minZ: -12, maxX: 190, maxY: 30, maxZ: -8 },
  cullCamera, 100, 100, 100
), 'A chunk intersecting the expanded safety margin must be retained.');

const isolated = { x: 0, y: 0, z: 0, type: 'grass' };
apiSet = makeApi([isolated]);
check(apiSet.api.buildBlockChunkMesh('0,0', [isolated]).faces.length === 6, 'An isolated cube must retain all six faces.');

const pair = [
  { x: 15, y: 0, z: 0, type: 'grass' },
  { x: 16, y: 0, z: 0, type: 'grass' }
];
apiSet = makeApi(pair);
const pairFaceCount =
  apiSet.api.buildBlockChunkMesh('0,0', [pair[0]]).faces.length +
  apiSet.api.buildBlockChunkMesh('1,0', [pair[1]]).faces.length;
check(pairFaceCount === 10, 'Adjacent blocks across a 16-cell chunk boundary must hide the shared faces.');

const cube = [];
for (let x = 0; x < 3; x++) {
  for (let y = 0; y < 3; y++) {
    for (let z = 0; z < 3; z++) cube.push({ x, y, z, type: 'grass' });
  }
}
apiSet = makeApi(cube);
const cubeMesh = apiSet.api.buildBlockChunkMesh('0,0', cube);
check(cubeMesh.faces.length === 54, 'A solid 3×3×3 cube must expose only its 54 exterior faces.');

const mixed = [
  { x: 0, y: 0, z: 0, type: 'grass' },
  { x: 1, y: 0, z: 0, type: 'door' },
  { x: 2, y: 0, z: 0, type: 'tile' }
];
apiSet = makeApi(mixed);
const mixedMesh = apiSet.api.buildBlockChunkMesh('0,0', mixed);
check(mixedMesh.faces.length === 12 && mixedMesh.specials.length === 1,
  'Doors must remain dynamic while floor slabs are included in the cached static mesh.');
check(mixedMesh.faces.filter(face => face.tileTexture).length === 1,
  'A cached floor tile must preserve its selected decorative texture on the top face.');
check(mixedMesh.faces.some(face => face.normal[1] === 1 && Math.abs(face.center.y - 0.15) < 1e-9),
  'Cached floor tile tops must preserve the original slab elevation.');

const custom = { x: 0, y: 0, z: 0, type: 'custom', color: '#ff0000', texture: 'brick' };
apiSet = makeApi([custom]);
const customMesh = apiSet.api.buildBlockChunkMesh('0,0', [custom]);
check(customMesh.faces.length === 6 && customMesh.faces[0].material === 'brick' && customMesh.faces[0].customTint,
  'Custom block color and texture metadata must survive mesh caching.');

apiSet = makeApi([]);
apiSet.api.getBlockChunkMesh('0,0', []);
apiSet.api.getBlockChunkMesh('1,0', []);
apiSet.api.invalidateBlockChunkMeshesAt(16, 0);
check(!apiSet.cache.has('0,0') && !apiSet.cache.has('1,0'),
  'An edit at x=16 must invalidate meshes in both chunks touching that boundary.');

apiSet = makeApi([], 16);
for (let i = 0; i < 24; i++) apiSet.api.getBlockChunkMesh(String(i) + ',0', []);
check(apiSet.cache.size === 16 && !apiSet.cache.has('0,0'),
  'The least-recently-used chunk mesh cache must remain capped at 16 entries.');

const stressBlocks = [];
for (let y = 0; y < 5; y++) {
  for (let x = 0; x < 60; x++) {
    for (let z = 0; z < 60; z++) stressBlocks.push({ x, y, z, type: 'grass' });
  }
}
apiSet = makeApi(stressBlocks);
for (const block of stressBlocks) {
  apiSet.api.addRenderChunkItem(apiSet.chunks, block.x, block.z, block);
}
let exposedFaceCount = 0;
for (const [key, items] of apiSet.chunks) {
  exposedFaceCount += apiSet.api.getBlockChunkMesh(key, items).faces.length;
}
check(stressBlocks.length === 18000, 'The solid-block stress fixture must reach the 18,000-block world limit.');
check(apiSet.chunks.size === 16, 'The stress fixture must distribute across sixteen 16×16 chunks.');
check(exposedFaceCount === 8400, 'The 60×60×5 prism must cache only its 8,400 exterior faces.');
let nearbyChunkCount = 0;
apiSet.api.visitNearbyBlockChunkMeshes({ pos: { x: 2, z: 2 } }, 24, () => nearbyChunkCount++);
check(nearbyChunkCount === 4, 'Nearby rendering must visit only the four chunks within the test camera radius.');
const visibleBlock = { x: 0, y: 0, z: -8, type: 'grass' };
const offscreenBlock = { x: 0, y: 200, z: -24, type: 'grass' };
apiSet = makeApi([visibleBlock, offscreenBlock]);
apiSet.api.addRenderChunkItem(apiSet.chunks, visibleBlock.x, visibleBlock.z, visibleBlock);
apiSet.api.addRenderChunkItem(apiSet.chunks, offscreenBlock.x, offscreenBlock.z, offscreenBlock);
let viewportChunks = 0;
apiSet.api.visitNearbyBlockChunkMeshes(cullCamera, 24, () => viewportChunks++, 100, 100);
check(viewportChunks === 1, 'Nearby chunk traversal must skip a vertically off-screen chunk before projecting its individual faces.');
check(apiSet.api.buildBlockChunkMesh('0,-2', [offscreenBlock]).bounds.maxY === 201,
  'Chunk visibility bounds must include the full height of stored blocks.');

const excavationIndex = new Map();
const waterIndex = new Map();
const fishIndex = new Map();
for (let i = 0; i < 12000; i++) {
  const x = i % 120;
  const z = Math.floor(i / 120);
  const cell = x + ',' + z;
  apiSet.api.addRenderChunkItem(excavationIndex, x, z, cell);
  apiSet.api.addRenderChunkItem(waterIndex, x, z, cell);
  for (let fish = 0; fish < 3; fish++) {
    apiSet.api.addRenderChunkItem(fishIndex, x, z, { x, z, index: fish });
  }
}
let nearbyExcavations = 0;
let nearbyWater = 0;
let nearbyFish = 0;
const testCamera = { pos: { x: 2, z: 2 } };
apiSet.api.visitNearbyRenderChunks(excavationIndex, testCamera, 24, () => nearbyExcavations++);
apiSet.api.visitNearbyRenderChunks(waterIndex, testCamera, 24, () => nearbyWater++);
apiSet.api.visitNearbyRenderChunks(fishIndex, testCamera, 24, () => nearbyFish++);
check(nearbyExcavations === 1024 && nearbyWater === 1024 && nearbyFish === 3072,
  'Nearby queries must stay bounded while indexing 12,000 terrain cells and 36,000 fish.');


check(source.includes('const MAX_DIG_DEPTH=1000000000,GROUND_DIG_LIMIT=12000'),
  'Underground digging and saved-world validation must support a practically unbounded one-billion-block depth.');
check(!source.includes('for(let y=64;y>=-MAX_DIG_DEPTH;y--)'),
  'Surface-height lookup must not scan every vertical layer in a deep world.');
check(source.includes('function surfaceHeightAt(x,z,atOrBelowY=Infinity)') &&
  source.includes('blockColumnBlocks=new Map()'),
  'Surface lookup must use per-column block indexes and support the player height.');
const movementStart = source.indexOf('function move(dt){');
const undergroundRescue = source.indexOf('const terrainFloor=-groundDepthAt(p.x,p.z)', movementStart);
const flightBranch = source.indexOf('if(flying){', movementStart);
check(movementStart >= 0 && undergroundRescue > movementStart && flightBranch > undergroundRescue,
  'Underground recovery must run before the flight branch so flying players cannot remain trapped below terrain.');
check(source.includes('if(next<=floor){') &&
  source.includes('else {p.y=floor;jumpVelocity=0;save(true);return;}'),
  'The player must land on a valid surface and recover when already below terrain.');
check(source.includes('function addBlock(x,y,z,type=selected,saveImmediately=true)') &&
  source.includes('if(saveImmediately)save();'),
  'Bulk hole filling must be able to defer repeated disk saves.');
check(!source.includes('const layerCount=Math.ceil(topY-floorY)'),
  'Deep water walls must render as a single face rather than looping once per underground layer.');

const interpolationStart = source.indexOf('function interpolatePlayerState(previous,current,alpha)');
const interpolationEnd = source.indexOf('\nlet previousPlayerRenderState', interpolationStart);
assert(interpolationStart >= 0 && interpolationEnd > interpolationStart, 'The player interpolation helper must be extractable.');
const interpolate = new Function('Math', source.slice(interpolationStart, interpolationEnd) + '\nreturn interpolatePlayerState;')(Math);
const interpolatedMidpoint = interpolate(
  { x: 0, y: 0, z: 0, yaw: Math.PI * 0.95, pitch: 0 },
  { x: 10, y: 4, z: -6, yaw: -Math.PI * 0.95, pitch: 0.4 },
  0.5
);
check(interpolatedMidpoint.x === 5 && interpolatedMidpoint.y === 2 && interpolatedMidpoint.z === -3,
  'Player position must interpolate smoothly halfway between fixed updates.');
check(Math.abs(Math.abs(interpolatedMidpoint.yaw) - Math.PI) < 1e-9,
  'Yaw interpolation must take the shortest path across the ±π boundary.');
check(interpolate({ x: 2, y: 1, z: 3, yaw: 0, pitch: 0 }, { x: 8, y: 3, z: 9, yaw: 1, pitch: 1 }, 0).x === 2 &&
  interpolate({ x: 2, y: 1, z: 3, yaw: 0, pitch: 0 }, { x: 8, y: 3, z: 9, yaw: 1, pitch: 1 }, 1).x === 8,
  'Interpolation must clamp cleanly to the previous and current simulation states.');

const surfaceStart = source.indexOf('function surfaceHeightAt(x,z,atOrBelowY=Infinity)');
const surfaceEnd = source.indexOf('\nconst GROUND_BASE_Y', surfaceStart);
assert(surfaceStart >= 0 && surfaceEnd > surfaceStart, 'The indexed surface-height helper must be extractable for deep-world tests.');
const surfaceSource = source.slice(surfaceStart, surfaceEnd);
const testKeyGround = (x, z) => Math.floor(x) + ',' + Math.floor(z);
const testDepths = new Map([['10,20', 200000], ['3,4', 3]]);
const testColumns = new Map([
  ['10,20', [
    { x: 10, y: 4, z: 20, type: 'wood' },
    { x: 10, y: -199999, z: 20, type: 'stone' }
  ]],
  ['1,2', [{ x: 1, y: 4, z: 2, type: 'wood' }]]
]);
const getSurfaceHeight = new Function(
  'blockColumnBlocks', 'keyGround', 'groundDepthAt', 'isPlantBlock', 'TILE_BASE_OFFSET', 'TILE_THICKNESS',
  surfaceSource + '\nreturn surfaceHeightAt;'
)(
  testColumns,
  testKeyGround,
  (x, z) => testDepths.get(testKeyGround(x, z)) || 0,
  isPlantBlock,
  0.02,
  0.13
);
check(getSurfaceHeight(10, 20, -199998) === -199998,
  'Surface lookup must find buildable platforms deep below ground without scanning from the surface.');
check(getSurfaceHeight(10, 20, -200010) === -200000,
  'A player below a deep excavation floor must be directed back to that floor.');
check(getSurfaceHeight(1, 2, 0) === 0 && getSurfaceHeight(1, 2) === 5,
  'Height-aware lookup must preserve room interiors while still finding the roof for safe return placement.');
check(getSurfaceHeight(3, 4, -100) === -3,
  'A player who falls below unexcavated terrain must recover to that column’s ground surface.');



check(source.startsWith('(async()=>') && source.includes('let world=await load()') &&
  source.includes('async function decodeSavedWorld(value)'),
  'Compressed saves must be decoded before the game creates or mutates the world.');
check(source.includes("const SAVE_GZIP_PREFIX='DIYCraft:gzip:v1:'") &&
  source.includes('async function encodeSavedWorld(json)') &&
  source.includes('async function gunzipBytes(bytes)'),
  'World persistence must use a versioned, lossless gzip codec with a plain-JSON fallback.');
check(source.includes('SAVE_DEBOUNCE_MS=450') &&
  source.includes('async function persistLatestWorld()') &&
  source.includes('if(revision!==saveRevision)return;') &&
  source.includes('function flushSaveSync()'),
  'Autosaves must be debounced, ordered, and flushed synchronously when the page is hidden or closed.');
check(source.includes("useGzip?'.diycraft.gz':'.json'") &&
  source.includes("bytes[0]===0x1f&&bytes[1]===0x8b") &&
  source.includes('async function restoreBackup(file)'),
  'Compressed gzip backups and existing JSON backups must both be restorable.');


check(source.includes("typeof CompressionStream!=='function'||typeof DecompressionStream!=='function'") &&
  source.includes('MAX_BACKUP_FILE_BYTES=24*1024*1024') &&
  source.includes('file.size>MAX_BACKUP_FILE_BYTES') &&
  source.includes('/^data:image\\/png;base64,[A-Za-z0-9+/]+={0,2}$/'),
  'Compression must require matching encode/decode support, backup imports must be size-limited, and saved artwork must be PNG data only.');


const iconTags=[...iconSvg.matchAll(/<([a-zA-Z][a-zA-Z0-9:-]*)\b/g)].map(match=>match[1].toLowerCase());
check(iconTags.length>=5&&iconTags.every(tag=>['svg','rect','circle','path'].includes(tag)) &&
  !['<text','<metadata','<desc','<script','<foreignobject','<image','<use','<filter','<mask'].some(tag=>iconSvg.toLowerCase().includes(tag)),
  'The application icon must remain simple local vector artwork without embedded text, metadata, scripts or linked images.');


check(source.includes('MAX_UNCOMPRESSED_SAVE_BYTES=32*1024*1024') &&
  source.includes('const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream(\'gzip\')).getReader()') &&
  source.includes('if(total>MAX_UNCOMPRESSED_SAVE_BYTES)') &&
  source.includes('Compressed backup expands beyond the safe memory limit.'),
  'Gzip restore must stream data and stop decompression before an oversized archive exhausts a mobile device memory budget.');


check(source.includes('if(!chunkBoundsVisible({minX:a.x-.85,maxX:a.x+.85,minY:groundY,maxY:groundY+2.5,minZ:a.z-.85,maxZ:a.z+.85},cam,w,h,16))return;'),
  'Animal meshes must be culled using conservative full-body bounds before detailed geometry is built, without changing visible mesh quality.');

const colorPagesStart=source.indexOf('const COLOR_PAGES=[');
const colorPagesEnd=source.indexOf('\nlet coloringNeighbor',colorPagesStart);
assert(colorPagesStart>=0&&colorPagesEnd>colorPagesStart,'Built-in coloring pages must remain a distinct, locally defined asset collection.');
const colorPagesSource=source.slice(colorPagesStart,colorPagesEnd);
const svgTags=[...colorPagesSource.matchAll(/<([a-zA-Z][a-zA-Z0-9:-]*)\b/g)].map(match=>match[1].toLowerCase());
const allowedSvgTags=new Set(['svg','rect','circle','path','g','ellipse']);
check(svgTags.length>=25&&svgTags.every(tag=>allowedSvgTags.has(tag)) &&
  !['<text','<metadata','<desc','<script','<foreignobject','<image','<use','<filter','<mask'].some(tag=>colorPagesSource.toLowerCase().includes(tag)) &&
  !/ on[a-z]+\s*=|(?:href|xlink:href)\s*=|opacity\s*=\s*["']0|display\s*=\s*["']none/i.test(colorPagesSource),
  'Built-in coloring art must remain visible, original vector shapes without embedded text, scripts, hidden nodes or linked content.');

const htmlScripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
check(htmlScripts.length===1&&htmlScripts[0][2].trim()===''&&
  htmlScripts[0][1].includes('src="./diycraft.js"')&&
  html.includes("default-src 'none'")&&html.includes("script-src 'self'")&&!html.includes("script-src 'unsafe-inline'")&&
  !/\b(?:src|href)\s*=\s*["']https?:\/\//i.test(html)&&
  !['<iframe','<object','<embed','url(http','@import'].some(item=>html.toLowerCase().includes(item)),
  'The game shell must load only its local engine, block inline scripts, and contain no remote image, frame or embedded content.');
check(html.includes('no enemies, weapons, combat, chat, multiplayer, advertising, analytics, or external content') &&
  html.includes('no third-party images or hidden text are loaded'),
  'The child-safety disclosure must explicitly exclude chat, external content, third-party images and hidden text.');

console.log('DIYCraft performance smoke tests passed: ' + passed + ' checks.');
