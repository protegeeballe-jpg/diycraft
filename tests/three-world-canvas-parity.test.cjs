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
const PRODUCTION_BLOCKS=[
 {id:'grass',color:'#70b85a'},{id:'dirt',color:'#9a7049'},{id:'stone',color:'#9ca6a1'},
 {id:'wood',color:'#a97545'},{id:'leaves',color:'#4e9a59'},{id:'brick',color:'#c87862'},
 {id:'glass',color:'#a5dce3'},{id:'flower',color:'#e9a4c1'},{id:'sand',color:'#e8d38b'},{id:'snow',color:'#f2f8fa'}
];
const CUSTOM_TEXTURES=['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow','custom'].map(id=>({id}));
const TILE_DESIGNS=['grid','brick','checker','diagonal','diamond','hexagon','herringbone','basket','mosaic','terrazzo','waves','dots','floral','stars','sunburst','scallop','parquet','pebble','cross','spiral'].map(id=>({id}));
function keyBlock(x,y,z){return x+','+y+','+z;}
function keyGround(x,z){return Math.floor(x)+','+Math.floor(z);}
function productionHarness(world,selectedBucketItem=null,selectedType='grass'){
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
  1000000000,1000000000,(x,z)=>depth.get(keyGround(x,z))||0,keyBlock,blockLookup,selectedType,18000,world,
  ()=>{},(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:fallback,
  CUSTOM_TEXTURES,SOLID_STYLE_TYPES,TILE_DESIGNS,selectedBucketItem,keyGround,blockColumnBlocks,
  ()=>{},blockRenderChunks,()=>{},()=>{},()=>{}
 );
 return {add:fn,lookup:blockLookup};
}

function productionFillHarness(world,selectedType='grass',selectedBucketItem=null){
 const depthMap=new Map((world.excavations||[]).map(([x,z,depth])=>[keyGround(x,z),depth]));
 const groundDepths=new Map(depthMap),waterLevels=new Map();
 for(const [x,z] of world.waterCells||[])waterLevels.set(keyGround(x,z),1);
 for(const [x,z,level] of world.waterLevels||[])waterLevels.set(keyGround(x,z),level);
 const waterCells=new Set(waterLevels.keys()),fishSpots=(world.fish||[]).map(([x,z])=>({x,z}));
 const {add}=productionHarness(world,selectedBucketItem,selectedType);
 const start=source.indexOf('function fillAtScreen('),end=source.indexOf('\nfunction waterAtScreen',start);
 if(start<0||end<0)throw new Error('Could not extract production fillAtScreen().');
 const fill=new Function(
  'canvas','rayHitAtScreen','groundDepthAt','keyGround','world','selected','MAX_BLOCKS','showStatus',
  'addBlock','groundDepths','excavationRenderChunks','removeRenderChunkItem','waterLevels','waterCells',
  'waterRenderChunks','fishSpots','rebuildFishRenderChunks','syncExcavations','syncWaterLife',
  'invalidateNeighborNavigation','save','render','blockMap',
  'return ('+source.slice(start,end).trim()+');'
 )(
  {clientWidth:100,clientHeight:100},()=>null,(x,z)=>groundDepths.get(keyGround(x,z))||0,keyGround,
  world,selectedType,18000,()=>{},add,groundDepths,new Map(),()=>{},waterLevels,waterCells,new Map(),
  fishSpots,()=>{},
  ()=>{world.excavations=Array.from(groundDepths,([key,depth])=>{const [x,z]=key.split(',').map(Number);return [x,z,depth];});},
  ()=>{world.waterCells=Array.from(waterCells,key=>key.split(',').map(Number));world.waterLevels=Array.from(waterLevels,([key,level])=>[...key.split(',').map(Number),level]);world.fish=fishSpots.map(f=>[f.x,f.z]);},
  ()=>{},()=>{},()=>{},new Map([['stone',{name:'Stone'}],['dirt',{name:'Dirt'}],['tile',{name:'Tile'}],['custom',{name:'Custom'}]])
 );
 return fill;
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
  'return ('+source.slice(bucketStart,bucketEnd).trim()+');')(120,world,SOLID_STYLE_TYPES,PRODUCTION_BLOCKS);
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
 return new Function('MAX_DIG_DEPTH','keyBlock','blockLookup','isPlantBlock','groundDepthAt','TILE_BASE_OFFSET','TILE_THICKNESS',
  source.slice(start,end)+'\nreturn playerCollisionAt;'
 )(
  1000000000,keyBlock,blockLookup,block=>!!block&&(block.type==='flower'||block.type==='tall_grass'),
  (x,z)=>depths.get(keyGround(x,z))||0,.02,.13
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
test('reuses Material Bucket appearance data exactly like Canvas 2D without consuming the item',()=>{
 const cases=[
  ['custom',{type:'custom',color:'#123456',texture:'brick'}],
  ['tile',{type:'tile',color:'#ab4567',tilePattern:'spiral'}],
  ['door',{type:'door',color:'#56789a',style:'garden',orientation:'ew',swing:-1}],
  ['wood',{type:'wood',color:'#345678',texture:'leaves'}]
 ];
 for(let i=0;i<cases.length;i++){
  const [type,item]=cases[i],world=freshWorld();
  world.customBlock={color:'#aa83d8',texture:'custom'};
  world.tileDesign={color:'#c5a98a',pattern:'grid'};
  world.doorDesign={color:'#a97545',style:'classic'};
  world.solidStyles={wood:{color:'#a97545',texture:'wood'}};
  world.bucket=[{...item}];
  const production=productionHarness(world,world.bucket[0]);
  const sandbox=sandboxApi.create(adapter.createSnapshot(world));
  const sandboxBucketItem=sandbox.getState().world.bucket[0],sandboxBucketBefore=JSON.stringify(sandbox.getState().world.bucket);
  const selected=sandbox.selectBucketItem(0);
  assert.deepEqual(selected.selectedBucketItem,sandboxBucketItem);
  const x=100+i*3,z=100;
  assert.equal(production.add(x,0,z,type,false),true);
  const added=sandbox.addBlock({type,x,y:0,z});
  assert.deepEqual(comparable(added.world.blocks.at(-1)),comparable(world.blocks.at(-1)),
   'Recovered bucket item appearance must match production for '+type+'.');
  assert.equal(JSON.stringify(added.world.bucket),sandboxBucketBefore,'Selecting and using a bucket item must not consume it.');
  assert.deepEqual(added.selectedBucketItem,sandboxBucketItem,'The selected recovered item remains available for reuse.');
  assert.equal(production.add(x+1,0,z,type,false),true,'Production must also accept a second reuse of '+type+'.');
  const second=sandbox.addBlock({type,x:x+1,y:0,z});
  assert.deepEqual(comparable(second.world.blocks.at(-1)),comparable(world.blocks.at(-1)),
   'The same recovered item can be reused repeatedly for '+type+'.');
  assert.equal(JSON.stringify(second.world.bucket),sandboxBucketBefore);
 }
});
test('matches Canvas 2D hole filling, including removal of water and fish from the filled cell',()=>{
 const world=freshWorld();
 world.excavations=[[80,80,2]];
 world.waterCells=[[80,80]];world.waterLevels=[[80,80,2]];world.fish=[[80,80]];
 world.bucket=[];
 const production=productionFillHarness(world,'stone'),sandbox=sandboxApi.create(adapter.createSnapshot(world));
 production(50,50,{ground:true,x:80,z:80});
 const filled=sandbox.fillExcavation(80,80,{type:'stone'});
 const productionBlocks=world.blocks.filter(block=>block.x===80&&block.z===80).map(comparable).sort((a,b)=>a.y-b.y);
 const sandboxBlocks=filled.world.blocks.filter(block=>block.x===80&&block.z===80).map(comparable).sort((a,b)=>a.y-b.y);
 assert.deepEqual(sandboxBlocks,productionBlocks,'Filled block records must match Canvas 2D.');
 assert.deepEqual(world.excavations,filled.world.excavations.map(cell=>[cell.x,cell.z,cell.depth]));
 assert.deepEqual(world.waterCells,filled.world.water);
 assert.deepEqual(world.fish,filled.world.fish);
 assert.deepEqual(world.waterLevels,[]);
 assert.deepEqual(world.bucket,filled.world.bucket);
});
test('matches Canvas 2D fill appearance when reusing a Material Bucket item',()=>{
 const world=freshWorld();world.excavations=[[81,81,2]];
 world.bucket=[{type:'stone',color:'#123456',texture:'brick'}];
 const item=world.bucket[0],production=productionFillHarness(world,'stone',item);
 const sandbox=sandboxApi.create(adapter.createSnapshot(world));sandbox.selectBucketItem(0);
 production(50,50,{ground:true,x:81,z:81});
 const filled=sandbox.fillExcavation(81,81,{type:'stone'});
 const productionBlocks=world.blocks.filter(block=>block.x===81&&block.z===81).map(comparable).sort((a,b)=>a.y-b.y);
 const sandboxBlocks=filled.world.blocks.filter(block=>block.x===81&&block.z===81).map(comparable).sort((a,b)=>a.y-b.y);
 assert.deepEqual(sandboxBlocks,productionBlocks);
 assert.deepEqual(filled.world.bucket,adapter.createSnapshot(world).bucket,'The selected recovered item remains reusable after fill.');
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
test('matches Canvas 2D default Material Bucket colors for newly placed solids',()=>{
 const world=freshWorld(),production=productionHarness(world);
 const types=SOLID_STYLE_TYPES;
 types.forEach((type,index)=>{
  assert.equal(production.add(150+index,0,150,type,false),true);
 });
 const productionRemove=productionRemovalHarness(world);
 const snapshot=adapter.createSnapshot(world),sandbox=sandboxApi.create(snapshot);
 const created=snapshot.blocks.filter(block=>block.x>=150&&block.x<150+types.length);
 for(const block of created){
  assert.equal(productionRemove.remove(block.x,block.y,block.z),true);
  const next=sandbox.remove(block.key);
  assert.deepEqual(next.world.bucket.at(-1),world.bucket.at(-1),
   'Material Bucket fallback color/texture must match production for '+block.type+'.');
 }
});
test('matches duplicate-cell rejection',()=>{
 const world=freshWorld(),production=productionHarness(world),sandbox=sandboxApi.create(adapter.createSnapshot(world));
 const b=world.blocks[0];
 assert.equal(production.add(b.x,b.y,b.z,'stone',false),false);
 assert.throws(()=>sandbox.addBlock({type:'stone',x:b.x,y:b.y,z:b.z}),/occupied/);
});
console.log('Canvas 2D / Three.js placement parity tests complete.');
