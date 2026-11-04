'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const camera=require('../js/three-player-camera.js');
const source=fs.readFileSync('diycraft.js','utf8');
const start=source.indexOf('function cameraState(){');
const end=source.indexOf('\nfunction project(',start);
if(start<0||end<0)throw new Error('Could not extract the Canvas 2D cameraState() implementation.');
const productionSource=source.slice(start,end).trim();
function productionPose(player,mode){
 const world={player:{...player}},cameraMode=mode;
 return new Function('world','cameraMode',productionSource+'\nreturn cameraState();')(world,cameraMode);
}
function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
test('matches first-person camera eye offset and player yaw/pitch',()=>{
 const players=[
  {x:0,y:0,z:0,yaw:0,pitch:0},
  {x:12.5,y:-2.25,z:-7.75,yaw:Math.PI/2,pitch:-.32},
  {x:-999,y:4,z:1200,yaw:-2.4,pitch:.81}
 ];
 for(const player of players)assert.deepEqual(camera.pose(player,'first'),productionPose(player,'first'));
});
test('matches third-person follow position, look direction and elevation',()=>{
 const players=[
  {x:0,y:0,z:0,yaw:0,pitch:0},
  {x:12.5,y:-2.25,z:-7.75,yaw:Math.PI/2,pitch:-.32},
  {x:-999,y:4,z:1200,yaw:-2.4,pitch:.81},
  {x:4.5,y:0,z:-5.5,yaw:Math.PI,pitch:.1}
 ];
 for(const player of players){
  const expected=productionPose(player,'third'),actual=camera.pose(player,'third');
  assert.deepEqual(actual.pos,expected.pos);
  assert.ok(Math.abs(actual.yaw-expected.yaw)<1e-12);
  assert.ok(Math.abs(actual.pitch-expected.pitch)<1e-12);
 }
});
test('camera modes place the view on opposite sides of the player',()=>{
 const player={x:3,y:2,z:-4,yaw:.7,pitch:-.2};
 const first=camera.pose(player,'first'),third=camera.pose(player,'third');
 assert.equal(first.pos.x,player.x);assert.equal(first.pos.z,player.z);
 assert.ok(Math.hypot(third.pos.x-player.x,third.pos.z-player.z)>5.5);
 assert.ok(first.pos.y>player.y);
 assert.ok(third.pos.y>player.y);
});
test('rejects invalid player poses and unsupported camera modes',()=>{
 assert.throws(()=>camera.pose(null,'first'),/finite player pose/);
 assert.throws(()=>camera.pose({x:0,y:0,z:0,yaw:NaN,pitch:0},'third'),/finite player pose/);
 assert.throws(()=>camera.pose({x:0,y:0,z:0,yaw:0,pitch:0},'overhead'),/Camera mode/);
});
console.log('Three.js player camera tests complete.');
