/* Stage 2 browser sandbox. All editing is confined to a cloned snapshot. */
(function(){
'use strict';
const THREE=window.THREE,adapter=window.DIYCraftThreeWorldAdapter;
const painterly=window.DIYCraftPainterlyMaterials,editing=window.DIYCraftThreeEditSandbox;
const raycastKeys=window.DIYCraftThreeRaycast,doorMotion=window.DIYCraftThreeDoorMotion,performanceProfiles=window.DIYCraftThreePerformanceProfile,plantGeometryFactory=window.DIYCraftThreePlantGeometry,doorModels=window.DIYCraftThreeDoorModel,animalGeometryFactory=window.DIYCraftThreeAnimalGeometry;
const playerPhysics=window.DIYCraftThreePlayerPhysics,playerCamera=window.DIYCraftThreePlayerCamera,playerModelFactory=window.DIYCraftThreePlayerModel,neighborModelFactory=window.DIYCraftThreeNeighborModels,coloring=window.DIYCraftThreeNeighborColoring,protection=window.DIYCraftThreeWorldProtection;
const canvas=document.getElementById('three-world'),status=document.getElementById('status');
if(!THREE||!adapter||!painterly||!editing||!raycastKeys||!doorMotion||!performanceProfiles||!plantGeometryFactory||!doorModels||!animalGeometryFactory||!playerPhysics||!playerCamera||!playerModelFactory||!neighborModelFactory||!coloring||!protection||!protection.pickAnimalAtScreen)throw new Error('A local Three.js sandbox dependency did not load.');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xf2ead9);scene.fog=new THREE.Fog(0xf2ead9,30,75);
const camera=new THREE.PerspectiveCamera(48,1,.1,150);
const deviceSignals=performanceProfiles.browserCapabilities(window.navigator,!!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches),4096,false);
const performanceProfile=performanceProfiles.select(deviceSignals),frameGate=performanceProfiles.createFrameGate(performanceProfile.fpsCap);
const renderer=new THREE.WebGLRenderer({canvas,antialias:performanceProfile.antialias,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,performanceProfile.maxPixelRatio));renderer.setSize(innerWidth,innerHeight,false);
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
renderer.shadowMap.enabled=performanceProfile.shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight(0xfff7e9,0x788b70,.86));
const sun=new THREE.DirectionalLight(0xfff0d5,1.05);sun.position.set(-14,23,16);sun.castShadow=performanceProfile.shadows;sun.shadow.mapSize.set(performanceProfile.shadows?1024:1,performanceProfile.shadows?1024:1);scene.add(sun);
const fill=new THREE.DirectionalLight(0xc5d9e8,.24);fill.position.set(12,9,-15);scene.add(fill);
const materials=painterly.create(THREE,renderer,performanceProfile);
const floorMat=new THREE.MeshStandardMaterial({color:0x789767,roughness:1});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(90,90),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.08;floor.receiveShadow=true;scene.add(floor);
const group=new THREE.Group();scene.add(group);
const boxGeometry=new THREE.BoxGeometry(1,1,1),tileGeometry=new THREE.BoxGeometry(1,.13,1),doorGeometry=new THREE.BoxGeometry(doorModels.dimensions.width,doorModels.dimensions.height,doorModels.dimensions.thickness);
const plantStemGeometry=new THREE.CylinderGeometry(.025,.04,.78,6),plantLeafGeometry=new THREE.SphereGeometry(.20,8,6),plantPetalGeometry=new THREE.SphereGeometry(.15,8,6),plantCenterGeometry=new THREE.SphereGeometry(.085,8,6),grassBladeGeometry=new THREE.ConeGeometry(.065,.72,5);
const animatedPlants=[],animalSurfaceMaterial=materials.get('#ffffff','paper');
animalSurfaceMaterial.vertexColors=true;animalSurfaceMaterial.needsUpdate=true;
let animalBatches=[],renderedAnimalCount=0,animalStatesCache=[],animalCareSelection=null,animalCareFlashUntil=0,animalCareFlashEmoji='💚',animalCareFlashAnimalId=null;
const residentAnimalIds=new Set(protection.RESIDENTS.map(animal=>animal.id));
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const fishGeometry=new THREE.BufferGeometry();
fishGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
 0,0,0,-.08,0,-.075,.10,0,-.055,.18,0,0,.10,0,.055,-.08,0,.075,
 -.16,0,0,-.30,0,-.09,-.30,0,.09
],3));
fishGeometry.setIndex([0,2,1,0,3,2,0,4,3,0,5,4,6,8,7]);fishGeometry.computeVertexNormals();
const fishColors=['#f1ad55','#f28c72','#f2d56b','#72c4cb'];
let sandbox=null,originalJson=null,sourceSnapshot=null,selected=null,lastPlacement=null,meshByKey=new Map(),blockByKey=new Map(),doorMotions=new Map(),playerPhysicsEnvironment=null;
let waterMesh=null,fishMeshes=[],renderedFishCount=0,lastWaterAnimationAt=-Infinity;
let playerPhysicsState=null,playerModelRoot=null,playerPlayMode=false,playerCameraMode='third',playerCameraPose=null,lastPlayerPhysicsTime=0;
let neighborColorName='',neighborColorPage=null,neighborColorTool='fill',neighborColorUndo=[],neighborColorDrawing=false,neighborColorLast=null,neighborColorTimer=null,neighborColorHideTimer=null,neighborColorStep=0;
const neighborColorShade=document.getElementById('neighbor-coloring');
const animalCareShade=document.getElementById('animal-care'),animalCareFlash=document.getElementById('animal-care-flash');
const neighborColorCanvas=document.getElementById('neighbor-color-canvas');
const neighborColorCtx=neighborColorCanvas.getContext('2d',{willReadFrequently:true});

const neighborModels=new Map();let renderedNeighborCount=0,neighborStatesCache=[];
let playerControls={moveX:0,moveZ:0,vertical:0,keys:{}},touchDirections=new Set(),physicsClock=playerPhysics.createFixedStepper();
const touchControls=document.getElementById('player-controls'),playModeButton=document.getElementById('play-mode'),cameraModeButton=document.getElementById('camera-mode'),jumpButton=document.getElementById('jump'),flightButton=document.getElementById('flight');
let target=new THREE.Vector3(0,1,0),orbit={radius:38,theta:.62,phi:.88};
function cameraUpdate(){
 if(playerPlayMode&&playerPhysicsState){updatePlayerCamera();return;}
 orbit.phi=Math.max(.2,Math.min(1.3,orbit.phi));
 camera.position.set(target.x+orbit.radius*Math.sin(orbit.phi)*Math.sin(orbit.theta),target.y+orbit.radius*Math.cos(orbit.phi),target.z+orbit.radius*Math.sin(orbit.phi)*Math.cos(orbit.theta));
 camera.lookAt(target);
}
function buildNeighborModels(){
 if(!sandbox||neighborModels.size)return;
 const actors=sandbox.characterStates(performance.now()/1000);
 for(const actor of actors){
  const model=neighborModelFactory.create(THREE,materials,actor,performanceProfile.shadows);
  model.root.visible=false;scene.add(model.root);neighborModels.set(actor.id,model);
 }
}
function updateNeighborModels(now=performance.now()){
 if(!sandbox||!neighborModels.size)return;
 const timeSeconds=now/1000,actors=sandbox.characterStates(timeSeconds),cameraX=camera.position.x,cameraZ=camera.position.z;
 neighborStatesCache=actors;renderedNeighborCount=0;
 for(const actor of actors){
  const model=neighborModels.get(actor.id);if(!model)continue;
  model.update(actor,timeSeconds);
  const near=Math.hypot(actor.x-cameraX,actor.z-cameraZ)<=26;
  model.root.visible=!actor.sleeping&&near;
  if(model.root.visible)renderedNeighborCount++;
 }
}
function updatePlayerModel(){
 if(!playerModelRoot||!playerPhysicsState)return;
 playerModelFactory.update(playerModelRoot,playerPhysicsState.player);
 playerModelRoot.visible=!(playerPlayMode&&playerCameraMode==='first');
}
function updatePlayerCamera(){
 if(!playerPhysicsState)return;
 playerCameraPose=playerCamera.pose(playerPhysicsState.player,playerCameraMode);
 const pose=playerCameraPose,cp=Math.cos(pose.pitch);
 camera.position.set(pose.pos.x,pose.pos.y,pose.pos.z);
 const look=new THREE.Vector3(
  pose.pos.x+Math.sin(pose.yaw)*cp,
  pose.pos.y+Math.sin(pose.pitch),
  pose.pos.z-Math.cos(pose.yaw)*cp
 );
 camera.lookAt(look);
 updatePlayerModel();
}
function updatePlayerDiagnostics(){
 const debug=window.__DIYCRAFT_THREE_EDIT__;if(!debug)return;
 debug.playerMode=playerPlayMode;debug.cameraMode=playerCameraMode;
 debug.getPlayerState=()=>playerPhysicsState?{
  player:{...playerPhysicsState.player},jumpVelocity:playerPhysicsState.jumpVelocity,
  playerGrounded:playerPhysicsState.playerGrounded,flying:playerPhysicsState.flying,
  playerActivity:playerPhysicsState.playerActivity
 }:null;
 debug.getPlayerCamera=()=>playerCameraPose?{pos:{...playerCameraPose.pos},yaw:playerCameraPose.yaw,pitch:playerCameraPose.pitch}:null;
}
function syncPlayerButtons(){
 playModeButton.textContent=playerPlayMode?'Exit Play Mode':'Enter Play Mode';
 cameraModeButton.disabled=!playerPlayMode;jumpButton.disabled=!playerPlayMode;flightButton.disabled=!playerPlayMode;
 cameraModeButton.textContent=playerCameraMode==='third'?'First person':'Third person';
 flightButton.textContent=playerPhysicsState?.flying?'Flight on':'Flight off';
 touchControls.hidden=!playerPlayMode;
}
function syncTouchMovement(){
 playerControls.moveX=(touchDirections.has('right')?1:0)-(touchDirections.has('left')?1:0);
 playerControls.moveZ=(touchDirections.has('forward')?1:0)-(touchDirections.has('back')?1:0);
}
function clearPlayerInputs(){
 playerControls={moveX:0,moveZ:0,vertical:0,keys:{}};
 touchDirections.clear();
}
function setPlayerPlayMode(enabled){
 playerPlayMode=!!enabled;
 clearPlayerInputs();physicsClock.reset();lastPlayerPhysicsTime=performance.now();
 if(playerPlayMode){
  playerCameraMode='third';
  status.textContent='Play mode · WASD / arrows or touch pad to move · Space to jump · F for flight';
  updatePlayerCamera();
 }else{
  status.textContent='Build mode · Drag to orbit · Scroll to zoom · Click to select and edit';
  if(playerModelRoot)playerModelRoot.visible=true;
  cameraUpdate();
 }
 syncPlayerButtons();updatePlayerDiagnostics();
}
function jumpPlayer(){
 if(!playerPlayMode||!playerPhysicsState)return;
 const result=playerPhysics.jump(playerPhysicsState);
 playerPhysicsState=result.state;
 status.textContent=result.accepted?'Jump!':'Jump is unavailable while flying, airborne, or resting.';
 updatePlayerModel();updatePlayerDiagnostics();
}
function togglePlayerFlight(){
 if(!playerPlayMode||!playerPhysicsState)return;
 playerPhysicsState={...playerPhysicsState,flying:!playerPhysicsState.flying,jumpVelocity:0};
 status.textContent=playerPhysicsState.flying?'Creative flight enabled.':'Flight turned off.';
 syncPlayerButtons();updatePlayerDiagnostics();
}
playModeButton.addEventListener('click',()=>setPlayerPlayMode(!playerPlayMode));
cameraModeButton.addEventListener('click',()=>{
 if(!playerPlayMode)return;
 playerCameraMode=playerCameraMode==='third'?'first':'third';
 syncPlayerButtons();updatePlayerCamera();updatePlayerDiagnostics();
});
jumpButton.addEventListener('click',jumpPlayer);
flightButton.addEventListener('click',togglePlayerFlight);
document.querySelectorAll('[data-move]').forEach(button=>{
 const direction=button.dataset.move;
 const press=event=>{
  if(!playerPlayMode)return;event.preventDefault();
  touchDirections.add(direction);syncTouchMovement();
  try{button.setPointerCapture(event.pointerId);}catch(_){}
 };
 const release=event=>{
  if(!touchDirections.has(direction))return;event.preventDefault();
  touchDirections.delete(direction);syncTouchMovement();
 };
 button.addEventListener('pointerdown',press);
 button.addEventListener('pointerup',release);
 button.addEventListener('pointercancel',release);
 button.addEventListener('lostpointercapture',release);
});
function movementKey(event){
 if(event.key===' ')return ' ';
 if(['w','a','s','d'].includes(event.key.toLowerCase()))return event.key.toLowerCase();
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift'].includes(event.key))return event.key;
 return null;
}
document.addEventListener('keydown',event=>{
 if(!playerPlayMode||['INPUT','SELECT','TEXTAREA'].includes(event.target?.tagName))return;
 if(event.code==='Space'){
  event.preventDefault();
  if(playerPhysicsState?.flying)playerControls.keys[' ']=true;
  else if(!event.repeat)jumpPlayer();
  return;
 }
 if(event.key.toLowerCase()==='f'&&!event.repeat){event.preventDefault();togglePlayerFlight();return;}
 const key=movementKey(event);if(!key)return;
 if(key.startsWith('Arrow')||key===' ')event.preventDefault();
 playerControls.keys[key]=true;
});
document.addEventListener('keyup',event=>{
 const key=movementKey(event);if(key)playerControls.keys[key]=false;
});
window.addEventListener('blur',clearPlayerInputs);
function mat(block){
 const color=block.color||({grass:'#70b85a',dirt:'#9a7049',stone:'#9ca6a1',wood:'#a97545',leaves:'#4e9a59',brick:'#c87862',glass:'#a5dce3',flower:'#e9a4c1',tall_grass:'#4ea859',sand:'#e8d38b',snow:'#f2f8fa',tile:'#c5a98a',door:'#a97545'}[block.type]||'#9ca6a1');
 const kind=block.type==='tile'?'tile-'+(block.tilePattern||'grid'):(block.texture||block.type);
 return materials.get(color,kind,{glass:block.type==='glass',roughness:block.type==='glass'?.25:.94});
}
function clearGroup(){
 while(group.children.length){const child=group.children[group.children.length-1];
  if(child.userData.selectionOutline){child.geometry.dispose();child.material.dispose();}
  else if(typeof child.traverse==='function')child.traverse(object=>{if(object.geometry&&object.geometry.userData&&object.geometry.userData.sandboxOwned)object.geometry.dispose();});
  group.remove(child);
 }
 meshByKey.clear();
 animalBatches=[];renderedAnimalCount=0;animalStatesCache=[];
}
function displayedDoorAngle(block,now=performance.now()){
 const motion=doorMotions.get(block.key);
 return motion?doorMotion.angleAt(motion,now):(block.open?doorMotion.OPEN_ANGLE:0);
}
function syncDoorMotions(state,now=performance.now()){
 const active=new Set();
 for(const block of state.world.blocks){
  if(block.type!=='door')continue;
  active.add(block.key);
  const targetAngle=block.open?doorMotion.OPEN_ANGLE:0,previous=doorMotions.get(block.key);
  if(previous&&Math.abs(previous.to-targetAngle)<1e-7)continue;
  const mesh=meshByKey.get(block.key),base=block.orientation==='ew'?-Math.PI/2:0,swing=block.swing===-1?-1:1;
  const current=previous?doorMotion.angleAt(previous,now):(mesh?(mesh.rotation.y-base)/swing:targetAngle);
  if(Math.abs(current-targetAngle)>1e-5)doorMotions.set(block.key,doorMotion.create(current,targetAngle,now));
  else doorMotions.delete(block.key);
 }
 for(const key of doorMotions.keys())if(!active.has(key))doorMotions.delete(key);
}
function updateDoorAnimations(now=performance.now()){
 for(const [key,motion] of doorMotions){
  const mesh=meshByKey.get(key);
  if(mesh){
   const angle=doorMotion.angleAt(motion,now);
   mesh.rotation.y=mesh.userData.baseDoorAngle+mesh.userData.doorSwing*angle;
   for(const child of group.children){
    if(child.userData.selectionOutline&&child.userData.blockKey===key)child.rotation.copy(mesh.rotation);
   }
  }
  if(now>=motion.start+motion.duration)doorMotions.delete(key);
 }
}
const plantSurfaceMaterial=materials.get('#ffffff','paper');
plantSurfaceMaterial.vertexColors=true;plantSurfaceMaterial.side=THREE.DoubleSide;plantSurfaceMaterial.needsUpdate=true;
function addPlant(block){
 const root=new THREE.Group();root.position.set(block.x+.5,block.y,block.z+.5);root.userData.blockKey=block.key;
 const plantGeometry=plantGeometryFactory.createGeometry(THREE,block);plantGeometry.userData.sandboxOwned=true;
 const mesh=new THREE.Mesh(plantGeometry,plantSurfaceMaterial);
 mesh.userData.blockKey=block.key;mesh.castShadow=performanceProfile.shadows;mesh.receiveShadow=performanceProfile.shadows;
 root.add(mesh);group.add(root);
 animatedPlants.push({object:root,kind:block.type,phase:block.x*.71+block.z*.53});
}
function buildWaterSurface(cells){
 if(!Array.isArray(cells)||!cells.length)return null;
 const positions=[],indices=[],baseHeights=[],waveCoords=[];
 cells.forEach(cell=>{
  const x=cell.x,z=cell.z,depth=cell.depth,level=Math.min(cell.depth,cell.level);
  const y=-depth+level-(level>=depth?.08:0),offset=positions.length/3;
  positions.push(x,y,z,x+1,y,z,x+1,y,z+1,x,y,z+1);
  for(let i=0;i<4;i++){baseHeights.push(y);waveCoords.push(x+(i===1||i===2?1:0),z+(i>=2?1:0));}
  indices.push(offset,offset+2,offset+1,offset,offset+3,offset+2);
 });
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();geometry.userData.sandboxOwned=true;
 const material=materials.get('#79b5c3','water',{roughness:.25});
 material.transparent=true;material.opacity=.84;material.depthWrite=false;material.side=THREE.DoubleSide;
 const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=false;mesh.receiveShadow=false;mesh.renderOrder=2;
 mesh.userData.baseHeights=baseHeights;mesh.userData.waveCoords=waveCoords;
 group.add(mesh);return mesh;
}
function buildFishInstances(state){
 const waters=new Map((state.world.water||[]).map(cell=>[cell.x+','+cell.z,cell]));
 const eligible=(state.world.fish||[]).filter(fish=>waters.has(fish.x+','+fish.z));
 const visible=eligible.slice(0,performanceProfile.maxVisibleFish);
 const buckets=fishColors.map(()=>[]);
 visible.forEach((fish,index)=>{
  const water=waters.get(fish.x+','+fish.z);
  buckets[index%fishColors.length].push({x:fish.x,z:fish.z,depth:water.depth,phase:index*1.9});
 });
 fishMeshes=[];renderedFishCount=0;
 buckets.forEach((items,index)=>{
  if(!items.length)return;
  const material=materials.get(fishColors[index],'animal',{roughness:.68});
  const mesh=new THREE.InstancedMesh(fishGeometry,material,items.length);
  mesh.castShadow=false;mesh.receiveShadow=false;mesh.userData.waterLife=true;
  group.add(mesh);fishMeshes.push({mesh,items});renderedFishCount+=items.length;
 });
}
function updateWaterAndFish(now){
 const elapsed=now*.001;
 if(waterMesh&&now-lastWaterAnimationAt>=1000/performanceProfile.waterAnimationFps){
  lastWaterAnimationAt=now;
  const position=waterMesh.geometry.attributes.position,base=waterMesh.userData.baseHeights,coords=waterMesh.userData.waveCoords;
  for(let i=0;i<position.count;i++){
   const x=coords[i*2],z=coords[i*2+1];
   position.setY(i,base[i]+Math.sin(x*1.4+elapsed*1.4)*.045+Math.cos(z*1.6+elapsed)*.03);
  }
  position.needsUpdate=true;
 }
 if(fishMeshes.length){
  const dummy=new THREE.Object3D();
  fishMeshes.forEach(batch=>{
   batch.items.forEach((fish,index)=>{
    const phase=elapsed*1.05+fish.phase;
    dummy.position.set(fish.x+.5+Math.sin(phase)*.055,-fish.depth+.59+Math.sin(phase*2)*.012,
     fish.z+.5+Math.cos(phase*.8)*.055);
    dummy.rotation.set(0,phase*.48,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
    batch.mesh.setMatrixAt(index,dummy.matrix);
   });
   batch.mesh.instanceMatrix.needsUpdate=true;
  });
 }
}
function buildAnimalBatches(animals){
 const all=Array.isArray(animals)?animals:[];
 animalStatesCache=all;
 const residents=all.filter(animal=>residentAnimalIds.has(animal.id));
 const saved=all.filter(animal=>!residentAnimalIds.has(animal.id)).sort((a,b)=>{
  const da=(a.x-target.x)*(a.x-target.x)+(a.z-target.z)*(a.z-target.z);
  const db=(b.x-target.x)*(b.x-target.x)+(b.z-target.z)*(b.z-target.z);
  return da-db;
 });
 // Keep the seven familiar residents visible on low-end devices; use the
 // remaining instance budget for the nearest saved animals.
 const capacity=Math.max(0,performanceProfile.maxVisibleAnimals);
 const visible=[...residents.slice(0,capacity),...saved.slice(0,Math.max(0,capacity-residents.length))];
 const byAppearance=new Map();
 visible.forEach(animal=>{
  const body=animal.body||animalGeometryFactory.defaults[animal.species]||'#e9dfca';
  const accent=animal.accent||'#d0b6a0';
  const key=[animal.species,body,accent].join('|');
  let entry=byAppearance.get(key);
  if(!entry){
   const geometry=animalGeometryFactory.create(THREE,{...animal,body,accent});
   geometry.userData.sandboxOwned=true;
   entry={geometry,animals:[]};byAppearance.set(key,entry);
  }
  entry.animals.push(animal);
 });
 const dummy=new THREE.Object3D();animalBatches=[];
 byAppearance.forEach(entry=>{
  const mesh=new THREE.InstancedMesh(entry.geometry,animalSurfaceMaterial,entry.animals.length);
  mesh.castShadow=performanceProfile.shadows;mesh.receiveShadow=performanceProfile.shadows;
  mesh.userData.animalInstances=true;
  entry.animals.forEach((animal,index)=>{
   dummy.position.set(animal.x,.04,animal.z);dummy.rotation.set(0,animal.facing||0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
   mesh.setMatrixAt(index,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  animalBatches.push({mesh,animals:entry.animals});
 });
 renderedAnimalCount=visible.length;
}
function updateAnimalInstances(now){
 const time=now*.001,dummy=new THREE.Object3D();
 const current=sandbox?sandbox.animalStates(time):animalStatesCache;
 animalStatesCache=current;
 const byId=new Map(current.map(animal=>[animal.id,animal]));
 animalBatches.forEach(batch=>{
  batch.animals.forEach((original,index)=>{
   const animal=byId.get(original.id)||original,phase=Number.isFinite(animal.phase)?animal.phase:0;
   dummy.position.set(animal.x,.04+Math.sin(time*2.2+phase)*.03,animal.z);
   dummy.rotation.set(0,animal.facing||0,Math.sin(time*1.1+phase)*.018);
   dummy.scale.set(1,1,1);dummy.updateMatrix();batch.mesh.setMatrixAt(index,dummy.matrix);
  });
  batch.mesh.instanceMatrix.needsUpdate=true;
 });
}
function renderSandbox(state){
 const now=performance.now();syncDoorMotions(state,now);
 clearGroup();blockByKey.clear();animatedPlants.length=0;waterMesh=null;fishMeshes=[];renderedFishCount=0;lastWaterAnimationAt=-Infinity;
 const batches=new Map();
 state.world.blocks.forEach(block=>{
  blockByKey.set(block.key,block);
  if(block.type==='flower'||block.type==='tall_grass'){addPlant(block);return;}
  if(block.type==='door'){
   const layout=doorModels.create(block),root=new THREE.Group();
   root.position.set(layout.pivot.x,layout.pivot.y,layout.pivot.z);
   root.rotation.y=layout.angle(displayedDoorAngle(block,now));
   root.userData.baseDoorAngle=layout.baseAngle;root.userData.doorSwing=layout.swing;root.userData.blockKey=block.key;
   const panelMaterial=materials.get(layout.color,layout.textureKind,{roughness:.88});
   const panel=new THREE.Mesh(doorGeometry,panelMaterial);
   panel.position.set(layout.localCenter.x,layout.localCenter.y,layout.localCenter.z);
   panel.userData.blockKey=block.key;
   panel.castShadow=performanceProfile.shadows;panel.receiveShadow=performanceProfile.shadows;
   root.add(panel);group.add(root);meshByKey.set(block.key,root);return;
  }
  const isTile=block.type==='tile',geometry=isTile?tileGeometry:boxGeometry,material=mat(block);
  const chunkX=Math.floor(block.x/16),chunkZ=Math.floor(block.z/16);
  const batchKey=[chunkX,chunkZ,block.type,block.color||'',block.texture||'',block.tilePattern||'',isTile?'tile':'cube'].join('|');
  let batch=batches.get(batchKey);
  if(!batch){batch={geometry,material,blocks:[]};batches.set(batchKey,batch);}
  batch.blocks.push(block);
 });
 const dummy=new THREE.Object3D();
 batches.forEach(batch=>{
  const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.blocks.length);
  batch.blocks.forEach((block,index)=>{
   dummy.position.set(block.x+.5,block.y+(block.type==='tile'?.065:.5),block.z+.5);
   dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
   mesh.setMatrixAt(index,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;
  mesh.userData.blockKeys=batch.blocks.map(block=>block.key);
  mesh.castShadow=performanceProfile.shadows;mesh.receiveShadow=performanceProfile.shadows;
  group.add(mesh);
 });
 waterMesh=buildWaterSurface(state.world.water||[]);
 buildFishInstances(state);
 buildAnimalBatches(sandbox.animalStates(now/1000));
 if(state.selectedKey){
  const block=blockByKey.get(state.selectedKey);
  if(block){
   const outlineGeometry=new THREE.EdgesGeometry(block.type==='door'?doorGeometry:(block.type==='tile'?tileGeometry:boxGeometry));
   const edges=new THREE.LineSegments(outlineGeometry,new THREE.LineBasicMaterial({color:0x4b6550,transparent:true,opacity:.9}));
   if(block.type==='door'){
    const layout=doorModels.create(block),mesh=meshByKey.get(block.key);
    outlineGeometry.translate(layout.localCenter.x,layout.localCenter.y,layout.localCenter.z);
    edges.position.set(layout.pivot.x,layout.pivot.y,layout.pivot.z);
    if(mesh)edges.rotation.copy(mesh.rotation);
   }else edges.position.set(block.x+.5,block.y+(block.type==='tile'?.065:.5),block.z+.5);
   edges.scale.setScalar(1.035);edges.userData.selectionOutline=true;edges.userData.blockKey=state.selectedKey;group.add(edges);
  }
 }
 selected=state.selectedKey;
 const selectedBlock=blockByKey.get(selected);
 const bucketSelect=document.getElementById('bucket-item');
 if(bucketSelect){
  bucketSelect.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Bucket: none selected';bucketSelect.append(placeholder);
  (state.world.bucket||[]).forEach((item,index)=>{
   const option=document.createElement('option');option.value=String(index);
   const label=item.type==='custom'?'Custom solid':item.type==='tile'?'Tile':item.type==='door'?'Door':item.type==='water'?'Water':item.type.replace(/_/g,' ');
   option.textContent=(index+1)+'. '+label+(item.color?' · '+item.color.toUpperCase():'');
   bucketSelect.append(option);
  });
  bucketSelect.value=Number.isInteger(state.selectedBucketItemIndex)?String(state.selectedBucketItemIndex):'';
 }
 document.getElementById('remove').disabled=!selectedBlock;
 document.getElementById('door').disabled=!selectedBlock||selectedBlock.type!=='door';
 document.getElementById('apply-pattern').disabled=!selectedBlock||selectedBlock.type!=='tile';
 document.getElementById('pattern').value=selectedBlock&&selectedBlock.type==='tile'?selectedBlock.tilePattern||'grid':'grid';
 const renderObjects=group.children.length,instanceBatches=batches.size,waterCount=(state.world.water||[]).length,fishCount=(state.world.fish||[]).length,animalCount=(state.world.animals||[]).length,residentAnimalCount=protection.RESIDENTS.length,totalAnimalCount=animalStatesCache.length;
 status.textContent=state.world.name+' · '+state.world.blocks.length+' blocks · '+instanceBatches+' instanced batches · '+renderObjects+' render objects · Bucket: '+(state.world.bucket?.length||0)+
  (selectedBlock?' · Selected: '+selectedBlock.type:' · Select a block to edit')+
  ' · Water: '+waterCount+' · Fish: '+fishCount+' ('+renderedFishCount+' shown) · Animals: '+totalAnimalCount+' ('+residentAnimalCount+' residents, '+animalCount+' saved; '+renderedAnimalCount+' shown) · '+performanceProfile.tier+' quality · Original unchanged: '+state.sourceUnchanged;
 window.__DIYCRAFT_THREE_EDIT__={revision:state.revision,selectedKey:state.selectedKey,blockCount:state.world.blocks.length,renderedBlocks:state.world.blocks.length,
  sourceUnchanged:state.sourceUnchanged,storageKeys:localStorage.length,renderedMeshes:renderObjects,renderObjects,instanceBatches,
  performanceProfile:{tier:performanceProfile.tier,fpsCap:performanceProfile.fpsCap,maxPixelRatio:performanceProfile.maxPixelRatio,antialias:performanceProfile.antialias,shadows:performanceProfile.shadows,textureSize:performanceProfile.textureSize,maxVisibleFish:performanceProfile.maxVisibleFish,maxVisibleAnimals:performanceProfile.maxVisibleAnimals,waterAnimationFps:performanceProfile.waterAnimationFps},
  waterCount,fishCount,renderedFishCount,animalCount,residentAnimalCount,totalAnimalCount,renderedAnimalCount,animalBatchCount:animalBatches.length,canvasSize:{width:canvas.width,height:canvas.height},
  playerMode:playerPlayMode,cameraMode:playerCameraMode,
  getPlayerState:()=>playerPhysicsState?{player:{...playerPhysicsState.player},jumpVelocity:playerPhysicsState.jumpVelocity,playerGrounded:playerPhysicsState.playerGrounded,flying:playerPhysicsState.flying,playerActivity:playerPhysicsState.playerActivity}:null,
  getPlayerCamera:()=>playerCameraPose?{pos:{...playerCameraPose.pos},yaw:playerCameraPose.yaw,pitch:playerCameraPose.pitch}:null,
  getProtectionContext:()=>currentProtectionContext(),isProtectedDigCell:(x,z)=>isProtectedTarget(x,z),
  lastPlacement:lastPlacement?{key:lastPlacement.key,x:lastPlacement.x,y:lastPlacement.y,z:lastPlacement.z,step:lastPlacement.step.slice()}:null,
  pickBlock:(key)=>{const block=blockByKey.get(key);if(!block)return false;const p=new THREE.Vector3(block.x+.5,block.y+.5,block.z+.5).project(camera);clickAt((p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2);return true;},
  getDoorAngle:(key)=>{const block=blockByKey.get(key);return block&&block.type==='door'?displayedDoorAngle(block):null;},
  getDoorVisualStats:(key)=>{const block=blockByKey.get(key),root=meshByKey.get(key);if(!block||block.type!=='door'||!root)return null;const layout=doorModels.create(block),panel=root.children.find(child=>child.isMesh),image=panel?.material?.map?.image,ctx=image?.getContext?.('2d');const sample=(x,y)=>{if(!ctx)return null;const px=Math.max(0,Math.min(image.width-1,Math.round(x/.84*image.width))),py=Math.max(0,Math.min(image.height-1,Math.round((1.96-y)/1.96*image.height))),v=ctx.getImageData(px,py,1,1).data;return {r:v[0],g:v[1],b:v[2]};};return {style:layout.style,textureKind:layout.textureKind,color:layout.color,orientation:layout.orientation,pivot:layout.pivot,baseAngle:layout.baseAngle,textureWidth:image?.width||0,textureHeight:image?.height||0,hasPainterlyMap:!!image,styleSample:sample(layout.style==='window'?.42:.43,layout.style==='window'?1.38:1.43)};},
  getWaterStats:()=>{const matrix=fishMeshes[0]?.mesh.instanceMatrix.array;return {cells:(sandbox.getState().world.water||[]).length,fish:(sandbox.getState().world.fish||[]).length,renderedFish:renderedFishCount,waterVertices:waterMesh?waterMesh.geometry.attributes.position.count:0,surfaceY:waterMesh?waterMesh.geometry.attributes.position.getY(0):null,fishAngle:matrix?Math.atan2(matrix[8],matrix[0]):null};},
  getAnimalStats:()=>({animals:sandbox.getState().world.animals||[],residents:animalStatesCache.filter(animal=>residentAnimalIds.has(animal.id)),all:animalStatesCache,rendered:renderedAnimalCount,batches:animalBatches.length,firstY:animalBatches[0]?.mesh.instanceMatrix.array[13]??null}),getAnimalScreenPoint:animalScreenPoint,focusAnimalForTest,tapAnimal:(id)=>{const point=animalScreenPoint(id);if(!point)return false;clickAt(point.x,point.y);return !animalCareShade.hidden;},getAnimalCareStats:()=>({open:!animalCareShade.hidden,animal:animalCareSelection?.id||null,count:animalCareSelection?sandbox.getState().world.animalCare?.[animalCareSelection.id]||0:0,flash:!animalCareFlash.hidden,animalCare:{...(sandbox.getState().world.animalCare||{})}}),neighborCount:neighborModels.size,renderedNeighborCount,focusNeighborForTest:(id)=>{const actor=sandbox.characterStates(performance.now()/1000).find(item=>item.id===id);if(!actor||actor.sleeping)return false;playerPlayMode=false;touchControls.hidden=true;target.set(actor.x,1.18,actor.z);orbit.radius=14;orbit.theta=.5;orbit.phi=.88;cameraUpdate();updateNeighborModels(performance.now());return true;},getNeighborScreenPoint:neighborScreenPoint,tapNeighbor:(id)=>{const point=neighborScreenPoint(id);if(!point)return false;clickAt(point.x,point.y);return !neighborColorShade.hidden;},getNeighborColoringStats:()=>({open:!neighborColorShade.hidden,neighbor:neighborColorName,page:neighborColorPage?.id||null,undo:neighborColorUndo.length,progress:document.getElementById('neighbor-color-progress-fill').style.width,artworks:sandbox.getState().world.artworks?.length||0}),getNeighborStats:(timeSeconds)=>{const actors=Number.isFinite(timeSeconds)?sandbox.characterStates(timeSeconds):neighborStatesCache;return {total:actors.length,rendered:renderedNeighborCount,actors:actors.map(actor=>({id:actor.id,name:actor.name,x:actor.x,z:actor.z,facing:actor.facing,moving:actor.moving,sleeping:actor.sleeping,phase:actor.phase,pace:actor.pace,scale:actor.scale,shirt:actor.shirt,hairStyle:actor.hairStyle,outfitStyle:actor.outfitStyle,accessory:actor.accessory,visible:!!neighborModels.get(actor.id)?.root.visible,position:neighborModels.has(actor.id)?{x:neighborModels.get(actor.id).root.position.x,y:neighborModels.get(actor.id).root.position.y,z:neighborModels.get(actor.id).root.position.z}:null}))};},debugPlaceObstacleForTest:(input,timeSeconds=performance.now()/1000)=>{const next=sandbox.addBlock(input);renderSandbox(next);updateNeighborModels(timeSeconds*1000);return {revision:next.revision,key:next.selectedKey,sourceUnchanged:next.sourceUnchanged};},debugRemoveObstacleForTest:(key,timeSeconds=performance.now()/1000)=>{const next=sandbox.remove(key,sandbox.protectionContext(timeSeconds));renderSandbox(next);updateNeighborModels(timeSeconds*1000);return {revision:next.revision,sourceUnchanged:next.sourceUnchanged};},getState:()=>sandbox.getState()};
 updatePlayerDiagnostics();
}
function selectedBlock(){
 const state=sandbox.getState();return state.world.blocks.find(b=>b.key===state.selectedKey)||null;
}
function choose(key){renderSandbox(sandbox.select(key));}
function projectAnimalPick(point){
 const projected=new THREE.Vector3(point.x,point.y,point.z).project(camera);
 if(projected.z< -1||projected.z>1)return null;
 return {x:(projected.x+1)*innerWidth/2,y:(1-projected.y)*innerHeight/2};
}
function animalAtScreen(x,y){
 const animals=sandbox?sandbox.animalStates(performance.now()/1000):[];
 return protection.pickAnimalAtScreen(animals,x,y,projectAnimalPick);
}
function animalScreenPoint(id){
 const actor=sandbox?.animalStates(performance.now()/1000).find(item=>item.id===id);
 if(!actor)return null;
 const point=projectAnimalPick({x:actor.x,y:actor.species==='giraffe'?.8:.48,z:actor.z});
 return point?{...point,visible:point.x>=0&&point.x<=innerWidth&&point.y>=0&&point.y<=innerHeight}:null;
}
function openAnimalCare(animal){
 animalCareSelection={id:animal.id,name:animal.name||(animal.id==='sheep'?'Pip the sheep':'Mochi'),emoji:animal.emoji||'🐾',species:animal.species};
 const count=sandbox.getState().world.animalCare?.[animal.id]||0;
 document.getElementById('animal-care-title').textContent=animalCareSelection.emoji+' Care for '+animalCareSelection.name;
 document.getElementById('animal-care-note').textContent=animalCareSelection.name+' enjoys gentle care. Care activities together: '+count;
 document.getElementById('animal-care-feedback').textContent=animalCareSelection.name+' is happy to see you.';
 animalCareShade.hidden=false;
}
function closeAnimalCare(){
 animalCareShade.hidden=true;animalCareSelection=null;
}
function careForSelectedAnimal(action){
 if(!animalCareSelection)return;
 const info={
  snack:{emoji:'🍎',message:'A tasty snack. '+animalCareSelection.name+' is happily nibbling!'},
  water:{emoji:'💧',message:'Fresh water. '+animalCareSelection.name+' has had a lovely drink!'},
  brush:{emoji:'✨',message:'A gentle brush. '+animalCareSelection.name+' looks extra fluffy!'},
  play:{emoji:'💚',message:'A little playtime. '+animalCareSelection.name+' is happily playing!'}
 }[action];
 if(!info)return;
 try{
  sandbox.careForAnimal(animalCareSelection.id,action);
  const count=sandbox.getState().world.animalCare?.[animalCareSelection.id]||0;
  document.getElementById('animal-care-feedback').textContent=info.message;
  document.getElementById('animal-care-note').textContent=animalCareSelection.name+' has enjoyed '+count+' caring moments with you.';
  status.textContent=info.message;
  animalCareFlashEmoji=info.emoji;animalCareFlashAnimalId=animalCareSelection.id;animalCareFlashUntil=performance.now()+1900;
 }catch(error){document.getElementById('animal-care-feedback').textContent=error.message;}
}
function updateAnimalCareFlash(now){
 if(!animalCareFlashAnimalId||now>=animalCareFlashUntil){
  animalCareFlash.hidden=true;animalCareFlashAnimalId=null;return;
 }
 const actor=animalStatesCache.find(animal=>animal.id===animalCareFlashAnimalId);
 if(!actor){animalCareFlash.hidden=true;return;}
 const point=projectAnimalPick({
  x:actor.x+.22,y:actor.y+(actor.species==='giraffe'?1.65:1.12),z:actor.z
 });
 if(!point){animalCareFlash.hidden=true;return;}
 animalCareFlash.textContent=animalCareFlashEmoji;
 animalCareFlash.style.left=point.x+'px';animalCareFlash.style.top=point.y+'px';
 animalCareFlash.hidden=false;
}
function projectNeighborPick(actor){
 const facing=actor.facing||0;
 const point=new THREE.Vector3(actor.x+Math.sin(facing)*.38,1.18,actor.z+Math.cos(facing)*.38).project(camera);
 if(point.z< -1||point.z>1)return null;
 return {x:(point.x+1)*innerWidth/2,y:(1-point.y)*innerHeight/2};
}
function neighborAtScreen(x,y){
 const actors=sandbox?sandbox.characterStates(performance.now()/1000):[];
 let best=Infinity,hit=null;
 for(const actor of actors){
  if(actor.sleeping)continue;
  const point=projectNeighborPick(actor);if(!point)continue;
  const distance=Math.hypot(x-point.x,y-point.y);
  if(distance<66&&distance<best){best=distance;hit=actor;}
 }
 return hit;
}
function stopNeighborColoring(){
 if(neighborColorTimer!==null){clearTimeout(neighborColorTimer);neighborColorTimer=null;}
 if(neighborColorHideTimer!==null){clearTimeout(neighborColorHideTimer);neighborColorHideTimer=null;}
 const cursor=document.getElementById('neighbor-color-cursor');if(cursor)cursor.classList.remove('active');
 neighborColorDrawing=false;neighborColorLast=null;
}
function openNeighborColoring(name){
 stopNeighborColoring();neighborColorName=String(name||'hyacinth');
 document.getElementById('neighbor-color-note').textContent=neighborColorName+' is sitting beside you for a quiet coloring activity. Choose a picture to share. No talking is needed.';
 document.getElementById('neighbor-color-neighbor-title').textContent=neighborColorName+' is ready to color with you';
 document.getElementById('neighbor-color-status').textContent='Pick a picture. You will see their brush and colors appear on the shared page.';
 document.getElementById('neighbor-color-progress-fill').style.width='0%';
 const root=document.getElementById('neighbor-color-templates');root.replaceChildren();
 for(const page of coloring.PAGES){
  const button=document.createElement('button');button.type='button';button.className='neighbor-color-template';button.dataset.colorPage=page.id;
  const image=document.createElement('img');image.alt='Uncolored '+page.name+' line drawing';image.src=coloring.svgData(page.svg);
  const label=document.createElement('span');label.textContent=page.name;
  button.append(image,label);button.addEventListener('click',()=>loadNeighborColorPage(page));root.append(button);
 }
 document.getElementById('neighbor-color-work').hidden=true;
 root.hidden=false;neighborColorShade.hidden=false;
}
function closeNeighborColoring(){
 stopNeighborColoring();neighborColorShade.hidden=true;neighborColorPage=null;neighborColorUndo=[];
 neighborColorCtx.clearRect(0,0,neighborColorCanvas.width,neighborColorCanvas.height);
}
function drawNeighborColorPage(page){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>{
   neighborColorCtx.fillStyle='#fffdf8';neighborColorCtx.fillRect(0,0,neighborColorCanvas.width,neighborColorCanvas.height);
   const scale=Math.min(neighborColorCanvas.width/image.width,neighborColorCanvas.height/image.height);
   const width=image.width*scale,height=image.height*scale;
   neighborColorCtx.drawImage(image,(neighborColorCanvas.width-width)/2,(neighborColorCanvas.height-height)/2,width,height);
   resolve();
  };
  image.onerror=reject;image.src=coloring.svgData(page.svg);
 });
}
function pushNeighborColorUndo(){
 try{
  neighborColorUndo.push(neighborColorCtx.getImageData(0,0,neighborColorCanvas.width,neighborColorCanvas.height));
  if(neighborColorUndo.length>coloring.MAX_UNDO)neighborColorUndo.shift();
 }catch(error){status.textContent='Undo is unavailable for this picture.';}
}
function fillNeighborColorRegion(x,y,chosenColor,onlyWhite=false){
 const image=neighborColorCtx.getImageData(0,0,neighborColorCanvas.width,neighborColorCanvas.height);
 const result=coloring.fillPixels(neighborColorCanvas.width,neighborColorCanvas.height,image.data,x,y,chosenColor,onlyWhite);
 if(result.count){
  pushNeighborColorUndo();image.data.set(result.data);neighborColorCtx.putImageData(image,0,0);
 }
 return result.count;
}
function showNeighborColorBrush(x,y,color){
 const cursor=document.getElementById('neighbor-color-cursor');
 const rect=neighborColorCanvas.getBoundingClientRect(),wrap=neighborColorCanvas.parentElement.getBoundingClientRect();
 cursor.style.left=(rect.left-wrap.left+x/neighborColorCanvas.width*rect.width)+'px';
 cursor.style.top=(rect.top-wrap.top+y/neighborColorCanvas.height*rect.height)+'px';
 cursor.style.background=color;cursor.classList.add('active');
 if(neighborColorHideTimer!==null)clearTimeout(neighborColorHideTimer);
}
function startNeighborColoring(){
 stopNeighborColoring();
 const actions=coloring.NEIGHBOR_COLOR_PLANS[neighborColorPage?.id]||[];
 neighborColorStep=0;
 document.getElementById('neighbor-color-neighbor-title').textContent=neighborColorName+' is coloring with you';
 document.getElementById('neighbor-color-status').textContent='Watch their brush move and add colors to your shared picture.';
 document.getElementById('neighbor-color-progress-fill').style.width='0%';
 if(!actions.length){
  document.getElementById('neighbor-color-status').textContent=neighborColorName+' is here beside you. You can color together.';
  return;
 }
 const next=()=>{
  if(!neighborColorPage||neighborColorStep>=actions.length){
   document.getElementById('neighbor-color-neighbor-title').textContent=neighborColorName+' finished their colors';
   document.getElementById('neighbor-color-status').textContent='Your shared picture is ready for more colors from you.';
   document.getElementById('neighbor-color-progress-fill').style.width='100%';
   document.getElementById('neighbor-color-cursor').classList.remove('active');neighborColorTimer=null;return;
  }
  const action=actions[neighborColorStep];showNeighborColorBrush(action.x,action.y,action.color);
  document.getElementById('neighbor-color-status').textContent=neighborColorName+' is coloring '+action.label+'…';
  neighborColorTimer=setTimeout(()=>{
   neighborColorTimer=null;
   const count=fillNeighborColorRegion(action.x,action.y,action.color,true);
   neighborColorStep++;
   document.getElementById('neighbor-color-progress-fill').style.width=Math.round(neighborColorStep/actions.length*100)+'%';
   document.getElementById('neighbor-color-status').textContent=count?neighborColorName+' added color to '+action.label+'.':'Your area already has color, so '+neighborColorName+' is choosing another spot.';
   neighborColorHideTimer=setTimeout(()=>document.getElementById('neighbor-color-cursor').classList.remove('active'),350);
   neighborColorTimer=setTimeout(next,850);
  },650);
 };
 neighborColorTimer=setTimeout(next,900);
}
async function loadNeighborColorPage(page){
 stopNeighborColoring();
 try{
  await drawNeighborColorPage(page);neighborColorPage=page;neighborColorUndo=[];neighborColorTool='fill';
  document.getElementById('neighbor-color-page-title').textContent=page.name+' · coloring together with '+neighborColorName;
  document.getElementById('neighbor-color-templates').hidden=true;
  document.getElementById('neighbor-color-work').hidden=false;
  document.getElementById('neighbor-color-fill').classList.add('primary');
  document.getElementById('neighbor-color-brush-tool').classList.remove('primary');
  startNeighborColoring();
 }catch(error){status.textContent='This coloring picture could not be opened.';}
}
function neighborColorPoint(event){
 const rect=neighborColorCanvas.getBoundingClientRect();
 return {x:(event.clientX-rect.left)*neighborColorCanvas.width/rect.width,y:(event.clientY-rect.top)*neighborColorCanvas.height/rect.height};
}
function clickAt(x,y){
 const animal=animalAtScreen(x,y);
 if(animal){lastPlacement=null;openAnimalCare(animal);return;}
 const neighbor=neighborAtScreen(x,y);
 if(neighbor){lastPlacement=null;openNeighborColoring(neighbor.name);return;}
 pointer.x=(x/innerWidth)*2-1;pointer.y=-(y/innerHeight)*2+1;raycaster.setFromCamera(pointer,camera);
 const hits=raycaster.intersectObjects(group.children,true).filter(hit=>!hit.object.userData.selectionOutline&&raycastKeys.resolve([hit]));
 const key=raycastKeys.resolve(hits),hit=hits.find(item=>raycastKeys.resolve([item])===key);
 const block=sandbox.getState().world.blocks.find(item=>item.key===key);
 if(key&&hit&&hit.face&&block){
  const normal=hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
  const values=[normal.x,normal.y,normal.z],axis=values.map(Math.abs).indexOf(Math.max(...values));
  const step=[0,0,0];step[axis]=values[axis]>=0?1:-1;
  lastPlacement={key,x:block.x,y:block.y,z:block.z,step};
 }else lastPlacement=null;
 choose(key);
}
function addBeside(){
 const base=selectedBlock();let x=base?base.x+1:0,y=base?base.y:0,z=base?base.z:0;
 if(base&&lastPlacement&&lastPlacement.key===base.key){x=base.x+lastPlacement.step[0];y=base.y+lastPlacement.step[1];z=base.z+lastPlacement.step[2];}
 const state=sandbox.getState(),occupied=new Set(state.world.blocks.map(b=>b.x+','+b.y+','+b.z));
 if(!base){let attempts=0;while(occupied.has(x+','+y+','+z)&&attempts++<100){x++;if(x>1000){x=0;z++;}}}
 const type=document.getElementById('block-type').value,color=document.getElementById('color').value;
 if(type==='water'){const cell=waterCellInput();renderSandbox(sandbox.addWaterLayer(cell.x,cell.z,currentProtectionContext()));return;}
 const input={type,x,y,z};
 if(type==='custom')input.color=color;
 if(type==='custom')input.texture='custom';
 if(type==='tile')input.tilePattern=document.getElementById('pattern').value;
 if(type==='door'){input.style=document.getElementById('door-style').value;input.orientation='ns';}
 renderSandbox(sandbox.addBlock(input));
}
document.getElementById('add').addEventListener('click',()=>{try{addBeside();}catch(e){status.textContent=e.message;}});
document.getElementById('bucket-item').addEventListener('change',event=>{
 try{
  const value=event.target.value;
  if(value===''){renderSandbox(sandbox.clearBucketSelection());return;}
  const index=Number(value),state=sandbox.selectBucketItem(index),item=state.selectedBucketItem;
  const typeSelect=document.getElementById('block-type');
  if(Array.from(typeSelect.options).some(option=>option.value===item.type))typeSelect.value=item.type;
  renderSandbox(state);
 }catch(error){status.textContent=error.message;}
});
document.getElementById('block-type').addEventListener('change',event=>{
 const selectedItem=sandbox.getState().selectedBucketItem;
 if(selectedItem&&selectedItem.type!==event.target.value)renderSandbox(sandbox.clearBucketSelection());
});
document.getElementById('remove').addEventListener('click',()=>{if(selected){try{renderSandbox(sandbox.remove(selected,currentProtectionContext()));}catch(error){status.textContent=error.message;}}});
document.getElementById('door').addEventListener('click',()=>{try{renderSandbox(sandbox.toggleDoor(selected));}catch(e){status.textContent=e.message;}});
document.getElementById('apply-pattern').addEventListener('click',()=>{try{renderSandbox(sandbox.setTilePattern(selected,document.getElementById('pattern').value));}catch(e){status.textContent=e.message;}});
function currentProtectionContext(){
 return sandbox?sandbox.protectionContext(performance.now()/1000):{neighbors:[],animals:[]};
}
function isProtectedTarget(x,z){
 return sandbox.isProtectedDigCell(x,z,currentProtectionContext());
}
function waterCellInput(){
 const xValue=document.getElementById('water-x').value.trim(),zValue=document.getElementById('water-z').value.trim();
 const x=Number(xValue),z=Number(zValue);
 if(!xValue||!zValue||!Number.isInteger(x)||!Number.isInteger(z))throw new TypeError('Enter whole-number X and Z coordinates for the pool.');
 return {x,z};
}
document.getElementById('water-add').addEventListener('click',()=>{try{const cell=waterCellInput();renderSandbox(sandbox.addWaterLayer(cell.x,cell.z,currentProtectionContext()));}catch(e){status.textContent=e.message;}});
document.getElementById('water-collect').addEventListener('click',()=>{try{const cell=waterCellInput();renderSandbox(sandbox.collectWaterLayer(cell.x,cell.z,currentProtectionContext()));}catch(e){status.textContent=e.message;}});
document.getElementById('fish-add').addEventListener('click',()=>{try{const cell=waterCellInput();renderSandbox(sandbox.addFish(cell.x,cell.z));}catch(e){status.textContent=e.message;}});
document.getElementById('fill-hole').addEventListener('click',()=>{
 try{
  const cell=waterCellInput(),type=document.getElementById('block-type').value,input={type};
  if(type==='custom'){input.color=document.getElementById('color').value;input.texture='custom';}
  if(type==='tile')input.tilePattern=document.getElementById('pattern').value;
  if(type==='door')input.style=document.getElementById('door-style').value;
  renderSandbox(sandbox.fillExcavation(cell.x,cell.z,input));
 }catch(error){status.textContent=error.message;}
});
document.getElementById('dig-ground').addEventListener('click',()=>{
 try{const cell=waterCellInput();renderSandbox(sandbox.excavateGround(cell.x,cell.z,currentProtectionContext()));}
 catch(error){status.textContent=error.message;}
});
document.getElementById('neighbor-color-close').addEventListener('click',closeNeighborColoring);
document.getElementById('neighbor-color-back').addEventListener('click',()=>{
 stopNeighborColoring();neighborColorPage=null;neighborColorUndo=[];
 document.getElementById('neighbor-color-work').hidden=true;document.getElementById('neighbor-color-templates').hidden=false;
});
document.getElementById('neighbor-color-fill').addEventListener('click',()=>{
 neighborColorTool='fill';document.getElementById('neighbor-color-fill').classList.add('primary');
 document.getElementById('neighbor-color-brush-tool').classList.remove('primary');
});
document.getElementById('neighbor-color-brush-tool').addEventListener('click',()=>{
 neighborColorTool='brush';document.getElementById('neighbor-color-brush-tool').classList.add('primary');
 document.getElementById('neighbor-color-fill').classList.remove('primary');
});
document.getElementById('neighbor-color-undo').addEventListener('click',()=>{
 const previous=neighborColorUndo.pop();
 if(previous)neighborColorCtx.putImageData(previous,0,0);
 else document.getElementById('neighbor-color-status').textContent='There is nothing to undo yet.';
});
document.getElementById('neighbor-color-reset').addEventListener('click',()=>{
 if(neighborColorPage){
  stopNeighborColoring();neighborColorUndo=[];
  drawNeighborColorPage(neighborColorPage).then(()=>{
   startNeighborColoring();document.getElementById('neighbor-color-status').textContent='Fresh shared coloring page ready.';
  }).catch(()=>{document.getElementById('neighbor-color-status').textContent='This coloring picture could not be reset.';});
 }
});
document.getElementById('neighbor-color-save').addEventListener('click',()=>{
 if(!neighborColorPage)return;
 try{
  const data=neighborColorCanvas.toDataURL('image/png');
  renderSandbox(sandbox.saveArtwork(neighborColorPage.name,data,neighborColorName));
  closeNeighborColoring();status.textContent='Your shared coloring picture has been saved in the sandbox gallery and crafted pouch.';
 }catch(error){document.getElementById('neighbor-color-status').textContent=error.message;}
});
neighborColorCanvas.addEventListener('pointerdown',event=>{
 if(!neighborColorPage)return;
 const point=neighborColorPoint(event),color=document.getElementById('neighbor-color-color').value;
 if(neighborColorTool==='fill'){fillNeighborColorRegion(point.x,point.y,color,false);return;}
 pushNeighborColorUndo();neighborColorDrawing=true;neighborColorLast=point;neighborColorCanvas.setPointerCapture(event.pointerId);
});
neighborColorCanvas.addEventListener('pointermove',event=>{
 if(!neighborColorDrawing||!neighborColorLast)return;
 const point=neighborColorPoint(event);
 neighborColorCtx.strokeStyle=document.getElementById('neighbor-color-color').value;
 neighborColorCtx.lineWidth=Number(document.getElementById('neighbor-color-brush').value);
 neighborColorCtx.lineCap='round';neighborColorCtx.lineJoin='round';
 neighborColorCtx.beginPath();neighborColorCtx.moveTo(neighborColorLast.x,neighborColorLast.y);
 neighborColorCtx.lineTo(point.x,point.y);neighborColorCtx.stroke();neighborColorLast=point;
});
['pointerup','pointercancel','lostpointercapture'].forEach(type=>neighborColorCanvas.addEventListener(type,()=>{neighborColorDrawing=false;neighborColorLast=null;}));
neighborColorShade.addEventListener('pointerdown',event=>{if(event.target===neighborColorShade)closeNeighborColoring();});
document.getElementById('animal-care-close').addEventListener('click',closeAnimalCare);
animalCareShade.addEventListener('pointerdown',event=>{if(event.target===animalCareShade)closeAnimalCare();});
animalCareShade.querySelectorAll('[data-animal-care]').forEach(button=>button.addEventListener('click',()=>careForSelectedAnimal(button.dataset.animalCare)));
window.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!neighborColorShade.hidden)closeNeighborColoring();if(!animalCareShade.hidden)closeAnimalCare();}});
function focusAnimalForTest(id){
 const actor=sandbox?.animalStates(performance.now()/1000).find(item=>item.id===id);
 if(!actor)return false;
 playerPlayMode=false;touchControls.hidden=true;target.set(actor.x,.55,actor.z);orbit.radius=14;orbit.theta=.5;orbit.phi=.88;cameraUpdate();updateAnimalInstances(performance.now());return true;
}
function neighborScreenPoint(id){
 const actor=sandbox?.characterStates(performance.now()/1000).find(item=>item.id===id);
 if(!actor||actor.sleeping)return null;
 const point=projectNeighborPick(actor);
 return point?{...point,visible:point.x>=0&&point.x<=innerWidth&&point.y>=0&&point.y<=innerHeight}:null;
}
let pointerDown=null;
canvas.addEventListener('pointerdown',event=>{pointerDown={x:event.clientX,y:event.clientY,id:event.pointerId,moved:false};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointermove',event=>{
 if(!pointerDown)return;const dx=event.clientX-pointerDown.x,dy=event.clientY-pointerDown.y;
 if(Math.abs(dx)+Math.abs(dy)>3)pointerDown.moved=true;pointerDown.x=event.clientX;pointerDown.y=event.clientY;
 if(playerPlayMode&&playerPhysicsState){
  playerPhysicsState.player.yaw-=dx*.0055;
  if(playerCameraMode==='first')playerPhysicsState.player.pitch=Math.max(-1.25,Math.min(1.25,playerPhysicsState.player.pitch+dy*.004));
  updatePlayerCamera();
 }else{orbit.theta-=dx*.005;orbit.phi+=dy*.004;cameraUpdate();}
});
canvas.addEventListener('pointerup',event=>{
 if(!pointerDown)return;const dx=event.clientX-pointerDown.x,dy=event.clientY-pointerDown.y;
 if(!playerPlayMode&&!pointerDown.moved&&Math.abs(dx)+Math.abs(dy)<7)clickAt(event.clientX,event.clientY);pointerDown=null;
});
canvas.addEventListener('pointercancel',()=>{pointerDown=null;});
canvas.addEventListener('wheel',event=>{event.preventDefault();if(playerPlayMode)return;orbit.radius=Math.max(14,Math.min(60,orbit.radius+event.deltaY*.02));cameraUpdate();},{passive:false});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,performanceProfile.maxPixelRatio));});
let frame=0;
function animate(now){
 requestAnimationFrame(animate);
 if(!frameGate.shouldRender(now))return;
 if(playerPlayMode&&playerPhysicsState&&playerPhysicsEnvironment){
  const elapsedMs=lastPlayerPhysicsTime?Math.max(0,now-lastPlayerPhysicsTime):0;
  lastPlayerPhysicsTime=now;
  physicsClock.advance(elapsedMs,dt=>{
   const next=playerPhysics.step(playerPhysicsState,playerControls,playerPhysicsEnvironment,dt);
   playerPhysicsState=next;playerControls=next.controls;
  });
  updatePlayerCamera();updatePlayerDiagnostics();
 }else lastPlayerPhysicsTime=now;
 updateDoorAnimations(now);updateWaterAndFish(now);updateAnimalInstances(now);updateAnimalCareFlash(now);updateNeighborModels(now);
 for(const item of animatedPlants){
  if(item.kind==='flower')item.object.rotation.z=Math.sin(now*.00125+item.phase)*.075;
  else item.object.rotation.z=Math.sin(now*.0018+item.phase)*.11;
 }
 renderer.render(scene,camera);frame++;
 if(window.__DIYCRAFT_THREE_EDIT__){
  window.__DIYCRAFT_THREE_EDIT__.frames=frame;window.__DIYCRAFT_THREE_EDIT__.drawCalls=renderer.info.render.calls;
  window.__DIYCRAFT_THREE_EDIT__.geometryCount=renderer.info.memory.geometries;
  window.__DIYCRAFT_THREE_EDIT__.textureCount=renderer.info.memory.textures;
 }
}
async function start(){
 const response=await fetch('./preview-three/starter-world.json',{cache:'no-store'});
 if(!response.ok)throw new Error('Starter-world fixture unavailable ('+response.status+').');
 const raw=await response.json();originalJson=JSON.stringify(raw);sourceSnapshot=adapter.createSnapshot(raw);
 sandbox=editing.create(sourceSnapshot);buildNeighborModels();
 const blocks=sourceSnapshot.blocks;
 if(blocks.length){const xs=blocks.map(b=>b.x),zs=blocks.map(b=>b.z);target.set((Math.min(...xs)+Math.max(...xs)+1)/2,1,(Math.min(...zs)+Math.max(...zs)+1)/2);}
 playerPhysicsState={player:{...sourceSnapshot.player},jumpVelocity:0,playerGrounded:false,flying:false,playerActivity:''};
 const playerFloor=sandbox.surfaceHeightAt(playerPhysicsState.player.x,playerPhysicsState.player.z,playerPhysicsState.player.y);
 playerPhysicsState.playerGrounded=Math.abs(playerPhysicsState.player.y-playerFloor)<=.18;
 playerPhysicsEnvironment={
  groundDepthAt:(x,z)=>sandbox.groundDepthAt(x,z),
  surfaceHeightAt:(x,z,y)=>sandbox.surfaceHeightAt(x,z,y),
  playerCollisionAt:(x,z,y)=>sandbox.playerCollisionAt(x,z,y),
  nudgePlayer:player=>sandbox.nudgePlayerOutOfBlocks(player)
 };
 playerModelRoot=playerModelFactory.create(THREE,materials,playerPhysicsState.player,performanceProfile.shadows);
 scene.add(playerModelRoot);updatePlayerModel();syncPlayerButtons();
 cameraUpdate();renderSandbox(sandbox.getState());
 if(JSON.stringify(raw)!==originalJson)throw new Error('The source starter world changed while opening the sandbox.');
 window.__DIYCRAFT_THREE_EDIT__.sourceUnchanged=true;
 requestAnimationFrame(animate);
}
start().catch(error=>{status.textContent='Sandbox could not start: '+error.message;throw error;});
})();
