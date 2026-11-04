'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const protection=require('../js/three-world-protection.js');
const source=fs.readFileSync('diycraft.js','utf8');
const start=source.indexOf('function isProtectedDigCell(x,z){');
const end=source.indexOf('\nfunction canStoreItem',start);
if(start<0||end<0)throw new Error('Could not extract the production isProtectedDigCell() function.');
const originalFunction=source.slice(start,end).trim();

function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
function productionCheck(x,z,context){
 const now=(context.timeSeconds||0)*1000;
 const execute=new Function(
  'PROTECTED_NEIGHBOR_HOMES','performance','getTimePalette','currentNeighbors','animalPositions',
  originalFunction+'\nreturn isProtectedDigCell;'
 );
 const fn=execute(
  protection.HOMES,{now:()=>now},()=>({mode:context.mode||'day'}),
  ()=>context.neighbors||[],()=>context.animals||[]
 );
 return fn(x,z);
}
test('protects the same three fixed neighbor-home rectangles as Canvas 2D',()=>{
 const points=[
  [-14,-7,true],[-8,-3,true],[10,-17,true],[15,-12,true],
  [16,-9,true],[20,-5,true],[-20,20,false],[0,0,false]
 ];
 for(const [x,z,expected] of points){
  assert.equal(protection.isProtectedCell(x,z,{}),expected);
  assert.equal(productionCheck(x,z,{mode:'day'}),expected);
 }
});
test('matches the exact neighbor proximity threshold and strict comparison',()=>{
 const context={mode:'day',neighbors:[{id:'n',x:.5,z:.5}],animals:[]};
 assert.equal(protection.isProtectedCell(0,0,context),true);
 assert.equal(protection.isProtectedCell(1,0,context),true,'A 1.0-block offset remains inside the protection radius.');
 assert.equal(protection.isProtectedCell(2,0,context),false);
 const boundary={mode:'day',neighbors:[{x:1.55,z:.5}],animals:[]};
 assert.equal(protection.isProtectedCell(0,0,boundary),false,'The original comparison is strictly less than 1.05.');
 for(const [x,z] of [[0,0],[1,0],[-1,1],[12,-6]])
  assert.equal(protection.isProtectedCell(x,z,context),productionCheck(x,z,context));
});
test('matches the exact animal proximity threshold and strict comparison',()=>{
 const context={mode:'day',neighbors:[],animals:[{id:'pet',x:.5,z:.5}]};
 assert.equal(protection.isProtectedCell(0,0,context),true);
 assert.equal(protection.isProtectedCell(1,0,context),false,'A one-cell offset is beyond the 0.7-block radius.');
 const boundary={neighbors:[],animals:[{x:1.2,z:.5}]};
 assert.equal(protection.isProtectedCell(0,0,boundary),false,'The original comparison is strictly less than 0.7.');
 for(const [x,z] of [[0,0],[1,0],[-1,1],[12,-6]])
  assert.equal(protection.isProtectedCell(x,z,context),productionCheck(x,z,context));
});
test('builds seven default moving neighbors and seven resident animals',()=>{
 const world={timeMode:'day',animals:[]},atZero=protection.actorContext(world,0),later=protection.actorContext(world,8);
 assert.equal(atZero.neighbors.length,7);
 assert.equal(atZero.animals.length,7);
 assert.ok(atZero.neighbors.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)));
 assert.ok(atZero.animals.every(a=>Number.isFinite(a.x)&&Number.isFinite(a.z)));
 assert.notDeepEqual(atZero.neighbors,later.neighbors,'Neighbor protection positions must advance with time.');
 assert.notDeepEqual(atZero.animals,later.animals,'Resident animal protection positions must advance with time.');
});
test('uses night sleep spots and the same automatic day/sunset/night thresholds',()=>{
 const world={timeMode:'night',animals:[]},night=protection.actorContext(world,2);
 assert.equal(night.mode,'night');assert.equal(night.night,true);
 assert.deepEqual(night.neighbors.find(a=>a.id==='hyacinth'),{id:'hyacinth',x:-10.85,z:-4.85});
 assert.deepEqual(night.neighbors.find(a=>a.id==='theo'),{id:'theo',x:12.15,z:-14.85});
 const auto={timeMode:'auto',animals:[]};
 assert.equal(protection.actorContext(auto,0).mode,'day');
 assert.equal(protection.actorContext(auto,100).mode,'sunset');
 assert.equal(protection.actorContext(auto,140).mode,'night');
});
test('includes saved animals exactly once while preserving default resident identities',()=>{
 const world={animals:[
  {id:'sheep',x:100,z:100},
  {id:'saved-cat',x:30,z:30},
  {id:'saved-dog',x:40,z:40}
 ]};
 const context=protection.actorContext(world,3);
 assert.equal(context.animals.length,9);
 const sheep=context.animals.find(a=>a.id==='sheep');
 assert.ok(sheep.x<0&&sheep.z<0,'A saved record with a resident ID must not replace the resident roaming animal.');
 assert.deepEqual(context.animals.find(a=>a.id==='saved-cat'),{id:'saved-cat',x:30,z:30});
 assert.deepEqual(context.animals.find(a=>a.id==='saved-dog'),{id:'saved-dog',x:40,z:40});
});
test('rejects invalid coordinates and invalid protection clocks',()=>{
 assert.throws(()=>protection.isProtectedCell(NaN,0),/finite/);
 assert.throws(()=>protection.actorContext({},Infinity),/finite seconds/);
});
console.log('Three.js world protection tests complete.');
