'use strict';
const assert=require('node:assert/strict');
const world=require('../js/exploration-world.js');

assert.equal(world.GENERATOR_VERSION,1);
assert.equal(world.CHUNK_SIZE,16);
const a=world.generateChunk(20261116,-2,1);
const b=world.generateChunk(20261116,-2,1);
assert.deepEqual(a,b,'The same seed and chunk coordinates must generate identical terrain.');
assert.equal(a.cells.length,256);
assert.deepEqual(a.cells[0],world.sampleCell(20261116,-32,16));
assert.deepEqual(a.cells[15],world.sampleCell(20261116,-17,16));
assert.deepEqual(a.cells[16],world.sampleCell(20261116,-32,17));
const east=world.generateChunk(20261116,-1,1);
assert.deepEqual(a.cells[31],world.sampleCell(20261116,-17,17));
assert.deepEqual(east.cells[16],world.sampleCell(20261116,-16,17));
assert.notDeepEqual(world.sampleCell(1,-70,50),world.sampleCell(2,-70,50),'Changing the seed should change the terrain field.');

const cells=[];
for(let z=-64;z<64;z+=4)for(let x=-64;x<64;x+=4)cells.push(world.sampleCell(99,x,z));
const biomes=new Set(cells.map(cell=>cell.biome));
for(const expected of ['meadow','forest','hills','lake','mountain'])assert.ok(biomes.has(expected),'Missing generated biome: '+expected);
assert.ok(cells.every(cell=>Number.isInteger(cell.groundY)));
assert.ok(cells.every(cell=>cell.waterLevel===null||Number.isInteger(cell.waterLevel)));

const landmarks=world.getLandmarks(99);
assert.equal(landmarks.length,7);
assert.equal(landmarks.find(item=>item.id==='grand-library').name,'The Grand Library');
assert.equal(landmarks.find(item=>item.id==='grand-library').x,0);
assert.deepEqual(world.getLandmarks(99),world.getLandmarks(99));
assert.equal(world.isInsideWorld(-128,127),true);
assert.equal(world.isInsideWorld(128,0),false);
assert.throws(()=>world.generateChunk(1,8,0),/finite world boundary/);
assert.throws(()=>world.sampleCell(1,128,0),/finite world boundary/);
assert.throws(()=>world.sampleCell(-1,0,0),/unsigned 32-bit/);
console.log('The Exploration seeded world, biome coverage and chunk-boundary tests passed.');