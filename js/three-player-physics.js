/* Stage 3 deterministic player movement, jumping and fixed-step helpers.
   No DOM, renderer, storage or global game-state dependencies. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreePlayerPhysics=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const CONSTANTS=Object.freeze({
  playerRadius:.23,playerBodyHeight:1.72,playerStepHeight:.18,
  jumpSpeed:6.4,gravity:14.5,walkSpeed:4.2,flySpeed:7,
  worldLimit:1000000000,maxDigDepth:1000000000,flyCeiling:60,
  fixedUpdateStep:1/60,maxFrameDelta:.1,maxFixedStepsPerFrame:6
 });
 function finite(value,fallback=0){return Number.isFinite(value)?value:fallback;}
 function isStationaryRestActivity(activity){return activity==='sleep'||activity==='bed';}
 function collisionAt(environment,x,z,y){
  return typeof environment.playerCollisionAt==='function'&&environment.playerCollisionAt(x,z,y);
 }
 function step(state,controls,environment,dt){
  if(!state||typeof state!=='object'||!state.player||typeof state.player!=='object')
   throw new TypeError('A player physics state is required.');
  if(!controls||typeof controls!=='object'||!environment||typeof environment!=='object')
   throw new TypeError('Player controls and a physics environment are required.');
  if(!Number.isFinite(dt)||dt<0||dt>.1+1e-9)
   throw new RangeError('Player physics step must be between 0 and 0.1 seconds.');
  const player={...state.player};
  if(![player.x,player.y,player.z,player.yaw].every(Number.isFinite))
   throw new TypeError('Player position and yaw must be finite numbers.');
  let moveX=finite(controls.moveX),moveZ=finite(controls.moveZ),vertical=finite(controls.vertical);
  let keys=controls.keys&&typeof controls.keys==='object'?{...controls.keys}:{};
  let jumpVelocity=finite(state.jumpVelocity),playerGrounded=!!state.playerGrounded;
  let flying=!!state.flying,playerActivity=typeof state.playerActivity==='string'?state.playerActivity:'';
  let saveRequested=false;
  const save=()=>{saveRequested=true;if(typeof environment.save==='function')environment.save();};
  if(isStationaryRestActivity(playerActivity)){
   moveX=0;moveZ=0;vertical=0;keys={};jumpVelocity=0;
   return {player,jumpVelocity,playerGrounded,flying,playerActivity,
    controls:{moveX,moveZ,vertical,keys},saveRequested};
  }
  const speed=flying?CONSTANTS.flySpeed:CONSTANTS.walkSpeed;
  if(playerActivity&&playerActivity!=='transformer'&&
    (moveX!==0||moveZ!==0||vertical!==0||keys.w||keys.a||keys.s||keys.d||
     keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight))playerActivity='';
  if(typeof environment.nudgePlayer==='function'){
   const nudged=environment.nudgePlayer({...player});
   if(nudged&&typeof nudged==='object'){
    if(Number.isFinite(nudged.x))player.x=nudged.x;
    if(Number.isFinite(nudged.y))player.y=nudged.y;
    if(Number.isFinite(nudged.z))player.z=nudged.z;
    if(nudged.saveRequested)save();
   }
  }
  const groundDepth=typeof environment.groundDepthAt==='function'?finite(environment.groundDepthAt(player.x,player.z)):0;
  const terrainFloor=-groundDepth;
  const surface=typeof environment.surfaceHeightAt==='function'?environment.surfaceHeightAt:null;
  if(!surface)throw new TypeError('surfaceHeightAt is required.');
  if(player.y<terrainFloor-.04){
   player.y=surface(player.x,player.z,player.y);jumpVelocity=0;playerGrounded=true;save();
  }
  let forward=moveZ,right=moveX;
  if(keys.w||keys.ArrowUp)forward+=1;
  if(keys.s||keys.ArrowDown)forward-=1;
  if(keys.a||keys.ArrowLeft)right-=1;
  if(keys.d||keys.ArrowRight)right+=1;
  const length=Math.hypot(forward,right)||1;
  forward/=length;right/=length;
  const dx=(Math.sin(player.yaw)*forward+Math.cos(player.yaw)*right)*speed*dt;
  const dz=(-Math.cos(player.yaw)*forward+Math.sin(player.yaw)*right)*speed*dt;
  const nextX=Math.max(-CONSTANTS.worldLimit+1,Math.min(CONSTANTS.worldLimit-1,player.x+dx));
  const nextZ=Math.max(-CONSTANTS.worldLimit+1,Math.min(CONSTANTS.worldLimit-1,player.z+dz));
  if(!collisionAt(environment,nextX,player.z,player.y))player.x=nextX;
  if(!collisionAt(environment,player.x,nextZ,player.y))player.z=nextZ;
  if(flying){
   let velocity=vertical;
   if(keys[' '])velocity+=1;
   if(keys.Shift)velocity-=1;
   const nextY=Math.max(-CONSTANTS.maxDigDepth,Math.min(CONSTANTS.flyCeiling,player.y+velocity*speed*dt));
   if(!collisionAt(environment,player.x,player.z,nextY))player.y=nextY;
   jumpVelocity=0;playerGrounded=true;
   return {player,jumpVelocity,playerGrounded,flying,playerActivity,
    controls:{moveX,moveZ,vertical,keys},saveRequested};
  }
  const before=player.y;
  if(playerGrounded){
   const floor=surface(player.x,player.z,player.y);
   if(floor<player.y-.04){playerGrounded=false;jumpVelocity=0;}
   else if(floor<=player.y+CONSTANTS.playerStepHeight){player.y=floor;return {player,jumpVelocity,playerGrounded,flying,playerActivity,controls:{moveX,moveZ,vertical,keys},saveRequested};}
   else {player.y=floor;jumpVelocity=0;save();return {player,jumpVelocity,playerGrounded,flying,playerActivity,controls:{moveX,moveZ,vertical,keys},saveRequested};}
  }
  jumpVelocity-=CONSTANTS.gravity*dt;
  let next=player.y+jumpVelocity*dt;
  if(jumpVelocity>0&&collisionAt(environment,player.x,player.z,next)){jumpVelocity=0;next=player.y;}
  if(jumpVelocity<=0){
   const floor=surface(player.x,player.z,player.y);
   if(next<=floor){
    player.y=floor;jumpVelocity=0;playerGrounded=true;save();
    return {player,jumpVelocity,playerGrounded,flying,playerActivity,controls:{moveX,moveZ,vertical,keys},saveRequested};
   }
   if(next<=-CONSTANTS.maxDigDepth&&before>=-CONSTANTS.maxDigDepth){
    player.y=-CONSTANTS.maxDigDepth;jumpVelocity=0;playerGrounded=true;save();
    return {player,jumpVelocity,playerGrounded,flying,playerActivity,controls:{moveX,moveZ,vertical,keys},saveRequested};
   }
  }
  player.y=Math.max(-CONSTANTS.maxDigDepth,next);
  return {player,jumpVelocity,playerGrounded,flying,playerActivity,
   controls:{moveX,moveZ,vertical,keys},saveRequested};
 }
 function jump(state){
  if(!state||typeof state!=='object')throw new TypeError('A player physics state is required.');
  if(isStationaryRestActivity(state.playerActivity)||state.playerActivity==='transformer')
   return {state:{...state},accepted:false,reason:'activity'};
  if(state.flying)return {state:{...state},accepted:false,reason:'flying'};
  if(!state.playerGrounded)return {state:{...state},accepted:false,reason:'airborne'};
  return {state:{...state,playerActivity:'',jumpVelocity:CONSTANTS.jumpSpeed,playerGrounded:false},accepted:true,reason:null};
 }
 function interpolate(previous,current,alpha){
  if(!previous||!current)throw new TypeError('Previous and current player render states are required.');
  const t=Math.max(0,Math.min(1,finite(alpha)));
  const yawDelta=Math.atan2(Math.sin(current.yaw-previous.yaw),Math.cos(current.yaw-previous.yaw));
  return {
   x:previous.x+(current.x-previous.x)*t,
   y:previous.y+(current.y-previous.y)*t,
   z:previous.z+(current.z-previous.z)*t,
   yaw:previous.yaw+yawDelta*t,
   pitch:previous.pitch+(current.pitch-previous.pitch)*t
  };
 }
 function createFixedStepper(options={}){
  const step=finite(options.step,CONSTANTS.fixedUpdateStep);
  const maxDelta=finite(options.maxDelta,CONSTANTS.maxFrameDelta);
  const maxSteps=finite(options.maxSteps,CONSTANTS.maxFixedStepsPerFrame);
  if(step<=0||maxDelta<=0||maxSteps<1||!Number.isInteger(maxSteps))
   throw new RangeError('Invalid fixed-step clock settings.');
  let accumulator=0;
  return Object.freeze({
   advance(frameElapsedMs,update){
    if(typeof update!=='function')throw new TypeError('A fixed-step update callback is required.');
    const elapsed=Math.min(maxDelta,Math.max(0,finite(frameElapsedMs)/1000));
    accumulator=Math.min(accumulator+elapsed,step*maxSteps);
    let steps=0;
    while(accumulator+1e-9>=step&&steps<maxSteps){update(step);accumulator-=step;steps++;}
    return Object.freeze({steps,alpha:Math.max(0,Math.min(1,accumulator/step)),accumulator,elapsed});
   },
   reset(){accumulator=0;},
   get accumulator(){return accumulator;},
   get stepSeconds(){return step;}
  });
 }
 return Object.freeze({CONSTANTS,isStationaryRestActivity,step,jump,interpolate,createFixedStepper});
});
