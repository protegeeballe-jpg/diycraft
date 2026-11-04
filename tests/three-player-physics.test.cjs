'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const physics=require('../js/three-player-physics.js');
const sandboxApi=require('../js/three-world-edit-sandbox.js');
const source=fs.readFileSync('diycraft.js','utf8');
const moveStart=source.indexOf('function move(dt){');
const moveEnd=source.indexOf('\nconst FIXED_UPDATE_STEP',moveStart);
if(moveStart<0||moveEnd<0)throw new Error('Could not locate the production move(dt) implementation.');
const productionMoveSource=source.slice(moveStart,moveEnd).trim();
const jumpStart=source.indexOf('function jump(){');
const jumpEnd=source.indexOf('\nfunction isStationaryRestActivity',jumpStart);
if(jumpStart<0||jumpEnd<0)throw new Error('Could not locate the production jump() implementation.');
const productionJumpSource=source.slice(jumpStart,jumpEnd).trim();

function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
function fixture(){
 return {
  source:'diycraft-world-v1',name:'Physics fixture',
  blocks:[
   {key:'wall',type:'stone',x:2,y:0,z:0},
   {key:'tile',type:'tile',x:0,y:0,z:-2,color:'#c5a98a',tilePattern:'grid'},
   {key:'plant',type:'flower',x:3,y:0,z:0},
   {key:'door',type:'door',x:4,y:0,z:0,open:false,orientation:'ns',swing:1}
  ],
  excavations:[{x:0,z:2,depth:2},{x:1,z:2,depth:1}],
  water:[],fish:[],bucket:[]
 };
}
function createEnvironment(){
 const edit=sandboxApi.create(fixture());
 return {
  edit,
  environment:{
   groundDepthAt:(x,z)=>edit.groundDepthAt(x,z),
   surfaceHeightAt:(x,z,y)=>edit.surfaceHeightAt(x,z,y),
   playerCollisionAt:(x,z,y)=>edit.playerCollisionAt(x,z,y),
   nudgePlayer:player=>player
  }
 };
}
function runProductionMove(state,controls,environment,dt){
 const world={player:{...state.player}};
 let playerActivity=state.playerActivity||'',moveX=controls.moveX||0,moveZ=controls.moveZ||0,vertical=controls.vertical||0;
 let keys={...(controls.keys||{})},flying=!!state.flying,playerGrounded=!!state.playerGrounded;
 let jumpVelocity=Number.isFinite(state.jumpVelocity)?state.jumpVelocity:0,saved=false;
 const isStationaryRestActivity=activity=>activity==='sleep'||activity==='bed';
 const nudgePlayerOutOfBlocks=()=>{};
 const groundDepthAt=environment.groundDepthAt;
 const surfaceHeightAt=environment.surfaceHeightAt;
 const playerCollisionAt=environment.playerCollisionAt;
 const save=()=>{saved=true;};
 const run=new Function(
  'world','isStationaryRestActivity','playerActivity','moveX','moveZ','vertical','keys','flying',
  'WORLD_LIMIT','MAX_DIG_DEPTH','nudgePlayerOutOfBlocks','groundDepthAt','PLAYER_GRAVITY',
  'playerCollisionAt','playerGrounded','jumpVelocity','surfaceHeightAt','dt',
  'let saved=false; const save=()=>{saved=true;};\n'+productionMoveSource+
  '\nmove(dt); return {player:world.player, jumpVelocity, playerGrounded, flying, playerActivity, controls:{moveX,moveZ,vertical,keys},saveRequested:saved};'
 );
 return run(world,isStationaryRestActivity,playerActivity,moveX,moveZ,vertical,keys,flying,
  1000000000,1000000000,nudgePlayerOutOfBlocks,groundDepthAt,14.5,playerCollisionAt,
  playerGrounded,jumpVelocity,surfaceHeightAt,dt);
}
function runProductionJump(state){
 let playerActivity=state.playerActivity||'',flying=!!state.flying;
 let playerGrounded=!!state.playerGrounded,jumpVelocity=Number.isFinite(state.jumpVelocity)?state.jumpVelocity:0;
 const isStationaryRestActivity=activity=>activity==='sleep'||activity==='bed';
 const showStatus=()=>{};
 const run=new Function('isStationaryRestActivity','playerActivity','flying','playerGrounded','jumpVelocity','PLAYER_JUMP_SPEED','showStatus',
  productionJumpSource+'\njump(); return {playerActivity,flying,playerGrounded,jumpVelocity};');
 return run(isStationaryRestActivity,playerActivity,flying,playerGrounded,jumpVelocity,6.4,showStatus);
}
function compareMove(state,controls,dt){
 const {environment}=createEnvironment();
 const actual=physics.step(state,controls,environment,dt);
 const expected=runProductionMove(state,controls,environment,dt);
 assert.deepEqual(actual.player,expected.player,'Player position must match production move(dt).');
 assert.equal(actual.jumpVelocity,expected.jumpVelocity,'Jump velocity must match production move(dt).');
 assert.equal(actual.playerGrounded,expected.playerGrounded,'Grounded state must match production move(dt).');
 assert.equal(actual.flying,expected.flying);
 assert.equal(actual.playerActivity,expected.playerActivity);
 assert.deepEqual(actual.controls,expected.controls);
 assert.equal(actual.saveRequested,expected.saveRequested);
 return actual;
}

test('uses the sandbox unsticking callback before the next movement step',()=>{
 const {edit,environment}=createEnvironment();
 environment.nudgePlayer=player=>edit.nudgePlayerOutOfBlocks(player);
 const state={player:{x:2.5,y:0,z:.5,yaw:0},jumpVelocity:0,playerGrounded:true,flying:false,playerActivity:''};
 const result=physics.step(state,{moveX:0,moveZ:0,vertical:0,keys:{}},environment,0);
 assert.equal(result.saveRequested,true,'Recovering the player from an embedded block must request a save just like the production function.');
 assert.equal(edit.playerCollisionAt(result.player.x,result.player.z,result.player.y),false);
 assert.notEqual(result.player.x,state.player.x);
 assert.ok(Math.abs(result.player.y-state.player.y)<1e-12,'Collision recovery must preserve the player height.');
});
test('ports keyboard and touch movement direction, normalization and yaw transforms',()=>{
 const cases=[
  [{x:0,y:0,z:0,yaw:0},{moveX:0,moveZ:1,vertical:0,keys:{}},1/60],
  [{x:0,y:0,z:0,yaw:Math.PI/2},{moveX:0,moveZ:1,vertical:0,keys:{}},1/60],
  [{x:0,y:0,z:0,yaw:.73},{moveX:.6,moveZ:.8,vertical:0,keys:{}},1/60],
  [{x:0,y:0,z:0,yaw:0},{moveX:0,moveZ:0,vertical:0,keys:{w:true,d:true}},1/60],
  [{x:0,y:0,z:0,yaw:0},{moveX:.7,moveZ:-.4,vertical:0,keys:{ArrowUp:true,ArrowLeft:true}},1/60]
 ];
 for(const [player,controls,dt] of cases){
  compareMove({player,jumpVelocity:0,playerGrounded:true,flying:false,playerActivity:''},controls,dt);
 }
});
test('resolves X and Z independently so movement slides along solid walls',()=>{
 const {environment}=createEnvironment();
 environment.playerCollisionAt=(x,z)=>x>=1.73;
 const state={player:{x:1.7,y:0,z:0,yaw:Math.PI/4},jumpVelocity:0,playerGrounded:true,flying:false,playerActivity:''};
 const controls={moveX:0,moveZ:1,vertical:0,keys:{}};
 const expected=runProductionMove(state,controls,environment,1/60);
 const actual=physics.step(state,controls,environment,1/60);
 assert.deepEqual(actual.player,expected.player);
 assert.equal(actual.player.x,1.7,'The blocked X axis must remain fixed.');
 assert.notEqual(actual.player.z,0,'The free Z axis must still advance.');
});
test('matches stepping, elevated block tops and player falling/landing',()=>{
 const cases=[
  {player:{x:.5,y:0,z:-2.5,yaw:0},jumpVelocity:0,playerGrounded:true,flying:false,playerActivity:''},
  {player:{x:2.5,y:0,z:.5,yaw:0},jumpVelocity:0,playerGrounded:true,flying:false,playerActivity:''},
  {player:{x:0.5,y:2.5,z:0.5,yaw:0},jumpVelocity:-2,playerGrounded:false,flying:false,playerActivity:''},
  {player:{x:0.5,y:.08,z:.5,yaw:0},jumpVelocity:-1,playerGrounded:false,flying:false,playerActivity:''},
  {player:{x:0.5,y:-1.8,z:2.5,yaw:0},jumpVelocity:0,playerGrounded:false,flying:false,playerActivity:''}
 ];
 for(const state of cases)compareMove(state,{moveX:0,moveZ:0,vertical:0,keys:{}},1/60);
});
test('corrects player falling below the excavated terrain floor',()=>{
 const state={player:{x:.5,y:-3,z:2.5,yaw:0},jumpVelocity:-4,playerGrounded:false,flying:false,playerActivity:''};
 const result=compareMove(state,{moveX:0,moveZ:0,vertical:0,keys:{}},1/60);
 assert.equal(result.player.y,-2);
 assert.equal(result.jumpVelocity,0);
 assert.equal(result.playerGrounded,true);
 assert.equal(result.saveRequested,true);
});
test('matches flying movement, vertical controls, collision, and ceiling/floor clamps',()=>{
 const cases=[
  {state:{player:{x:.5,y:3,z:.5,yaw:0},jumpVelocity:4,playerGrounded:false,flying:true,playerActivity:''},controls:{moveX:0,moveZ:1,vertical:1,keys:{' ':true}}},
  {state:{player:{x:.5,y:3,z:.5,yaw:0},jumpVelocity:4,playerGrounded:false,flying:true,playerActivity:''},controls:{moveX:0,moveZ:0,vertical:0,keys:{Shift:true}}},
  {state:{player:{x:.5,y:59.95,z:.5,yaw:0},jumpVelocity:0,playerGrounded:true,flying:true,playerActivity:''},controls:{moveX:0,moveZ:0,vertical:1,keys:{' ':true}}},
  {state:{player:{x:.5,y:-999999999.95,z:.5,yaw:0},jumpVelocity:0,playerGrounded:true,flying:true,playerActivity:''},controls:{moveX:0,moveZ:0,vertical:-1,keys:{Shift:true}}}
 ];
 for(const item of cases)compareMove(item.state,item.controls,1/60);
});
test('resets activity during ordinary movement but lets Transformer activity keep moving',()=>{
 const moving={moveX:0,moveZ:1,vertical:0,keys:{}};
 const ordinary=compareMove({player:{x:0,y:0,z:0,yaw:0},jumpVelocity:0,playerGrounded:true,flying:false,playerActivity:'dance'},moving,1/60);
 assert.equal(ordinary.playerActivity,'');
 const transformer=compareMove({player:{x:0,y:0,z:0,yaw:0},jumpVelocity:0,playerGrounded:true,flying:false,playerActivity:'transformer'},moving,1/60);
 assert.equal(transformer.playerActivity,'transformer');
});
test('keeps sleep and bed stationary and clears input and jump velocity',()=>{
 for(const activity of ['sleep','bed']){
  const result=compareMove(
   {player:{x:0,y:0,z:0,yaw:0},jumpVelocity:6.4,playerGrounded:false,flying:false,playerActivity:activity},
   {moveX:1,moveZ:1,vertical:1,keys:{w:true,Shift:true,' ':true}},1/60
  );
  assert.equal(result.player.z,0);
  assert.equal(result.jumpVelocity,0);
  assert.deepEqual(result.controls,{moveX:0,moveZ:0,vertical:0,keys:{}});
 }
});
test('clamps world coordinates before collision checks',()=>{
 const result=compareMove(
  {player:{x:999999999.99,y:0,z:-999999999.99,yaw:Math.PI/2},jumpVelocity:0,playerGrounded:true,flying:false,playerActivity:''},
  {moveX:0,moveZ:1,vertical:0,keys:{}},.1
 );
 assert.ok(result.player.x<=999999999&&result.player.z>=-999999999);
});
test('jump helper matches production acceptance and rejection conditions',()=>{
 const cases=[
  {playerActivity:'',flying:false,playerGrounded:true,jumpVelocity:0,expected:true},
  {playerActivity:'',flying:false,playerGrounded:false,jumpVelocity:0,expected:false},
  {playerActivity:'',flying:true,playerGrounded:true,jumpVelocity:0,expected:false},
  {playerActivity:'sleep',flying:false,playerGrounded:true,jumpVelocity:0,expected:false},
  {playerActivity:'bed',flying:false,playerGrounded:true,jumpVelocity:0,expected:false},
  {playerActivity:'transformer',flying:false,playerGrounded:true,jumpVelocity:0,expected:false}
 ];
 for(const item of cases){
  const {expected:accepted,...state}=item;
  const production=runProductionJump(state),actual=physics.jump(state);
  assert.deepEqual(actual.state,production);
  assert.equal(actual.accepted,accepted);
  if(actual.accepted){assert.equal(actual.state.jumpVelocity,6.4);assert.equal(actual.state.playerGrounded,false);}
 }
});
test('interpolates the shortest yaw arc and clamps alpha',()=>{
 const previous={x:0,y:1,z:2,yaw:Math.PI-.1,pitch:-.2};
 const current={x:10,y:3,z:4,yaw:-Math.PI+.1,pitch:.2};
 const middle=physics.interpolate(previous,current,.5);
 assert.equal(middle.x,5);assert.equal(middle.y,2);assert.equal(middle.z,3);
 assert.ok(Math.abs(middle.yaw-Math.PI)<1e-9);
 assert.equal(middle.pitch,0);
 assert.deepEqual(physics.interpolate(previous,current,-1),previous);
 const end=physics.interpolate(previous,current,2);
 assert.equal(end.x,current.x);assert.equal(end.y,current.y);assert.equal(end.z,current.z);assert.equal(end.pitch,current.pitch);
 assert.ok(Math.abs(Math.atan2(Math.sin(end.yaw-current.yaw),Math.cos(end.yaw-current.yaw)))<1e-9,'The final interpolated yaw must be angularly equivalent across the ±π boundary.');
});
test('fixed-step clock clamps tab stalls and never exceeds six 60 Hz updates per frame',()=>{
 const clock=physics.createFixedStepper();
 const ticks=[];
 const first=clock.advance(1000,dt=>ticks.push(dt));
 assert.equal(first.elapsed,.1);
 assert.equal(first.steps,6);
 assert.equal(ticks.length,6);
 assert.ok(first.accumulator<1e-9);
 const half=clock.advance(1000/120,()=>{});
 assert.equal(half.steps,0);
 assert.ok(Math.abs(half.alpha-.5)<1e-9);
 const second=clock.advance(1000/120,()=>{});
 assert.equal(second.steps,1);
 assert.ok(second.alpha<1e-9);
 clock.reset();
 assert.equal(clock.accumulator,0);
});
test('rejects invalid simulation states, environments and time steps',()=>{
 assert.throws(()=>physics.step(null,{}, {},1/60),/state/);
 assert.throws(()=>physics.step({player:{}},null,{},1/60),/controls/);
 assert.throws(()=>physics.step({player:{x:0,y:0,z:0,yaw:0}},{},{},1),/between 0 and 0.1/);
 assert.throws(()=>physics.step({player:{x:NaN,y:0,z:0,yaw:0}},{},{},1/60),/finite/);
 assert.throws(()=>physics.createFixedStepper({step:0}),/Invalid/);
});
console.log('Three.js player physics tests complete.');
