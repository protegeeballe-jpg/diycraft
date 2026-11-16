/* Deterministic, finite, height-field world sampler for The Exploration v1. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.TheExplorationWorld=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const GENERATOR_VERSION=1,CHUNK_SIZE=16,CHUNK_RADIUS=8;
 const WORLD_MIN=-CHUNK_RADIUS*CHUNK_SIZE,WORLD_MAX=(CHUNK_RADIUS*CHUNK_SIZE)-1;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const smooth=value=>value*value*(3-2*value);
 function isInteger(value){return Number.isSafeInteger(value);}
 function assertSeed(seed){if(!isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('World seed must be an unsigned 32-bit integer.');}
 function assertCoordinate(value,label){if(!isInteger(value)||value<WORLD_MIN||value>WORLD_MAX)throw new RangeError((label||'World coordinate')+' is outside the finite world boundary.');}
 function mix32(value){
  value=Math.imul(value^(value>>>16),0x7feb352d);
  value=Math.imul(value^(value>>>15),0x846ca68b);
  return (value^(value>>>16))>>>0;
 }
 function hash2d(seed,x,z,salt){
  let value=(seed^Math.imul(x|0,0x9e3779b1)^Math.imul(z|0,0x85ebca77)^(salt||0))>>>0;
  return mix32(value)/4294967296;
 }
 function valueNoise(seed,x,z,scale,salt){
  const gx=Math.floor(x/scale),gz=Math.floor(z/scale);
  const tx=smooth((x-gx*scale)/scale),tz=smooth((z-gz*scale)/scale);
  const a=hash2d(seed,gx,gz,salt),b=hash2d(seed,gx+1,gz,salt);
  const c=hash2d(seed,gx,gz+1,salt),d=hash2d(seed,gx+1,gz+1,salt);
  const top=a+(b-a)*tx,bottom=c+(d-c)*tx;
  return top+(bottom-top)*tz;
 }
 function distance(x,z,cx,cz,rx,rz){const dx=(x-cx)/rx,dz=(z-cz)/rz;return dx*dx+dz*dz;}
 function sampleCell(seed,x,z){
  assertSeed(seed);assertCoordinate(x,'X coordinate');assertCoordinate(z,'Z coordinate');
  const broad=valueNoise(seed,x,z,44,0x1021),detail=valueNoise(seed,x,z,13,0x2043);
  const moisture=valueNoise(seed,x-71,z+39,31,0x4067);
  let biome='meadow',groundY=0,waterLevel=null;
  const lakeDistance=distance(x,z,34,-18,15,11);
  const mountainDistance=distance(x,z,-43,-27,27,30);
  const forestDistance=distance(x,z,-34,31,28,25);
  const hillDistance=distance(x,z,18,-39,33,21);
  if(lakeDistance<1){
   biome='lake';groundY=-3-Math.round(detail*2);waterLevel=0;
  }else if(mountainDistance<1){
   biome='mountain';groundY=6+Math.round(broad*5+detail*4);
  }else if(forestDistance<1||moisture>0.64){
   biome='forest';groundY=Math.round(detail*2);
  }else if(hillDistance<1||broad>0.69){
   biome='hills';groundY=2+Math.round(broad*3+detail*2);
  }else{
   groundY=Math.round(detail*1.5);
  }
  let feature=null;
  const decoration=hash2d(seed,x,z,0x5a17);
  if(biome==='forest'&&decoration<0.075)feature='tree';
  else if(biome==='meadow'&&decoration<0.025)feature='wildflower';
  return Object.freeze({x,z,biome,groundY,waterLevel,moisture:Number(moisture.toFixed(4)),feature});
 }
 function generateChunk(seed,chunkX,chunkZ){
  assertSeed(seed);
  if(!isInteger(chunkX)||!isInteger(chunkZ)||chunkX< -CHUNK_RADIUS||chunkX>=CHUNK_RADIUS||chunkZ< -CHUNK_RADIUS||chunkZ>=CHUNK_RADIUS)
   throw new RangeError('Chunk coordinate is outside the finite world boundary.');
  const originX=chunkX*CHUNK_SIZE,originZ=chunkZ*CHUNK_SIZE,cells=[];
  for(let localZ=0;localZ<CHUNK_SIZE;localZ++){
   for(let localX=0;localX<CHUNK_SIZE;localX++){
    cells.push(sampleCell(seed,originX+localX,originZ+localZ));
   }
  }
  return Object.freeze({seed,generatorVersion:GENERATOR_VERSION,chunkX,chunkZ,size:CHUNK_SIZE,cells:Object.freeze(cells)});
 }
 function getLandmarks(seed){
  assertSeed(seed);
  const definitions=[
   {id:'grand-library',kind:'library',name:'The Grand Library',x:0,z:0},
   {id:'village-square',kind:'village',name:'Willowbrook Village',x:5,z:16},
   {id:'community-farm',kind:'farm',name:'Community Farm',x:16,z:20},
   {id:'quiet-lake',kind:'lake',name:'Mirrorwater Lake',x:34,z:-18},
   {id:'highland-trail',kind:'mountain',name:'Highland Trail',x:-43,z:-27},
   {id:'old-forest',kind:'forest',name:'The Old Forest',x:-34,z:31},
   {id:'windy-hills',kind:'hills',name:'Windy Hills',x:18,z:-39}
  ];
  return Object.freeze(definitions.map(place=>{
   const terrain=sampleCell(seed,place.x,place.z);
   return Object.freeze({...place,groundY:terrain.groundY});
  }));
 }
 function isInsideWorld(x,z){return isInteger(x)&&isInteger(z)&&x>=WORLD_MIN&&x<=WORLD_MAX&&z>=WORLD_MIN&&z<=WORLD_MAX;}
 return Object.freeze({
  GENERATOR_VERSION,CHUNK_SIZE,CHUNK_RADIUS,WORLD_MIN,WORLD_MAX,
  sampleCell,generateChunk,getLandmarks,isInsideWorld
 });
});