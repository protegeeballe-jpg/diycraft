'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('diycraft.js', 'utf8');
const helperStart = source.indexOf('function renderChunkKey');
const helperEnd = source.indexOf('function rebuildFishRenderChunks', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'Chunk-cache helpers must remain available in the engine source.');

const helpers = source.slice(helperStart, helperEnd);
const faceMatch = source.match(/const FACES=(\[[\s\S]*?\]);/);
assert(faceMatch, 'Voxel face definitions are required.');
const faces = Function('return ' + faceMatch[1])();

const solidTypes = ['grass', 'dirt', 'stone', 'wood', 'leaves', 'brick', 'glass', 'flower', 'sand', 'snow'];
const opaqueTypes = new Set([...solidTypes, 'custom']);
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

function makeApi(blocks = [], cacheLimit = 32) {
  const lookup = new Map(blocks.map(block => [keyBlock(block.x, block.y, block.z), block]));
  for (const block of blocks) {
    if (block.type === 'door') lookup.set(keyBlock(block.x, block.y + 1, block.z), block);
  }
  const cache = new Map();
  const chunks = new Map();
  const create = new Function(
    'RENDER_CHUNK_SIZE', 'MAX_BLOCK_CHUNK_CACHE', 'OPAQUE_CUBE_TYPES',
    'blockChunkMeshCache', 'blockRenderChunks', 'blockMap', 'blockLookup',
    'keyBlock', 'validHex', 'shadeColor', 'cubeVerts', 'FACES', 'project',
    'TILE_DESIGNS', 'TILE_BASE_OFFSET', 'TILE_THICKNESS', 'textureTiles',
    helpers + '\nreturn {renderChunkKey,isOpaqueCubeBlock,projectedPolygonVisible,invalidateBlockChunkMeshesAt,buildBlockChunkMesh,getBlockChunkMesh,visitNearbyBlockChunkMeshes,appendBlockChunkMesh,addRenderChunkItem,removeRenderChunkItem,visitNearbyRenderChunks};'
  );
  const api = create(
    16, cacheLimit, opaqueTypes, cache, chunks, blockMap, lookup,
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

assert(source.includes('const FIXED_UPDATE_STEP=1/60'), 'A fixed 60 Hz simulation step is required.');
assert(source.includes('function interpolatePlayerState(previous,current,alpha)'), 'The player render state must interpolate between fixed simulation updates.');
assert(source.includes('renderPlayerFrame(frameAccumulator/FIXED_UPDATE_STEP);'), 'The canvas must render smoothly at the display refresh rate.');
assert(!source.includes('if(steps>0)render();'), 'The 60 Hz simulation must not throttle visual rendering to 60 Hz.');
assert(!source.includes("else if(b.type==='tile')pushTileSlab(polys,cam,w,h,b)"), 'Decorative tiles must not be projected as dynamic per-frame geometry.');
assert(source.includes("tileTexture:textureTiles.get('tile-'+pattern)"), 'Cached floor tiles must preserve their selected pattern texture.');
assert(source.includes('MAX_FRAME_DELTA=.1'), 'Frame delta must be clamped after tab suspension or a long frame.');
assert(!source.includes('time-lastTime<30'), 'The old 30 ms frame gate must not return.');
assert(source.includes('render();\n}'), 'The animation loop must render after fixed updates.');

function simulateCadence(refreshRate) {
  const step = 1 / 60;
  const maxFrameDelta = 0.1;
  const maxSteps = 6;
  let last = 0;
  let accumulator = 0;
  let updates = 0;
  for (let frame = 1; frame <= refreshRate; frame++) {
    const now = frame * 1000 / refreshRate;
    const elapsed = Math.min(maxFrameDelta, Math.max(0, (now - last) / 1000));
    last = now;
    accumulator = Math.min(accumulator + elapsed, step * maxSteps);
    let count = 0;
    while (accumulator + 1e-9 >= step && count < maxSteps) {
      updates++;
      count++;
      accumulator -= step;
    }
  }
  return updates;
}
for (const hz of [30, 60, 120]) {
  check(simulateCadence(hz) === 60, hz + ' Hz display should advance exactly 60 fixed updates per second.');
}

let apiSet = makeApi();
check(apiSet.api.projectedPolygonVisible([
  { x: -4, y: 40 }, { x: 6, y: 40 }, { x: 6, y: 50 }, { x: -4, y: 50 }
], 100, 100), 'A polygon crossing the left viewport edge must remain visible.');
check(!apiSet.api.projectedPolygonVisible([
  { x: -30, y: 40 }, { x: -20, y: 40 }, { x: -20, y: 50 }, { x: -30, y: 50 }
], 100, 100), 'A polygon fully outside the viewport must be culled.');

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

apiSet = makeApi([], 32);
for (let i = 0; i < 40; i++) apiSet.api.getBlockChunkMesh(String(i) + ',0', []);
check(apiSet.cache.size === 32 && !apiSet.cache.has('0,0'),
  'The least-recently-used chunk mesh cache must remain capped at 32 entries.');

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
const interpolationEnd = source.indexOf('\\nlet previousPlayerRenderState', interpolationStart);
assert(interpolationStart >= 0 && interpolationEnd > interpolationStart, 'The player interpolation helper must be extractable.');
const interpolate = new Function('Math', source.slice(interpolationStart, interpolationEnd) + '\\nreturn interpolatePlayerState;')(Math);
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
  'blockColumnBlocks', 'keyGround', 'groundDepthAt', 'TILE_BASE_OFFSET', 'TILE_THICKNESS',
  surfaceSource + '\nreturn surfaceHeightAt;'
)(
  testColumns,
  testKeyGround,
  (x, z) => testDepths.get(testKeyGround(x, z)) || 0,
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

console.log('DIYCraft performance smoke tests passed: ' + passed + ' checks.');
