'use strict';
const assert=require('node:assert/strict');
const adapter=require('../js/three-world-adapter.js');

function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
const validWorld={
 version:1,name:'Liz garden',timeMode:'sunset',
 player:{x:2.5,y:0,z:-4.25,yaw:1.2,pitch:-.4,shirt:'#123456',bed:{x:1,y:0,z:2,yaw:.5}},
 customBlock:{color:'#AA83D8',texture:'flower'},
 doorDesign:{color:'#a97545',style:'garden'},
 tileDesign:{color:'#C5A98A',pattern:'spiral'},
 solidStyles:{grass:{color:'#70B85A',texture:'grass'},stone:{color:'#9ca6a1',texture:'stone'}},
 blocks:[
  {x:0,y:0,z:0,type:'grass'},
  {x:1,y:0,z:0,type:'dirt',color:'#AABBCC',texture:'dirt'},
  {x:2,y:0,z:0,type:'stone'},
  {x:3,y:0,z:0,type:'wood'},
  {x:4,y:0,z:0,type:'leaves'},
  {x:5,y:0,z:0,type:'brick'},
  {x:6,y:0,z:0,type:'glass'},
  {x:7,y:0,z:0,type:'flower',color:'#e9a4c1'},
  {x:8,y:0,z:0,type:'tall_grass'},
  {x:9,y:0,z:0,type:'sand'},
  {x:10,y:0,z:0,type:'snow'},
  {x:11,y:0,z:0,type:'tile',color:'#C5A98A',tilePattern:'spiral'},
  {x:12,y:0,z:0,type:'door',color:'#a97545',style:'garden',orientation:'ew',swing:-1,open:true},
  {x:13,y:0,z:0,type:'custom',color:'#AA83D8',texture:'flower'}
 ],
 excavations:[[0,0,3],[1,0,1],[2,0,2]],
 waterCells:[[0,0],[1,0],[2,0]],
 waterLevels:[[0,0,2],[1,0,1],[2,0,2]],
 fish:[[0,0],[0,0],[0,0],[0,0],[1,0]],
 bucket:[
  {type:'wood',color:'#a97545',texture:'wood'},
  {type:'tile',color:'#c5a98a',tilePattern:'spiral'},
  {type:'door',color:'#a97545',style:'garden',orientation:'ew',swing:-1,open:true},
  {type:'water'},
  {type:'unknown'}
 ],
 animals:[
  {id:'pip',species:'sheep',name:'Pip',x:1.5,z:2.5,facing:.7,phase:1.4,body:'#ffffff',accent:'#e9a4c1'},
  {id:'pip',species:'cat',name:'Mochi',x:4,z:-1,facing:0,phase:2},
  {id:'buddy',species:'dog',name:'Buddy',x:-2,z:3}
 ]
};

test('maps all supported block types with stable render keys',()=>{
 const s=adapter.createSnapshot(validWorld);
 assert.equal(s.blocks.length,14);
 assert.deepEqual(s.blocks.map(b=>b.type),[
  'grass','dirt','stone','wood','leaves','brick','glass','flower',
  'tall_grass','sand','snow','tile','door','custom'
 ]);
 assert.equal(s.blocks[11].tilePattern,'spiral');
 assert.equal(s.blocks[12].open,true);
 assert.equal(s.blocks[12].orientation,'ew');
 assert.equal(s.blocks[12].swing,-1);
 assert.equal(s.blocks[13].color,'#AA83D8');
 assert.equal(new Set(s.blocks.map(b=>b.key)).size,14);
});
test('retains selected colors and style data without recoloring saved values',()=>{
 const s=adapter.createSnapshot(validWorld);
 assert.equal(s.blocks[1].color,'#AABBCC');
 assert.equal(s.customBlock.color,'#AA83D8');
 assert.equal(s.tileDesign.color,'#C5A98A');
 assert.equal(s.tileDesign.pattern,'spiral');
 assert.equal(s.solidStyles.grass.color,'#70B85A');
 assert.equal(s.player.shirt,'#123456');
});

test('preserves bounded Material Bucket items and normalizes recovered doors',()=>{
 const s=adapter.createSnapshot(validWorld);
 assert.equal(s.bucket.length,4);
 assert.deepEqual(s.bucket[0],{type:'wood',color:'#a97545',texture:'wood'});
 assert.deepEqual(s.bucket[1],{type:'tile',color:'#c5a98a',tilePattern:'spiral'});
 assert.deepEqual(s.bucket[2],{type:'door',color:'#a97545',style:'garden',orientation:'ew',open:false,swing:-1});
 assert.deepEqual(s.bucket[3],{type:'water'});
 const many=adapter.createSnapshot({bucket:Array.from({length:140},()=>({type:'stone'}))});
 assert.equal(many.bucket.length,120);
});

test('keeps normalized renderer colors separate from explicitly configured solid styles',()=>{
 const defaults=adapter.createSnapshot({solidStyles:{}});
 assert.deepEqual(defaults.styledSolidTypes,[]);
 assert.equal(defaults.solidStyles.stone.color,'#9ca6a1','Renderer still receives the normal stone appearance.');
 assert.equal(defaults.solidStyles.stone.texture,'stone');
 const explicit=adapter.createSnapshot({solidStyles:{
  grass:{color:'#123456',texture:'leaves'},
  stone:{color:'#abcdef',texture:'brick'},
  custom:{color:'#112233',texture:'custom'}
 }});
 assert.deepEqual(explicit.styledSolidTypes,['grass','stone']);
 assert.deepEqual(explicit.solidStyles.grass,{color:'#123456',texture:'leaves'});
 assert.deepEqual(explicit.solidStyles.stone,{color:'#abcdef',texture:'brick'});
 assert.ok(Object.isFrozen(explicit.styledSolidTypes));
});
test('preserves bounded materials and crafted pouch slots with production count rules',()=>{
 const s=adapter.createSnapshot({
  materials:[
   {id:'dirt',count:3,label:'Loose soil'},
   {id:'stone',count:150},
   {id:'unknown',count:5},
   null,
   {id:'wood',count:0,label:'Logs'}
  ],
  crafted:[
   {id:'flowerpot',count:2,label:'Little pot'},
   {id:'picnic',count:1}
  ]
 });
 assert.equal(s.materials.length,60);
 assert.deepEqual(s.materials[0],{id:'dirt',count:3,label:'Loose soil'});
 assert.equal(s.materials[1].count,99,'Production inventory count is capped at 99.');
 assert.equal(s.materials[2],null,'Unknown inventory item IDs are ignored.');
 assert.equal(s.materials[3],null);
 assert.deepEqual(s.materials[4],{id:'wood',count:1,label:'Logs'});
 assert.deepEqual(s.crafted[0],{id:'flowerpot',count:2,label:'Little pot'});
 assert.deepEqual(s.crafted[1],{id:'picnic',count:1,label:''});
 assert.equal(s.crafted.length,60);
 assert.ok(Object.isFrozen(s.materials));
 assert.ok(Object.isFrozen(s.materials[0]));
});
test('normalizes layered water and limits fish to three per wet cell',()=>{
 const s=adapter.createSnapshot(validWorld);
 assert.deepEqual(s.water,[
  {x:0,z:0,level:2,depth:3},
  {x:1,z:0,level:1,depth:1},
  {x:2,z:0,level:2,depth:2}
 ]);
 assert.equal(s.fish.length,4);
 assert.deepEqual(s.fish.slice(0,3).map(f=>[f.x,f.z]),[[0,0],[0,0],[0,0]]);
});
test('supports old waterCell-only saves as one water layer',()=>{
 const old={excavations:[[5,-2,4]],waterCells:[[5,-2]]};
 const s=adapter.createSnapshot(old);
 assert.deepEqual(s.water,[{x:5,z:-2,level:1,depth:4}]);
});
test('normalizes animals with unique renderer keys while preserving saved IDs',()=>{
 const s=adapter.createSnapshot(validWorld);
 assert.equal(s.animals.length,3);
 assert.equal(s.animals[0].id,'pip');
 assert.equal(s.animals[1].id,'pip');
 assert.equal(new Set(s.animals.map(a=>a.key)).size,3);
 assert.equal(s.animals[1].species,'cat');
 assert.equal(s.animals[2].facing,0);
 assert.equal(s.animals[2].phase,2*1.7);
});
test('rejects malformed blocks, unknown types, bad colors and invalid coordinates',()=>{
 const s=adapter.createSnapshot({blocks:[
  {x:0,y:0,z:0,type:'grass'},
  {x:1.2,y:0,z:0,type:'grass'},
  {x:0,y:0,z:0,type:'unknown'},
  {x:0,y:65,z:0,type:'grass'},
  {x:0,y:0,z:0,type:'custom',color:'blue'},
  {x:1e12,y:0,z:0,type:'stone'}
 ]});
 assert.equal(s.blocks.length,1);
});
test('keeps the input unchanged and returns a deeply immutable copy',()=>{
 const original=JSON.parse(JSON.stringify(validWorld));
 const before=JSON.stringify(original);
 const s=adapter.createSnapshot(original);
 assert.equal(JSON.stringify(original),before);
 assert.ok(Object.isFrozen(s));
 assert.ok(Object.isFrozen(s.blocks));
 assert.ok(Object.isFrozen(s.blocks[0]));
 assert.ok(Object.isFrozen(s.animals[0]));
});
test('clamps player camera values and preserves valid appearance selections',()=>{
 const s=adapter.createSnapshot({player:{
  x:2e9,y:100,z:-2e9,pitch:9,shirt:'#ABCDEF',hairStyle:'pigtails',
  outfitStyle:'overalls',accessory:'glasses'
 }});
 assert.equal(s.player.x,1e9);
 assert.equal(s.player.y,60);
 assert.equal(s.player.z,-1e9);
 assert.equal(s.player.pitch,1.25);
 assert.equal(s.player.shirt,'#ABCDEF');
 assert.equal(s.player.hairStyle,'pigtails');
 assert.equal(s.player.outfitStyle,'overalls');
 assert.equal(s.player.accessory,'glasses');
});
test('bounds block, terrain, water and animal counts',()=>{
 const blocks=Array.from({length:adapter.limits.blocks+20},(_,i)=>({x:i,y:0,z:0,type:'grass'}));
 const excavations=Array.from({length:adapter.limits.groundCells+20},(_,i)=>[i,0,1]);
 const animals=Array.from({length:adapter.limits.animals+20},(_,i)=>({id:'a'+i,species:'sheep',x:i,z:0}));
 const s=adapter.createSnapshot({blocks,excavations,waterCells:excavations.map(v=>[v[0],v[1]]) ,animals});
 assert.equal(s.blocks.length,adapter.limits.blocks);
 assert.equal(s.excavations.length,adapter.limits.groundCells);
 assert.equal(s.animals.length,adapter.limits.animals);
 assert.equal(s.water.length,adapter.limits.groundCells);
});
test('rejects a non-object world and tolerates missing optional collections',()=>{
 assert.throws(()=>adapter.createSnapshot(null),TypeError);
 const s=adapter.createSnapshot({});
 assert.equal(s.blocks.length,0);
 assert.equal(s.animals.length,0);
 assert.equal(s.timeMode,'day');
 assert.equal(s.player.z,7);
});
console.log('Three.js world adapter tests complete.');
