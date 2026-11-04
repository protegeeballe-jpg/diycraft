'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const adapter=require('../js/three-world-adapter.js');
const sandboxApi=require('../js/three-world-edit-sandbox.js');
const source=fs.readFileSync('diycraft.js','utf8');
function freshWorld(){
 const start=source.indexOf('function freshWorld(){');
 const marker='\n}\n\nfunction validHex';
 const end=source.indexOf(marker,start);
 if(start<0||end<0)throw new Error('Could not locate production freshWorld().');
 return new Function('emptySlots','return ('+source.slice(start,end+2)+');')(()=>Array.from({length:60},()=>null))();
}
const SOLID_STYLE_TYPES=['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow'];
const CUSTOM_TEXTURES=['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow','custom'].map(id=>({id}));
const TILE_DESIGNS=['grid','brick','checker','diagonal','diamond','hexagon','herringbone','basket','mosaic','terrazzo','waves','dots','floral','stars','sunburst','scallop','parquet','pebble','cross','spiral'].map(id=>({id}));
function keyBlock(x,y,z){return x+','+y+','+z;}
function keyGround(x,z){return Math.floor(x)+','+Math.floor(z);}
function productionHarness(world){
 const blockLookup=new Map(),blockColumnBlocks=new Map(),blockRenderChunks=new Map();
 const depth=new Map((world.excavations||[]).map(v=>[keyGround(v[0],v[1]),v[2]]));
 for(const b of world.blocks){blockLookup.set(keyBlock(b.x,b.y,b.z),b);if(b.type==='door')blockLookup.set(keyBlock(b.x,b.y+1,b.z),b);}
 const start=source.indexOf('function addBlock('),end=source.indexOf('\nfunction removeBlock',start);
 if(start<0||end<0)throw new Error('Could not extract production addBlock().');
 const fn=new Function(
  'MAX_DIG_DEPTH','WORLD_LIMIT','groundDepthAt','keyBlock','blockLookup','selected','MAX_BLOCKS','world','showStatus','validHex',
  'CUSTOM_TEXTURES','SOLID_STYLE_TYPES','TILE_DESIGNS','selectedBucketItem','keyGround','blockColumnBlocks',
  'addRenderChunkItem','blockRenderChunks','invalidateBlockChunkMeshesAt','invalidateNeighborNavigation','save',
  'return ('+source.slice(start,end).trim()+');'
 )(
  1000000000,1000000000,(x,z)=>depth.get(keyGround(x,z))||0,keyBlock,blockLookup,'grass',18000,world,
  ()=>{},(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:fallback,
  CUSTOM_TEXTURES,SOLID_STYLE_TYPES,TILE_DESIGNS,null,keyGround,blockColumnBlocks,
  ()=>{},blockRenderChunks,()=>{},()=>{},()=>{}
 );
 return {add:fn,lookup:blockLookup};
}

function productionRemovalHarness(world){
 const blockLookup=new Map(),blockColumnBlocks=new Map(),blockRenderChunks=new Map(),doorMotions=new Map();
 for(const b of world.blocks){
  blockLookup.set(keyBlock(b.x,b.y,b.z),b);
  if(b.type==='door')blockLookup.set(keyBlock(b.x,b.y+1,b.z),b);
  else{const column=keyGround(b.x,b.z);if(!blockColumnBlocks.has(column))blockColumnBlocks.set(column,[]);blockColumnBlocks.get(column).push(b);}
 }
 const bucketStart=source.indexOf('function addBucketItem('),bucketEnd=source.indexOf('\nfunction consumeItem',bucketStart);
 const removeStart=source.indexOf('function removeBlock('),removeEnd=source.indexOf('\nfunction cameraState',removeStart);
 if(bucketStart<0||bucketEnd<0||removeStart<0||removeEnd<0)throw new Error('Could not extract production removal helpers.');
 const addBucketItem=new Function('MAX_BUCKET_ITEMS','world','SOLID_STYLE_TYPES','BLOCKS',
  'return ('+source.slice(bucketStart,bucketEnd).trim()+');')(120,world,SOLID_STYLE_TYPES,[{id:'wood',color:'#a97545'}]);
 const remove=new Function('keyBlock','blockLookup','world','isProtectedDigCell','addBucketItem','showStatus',
  'removeRenderChunkItem','blockRenderChunks','keyGround','blockColumnBlocks','invalidateBlockChunkMeshesAt',
  'doorMotions','invalidateNeighborNavigation','save',
  'return ('+source.slice(removeStart,removeEnd).trim()+');')(
   keyBlock,blockLookup,world,()=>false,addBucketItem,()=>{},()=>{},blockRenderChunks,keyGround,blockColumnBlocks,
   ()=>{},doorMotions,()=>{},()=>{}
  );
 return {remove};
}

function productionCollisionHarness(world){
 const blockLookup=new Map(),depths=new Map((world.excavations||[]).map(([x,z,depth])=>[keyGround(x,z),depth]));
 for(const block of world.blocks){
  blockLookup.set(keyBlock(block.x,block.y,block.z),block);
  if(block.type==='door')blockLookup.set(keyBlock(block.x,block.y+1,block.z),block);
 }
 const start=source.indexOf('const GROUND_BASE_Y=-MAX_DIG_DEPTH;');
 const end=source.indexOf('\nfunction nudgePlayerOutOfBlocks',start);
 if(start<0||end<0)throw new Error('Could not extract production player-collision helpers.');
 return new Function('MAX_DIG_DEPTH','keyBlock','blockLookup','isPlantBlock','groundDepthAt',
  source.slice(start,end)+'\nreturn playerCollisionAt;'
 )(
  1000000000,keyBlock,blockLookup,block=>!!block&&(block.type==='flower'||block.type==='tall_grass'),
  (x,z)=>depths.get(keyGround(x,z))||0
 );
}

function comparable(block){
 const out={type:block.type,x:block.x,y:block.y,z:block.z};
 for(const key of ['color','texture','tilePattern','style','orientation','swing','open'])if(block[key]!==undefined)out[key]=block[key];
 return out;
}
function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
function pair(type,x,y,z){
 const world=freshWorld();
 world.customBlock={color:'#a17bd4',texture:'brick'};
 world.doorDesign={color:'#a97545',style:'window'};
 world.tileDesign={color:'#c5a98a',pattern:'spiral'};
 world.solidStyles={stone:{color:'#345678',texture:'brick'},flower:{color:'#e89ac4',texture:'flower'}};
 const production=productionHarness(world),renderSnapshot=adapter.createSnapshot(world),sandbox=sandboxApi.create(renderSnapshot);
 assert.equal(production.add(x,y,z,type,false),true,'Production addBlock should accept fixture placement.');
 sandbox.addBlock({type,x,y,z});
 const productionBlock=world.blocks.at(-1),sandboxBlock=sandbox.getState().world.blocks.at(-1);
 assert.deepEqual(comparable(sandboxBlock),comparable(productionBlock),'Three.js and Canvas 2D block settings must match.');
}
test('matches Canvas 2D appearance defaults for custom, tile, door and styled solids',()=>{
 pair('custom',50,0,50);pair('tile',51,0,50);pair('door',52,0,50);pair('stone',53,0,50);pair('flower',54,0,50);
});
test('matches two-cell door occupancy rules',()=>{
 const world=freshWorld(),production=productionHarness(world),sandbox=sandboxApi.create(adapter.createSnapshot(world));
 assert.equal(production.add(60,0,60,'door',false),true);
 sandbox.addBlock({type:'door',x:60,y:0,z:60});
 assert.equal(production.add(60,1,60,'stone',false),false);
 assert.throws(()=>sandbox.addBlock({type:'stone',x:60,y:1,z:60}),/occupied/);
});
test('matches excavation depth and world-height placement limits',()=>{
 const world=freshWorld();world.excavations=[[61,60,2]];
 const production=productionHarness(world),sandbox=sandboxApi.create(adapter.createSnapshot(world));
 assert.equal(production.add(61,-2,60,'stone',false),true);
 sandbox.addBlock({type:'stone',x:61,y:-2,z:60});
 assert.equal(production.add(62,-1,60,'stone',false),false);
 assert.throws(()=>sandbox.addBlock({type:'stone',x:62,y:-1,z:60}),/coordinates/);
 assert.equal(production.add(63,64,60,'door',false),false);
 assert.throws(()=>sandbox.addBlock({type:'door',x:63,y:64,z:60}),/two clear/);
});

test('matches Canvas 2D recovered Material Bucket records for solids, tiles and doors',()=>{
 const world=freshWorld();
 world.blocks=[
  {x:50,y:0,z:50,type:'wood'},
  {x:51,y:0,z:50,type:'tile',color:'#c5a98a',tilePattern:'spiral'},
  {x:52,y:0,z:50,type:'door',color:'#a97545',style:'garden',orientation:'ew',swing:-1,open:true}
 ];
 world.bucket=[];
 const production=productionRemovalHarness(world),snapshot=adapter.createSnapshot(world),sandbox=sandboxApi.create(snapshot);
 for(const block of snapshot.blocks){
  assert.equal(production.remove(block.x,block.y,block.z),true);
  const next=sandbox.remove(block.key);
  const productionItem=world.bucket[world.bucket.length-1],sandboxItem=next.world.bucket[next.world.bucket.length-1];
  assert.deepEqual(sandboxItem,productionItem,'Recovered item data must match the production Material Bucket.');
 }
 assert.equal(world.blocks.length,0);
 assert.equal(sandbox.getState().world.blocks.length,0);
});
test('matches full Material Bucket protection without deleting the block',()=>{
 const world=freshWorld();
 world.blocks=[{x:70,y:0,z:70,type:'wood'}];
 world.bucket=Array.from({length:120},()=>({type:'stone'}));
 const production=productionRemovalHarness(world),sandbox=sandboxApi.create(adapter.createSnapshot(world));
 assert.equal(production.remove(70,0,70),false);
 assert.throws(()=>sandbox.remove('block-0'),/Material Bucket is full/);
 assert.equal(world.blocks.length,1);
 assert.equal(sandbox.getState().world.blocks.length,1);
});

test('matches exact Canvas 2D player capsule collisions for solids, tiles, plants and doors',()=>{
 const world=freshWorld();
 world.excavations=[[80,80,2]];
 world.blocks=[
  {x:70,y:0,z:70,type:'stone'},
  {x:71,y:0,z:70,type:'tile',color:'#c5a98a'},
  {x:72,y:0,z:70,type:'flower'},
  {x:73,y:0,z:70,type:'tall_grass'},
  {x:74,y:0,z:70,type:'door',color:'#a97545',orientation:'ew',swing:-1,open:false}
 ];
 const production=productionCollisionHarness(world);
 const edit=sandboxApi.create(adapter.createSnapshot(world));
 const cases=[
  [.5,.5,0],[69.77,70.5,0],[69.78,70.5,0],
  [71.5,70.5,0],[71.5,70.5,-.2],[71.5,70.5,.16],
  [72.5,70.5,0],[73.5,70.5,0],
  [74.5,70.5,0],[74.5,70.5,1],
  [80.5,80.5,-2.5],[80.5,80.5,-1.9],
  [80.23,80.5,-.5],[80.22,80.5,-.5]
 ];
 for(const [x,z,y] of cases){
  assert.equal(edit.playerCollisionAt(x,z,y),production(x,z,y),
   'Three.js sandbox collision must match Canvas 2D at '+[x,z,y].join(','));
 }
 const door=world.blocks.find(block=>block.type==='door'),sandboxDoor=edit.getState().world.blocks.find(block=>block.type==='door');
 assert.ok(door&&sandboxDoor);
 edit.toggleDoor(sandboxDoor.key);door.open=true;
 for(const [x,z,y] of [[74.5,70.5,0],[74.5,70.5,1]]){
  assert.equal(edit.playerCollisionAt(x,z,y),production(x,z,y),
   'Open-door collision must match Canvas 2D at '+[x,z,y].join(','));
 }
});
test('matches duplicate-cell rejection',()=>{
 const world=freshWorld(),production=productionHarness(world),sandbox=sandboxApi.create(adapter.createSnapshot(world));
 const b=world.blocks[0];
 assert.equal(production.add(b.x,b.y,b.z,'stone',false),false);
 assert.throws(()=>sandbox.addBlock({type:'stone',x:b.x,y:b.y,z:b.z}),/occupied/);
});
console.log('Canvas 2D / Three.js placement parity tests complete.');
