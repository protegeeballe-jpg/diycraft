'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const protection=require('../js/three-world-protection.js');

function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\\n'+(error.stack||error));process.exitCode=1;}
}
function screenPoint(actor,project){
 const facing=actor.facing||0;
 return project({
  x:actor.x+Math.sin(facing)*.38,
  y:1.18,
  z:actor.z+Math.cos(facing)*.38
 },actor);
}
function productionPicker(actors,project){
 const source=fs.readFileSync('diycraft.js','utf8');
 const start=source.indexOf('function neighborAtScreen(px,py){');
 const end=source.indexOf(String.fromCharCode(10)+'function animalPositions(',start);
 if(start<0||end<0)throw new Error('Could not locate the original Canvas 2D neighbor picker.');
 const extracted=source.slice(start,end);
 return new Function('cameraState','canvas','project','currentNeighbors',
  extracted+String.fromCharCode(10)+'return neighborAtScreen;'
 )(()=>({}),{clientWidth:390,clientHeight:844},project,()=>actors);
}
const project=point=>({x:point.x*20,y:point.z*20+point.y*0});
const actors=[
 {id:'sleeping',x:0,z:0,facing:0,sleeping:true},
 {id:'first',x:0,z:0,facing:0,sleeping:false},
 {id:'second',x:2,z:0,facing:0,sleeping:false},
 {id:'hidden',x:100,z:100,facing:0,sleeping:false},
 {id:'malformed',x:NaN,z:0,facing:0,sleeping:false}
];

test('matches the original Canvas 2D closest-neighbor picker for screen probes',()=>{
 const original=productionPicker(actors,project);
 const first=screenPoint(actors[1],project),second=screenPoint(actors[2],project);
 const probes=[
  first,
  {x:first.x+28,y:first.y-4},
  second,
  {x:second.x-21,y:second.y+7},
  {x:900,y:800}
 ];
 for(const point of probes){
  const expected=original(point.x,point.y);
  const actual=protection.pickNeighborAtScreen(actors,point.x,point.y,project);
  assert.equal(actual?.id||null,expected?.id||null,
   'The Three.js picker must select the same actor as the original Canvas 2D function.');
 }
});

test('chooses the nearest eligible neighbor and preserves first-in-list tie behavior',()=>{
 const overlapping=[
  {id:'first',x:0,z:0,facing:0},
  {id:'second',x:0,z:0,facing:0}
 ];
 const point=screenPoint(overlapping[0],project);
 assert.equal(protection.pickNeighborAtScreen(overlapping,point.x,point.y,project).id,'first');
 const distinct=[
  {id:'left',x:0,z:0,facing:0},
  {id:'right',x:2,z:0,facing:0}
 ];
 const right=screenPoint(distinct[1],project);
 assert.equal(protection.pickNeighborAtScreen(distinct,right.x+3,right.y,project).id,'right');
});

test('preserves the strict 66-pixel hit radius and ignores sleeping or unprojectable actors',()=>{
 const actor={id:'near',x:0,z:0,facing:0};
 const point=screenPoint(actor,project);
 assert.equal(protection.pickNeighborAtScreen([actor],point.x+65.999,point.y,project),actor);
 assert.equal(protection.pickNeighborAtScreen([actor],point.x+66,point.y,project),null);
 const sleeping={...actor,id:'sleeping',sleeping:true};
 const hidden={...actor,id:'hidden',x:100,z:100};
 assert.equal(protection.pickNeighborAtScreen([sleeping],point.x,point.y,project),null);
 assert.equal(protection.pickNeighborAtScreen([hidden],point.x,point.y,()=>null),null);
 assert.equal(protection.pickNeighborAtScreen([null,{id:'bad',x:NaN,z:0}],point.x,point.y,project),null);
});

test('rejects invalid pick coordinates and projection callbacks',()=>{
 assert.throws(()=>protection.pickNeighborAtScreen([],NaN,0,project),/finite/);
 assert.throws(()=>protection.pickNeighborAtScreen([],0,0,null),/projection callback/);
});
console.log('Three.js neighbor selection parity tests complete.');
