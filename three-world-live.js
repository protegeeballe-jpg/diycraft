/* Production Three.js runtime. Device saves use the original DIYCraft version-1 world schema. */
(function(){
'use strict';
const THREE=window.THREE,adapter=window.DIYCraftThreeWorldAdapter,storage=window.DIYCraftThreeWorldStorage,starterWorld=window.DIYCraftThreeStarterWorld,deviceFiles=window.DIYCraftDeviceWorldFile;
const painterly=window.DIYCraftPainterlyMaterials,editing=window.DIYCraftThreeEditSandbox;
const raycastKeys=window.DIYCraftThreeRaycast,doorMotion=window.DIYCraftThreeDoorMotion,performanceProfiles=window.DIYCraftThreePerformanceProfile,plantGeometryFactory=window.DIYCraftThreePlantGeometry,doorModels=window.DIYCraftThreeDoorModel,animalGeometryFactory=window.DIYCraftThreeAnimalGeometry;
const playerPhysics=window.DIYCraftThreePlayerPhysics,playerCamera=window.DIYCraftThreePlayerCamera,playerModelFactory=window.DIYCraftThreePlayerModel,neighborModelFactory=window.DIYCraftThreeNeighborModels,coloring=window.DIYCraftThreeNeighborColoring,protection=window.DIYCraftThreeWorldProtection;
const timeVisuals=window.DIYCraftThreeWorldTime,viewportSizing=window.DIYCraftThreeViewport;
const canvas=document.getElementById('three-world'),status=document.getElementById('status');
let worldFeedbackTimer=0;
function showWorldFeedback(message){
 status.textContent=String(message);
 const feedback=document.getElementById('world-feedback');
 if(!feedback)return;
 feedback.textContent=String(message);feedback.hidden=false;
 if(worldFeedbackTimer)clearTimeout(worldFeedbackTimer);
 worldFeedbackTimer=setTimeout(()=>{feedback.hidden=true;worldFeedbackTimer=0;},2400);
}
const settingsPanel=document.getElementById('settings-panel'),settingsToggle=document.getElementById('settings-toggle'),settingsClose=document.getElementById('settings-close');
function setSettingsPanelOpen(open,restoreFocus=true){
 const expanded=!!open;
 settingsPanel.hidden=!expanded;
 settingsToggle.setAttribute('aria-expanded',String(expanded));
 settingsToggle.setAttribute('aria-label',expanded?'Hide controls panel':'Show controls panel');
 settingsToggle.title=expanded?'Hide controls panel':'Show controls panel';
 if(expanded){
  const firstControl=settingsPanel.querySelector('button,select,input');
  if(firstControl)firstControl.focus({preventScroll:true});
 }else if(restoreFocus)settingsToggle.focus({preventScroll:true});
}
settingsToggle.addEventListener('click',()=>setSettingsPanelOpen(settingsPanel.hidden));
settingsClose.addEventListener('click',()=>setSettingsPanelOpen(false));
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!settingsPanel.hidden){event.preventDefault();setSettingsPanelOpen(false);}
});
if(!THREE||!adapter||!storage||!starterWorld||!deviceFiles||!painterly||!editing||!raycastKeys||!doorMotion||!performanceProfiles||!plantGeometryFactory||!doorModels||!animalGeometryFactory||!playerPhysics||!playerCamera||!playerModelFactory||!neighborModelFactory||!coloring||!protection||!protection.pickAnimalAtScreen||!timeVisuals||!viewportSizing)throw new Error('A required local Three.js game dependency did not load.');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xf2ead9);scene.fog=new THREE.Fog(0xf2ead9,30,75);
const camera=new THREE.PerspectiveCamera(48,1,.1,150);
const deviceSignals=performanceProfiles.browserCapabilities(window.navigator,!!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches),4096,false);
const performanceProfile=performanceProfiles.select(deviceSignals),frameGate=performanceProfiles.createFrameGate(performanceProfile.fpsCap);
const renderer=new THREE.WebGLRenderer({canvas,antialias:performanceProfile.antialias,powerPreference:'low-power'});
const viewportController=viewportSizing.create(canvas,camera,renderer,window,{maxPixelRatio:performanceProfile.maxPixelRatio});
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
renderer.shadowMap.enabled=performanceProfile.shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const hemisphere=new THREE.HemisphereLight(0xfff7e9,0x788b70,.86);scene.add(hemisphere);
const sun=new THREE.DirectionalLight(0xfff0d5,1.05);sun.position.set(-14,23,16);sun.castShadow=performanceProfile.shadows;sun.shadow.mapSize.set(performanceProfile.shadows?1024:1,performanceProfile.shadows?1024:1);scene.add(sun);
const fill=new THREE.DirectionalLight(0xc5d9e8,.24);fill.position.set(12,9,-15);scene.add(fill);
const materials=painterly.create(THREE,renderer,performanceProfile);
const floorMat=new THREE.MeshStandardMaterial({color:0x789767,roughness:1});
const skyGeometry=new THREE.SphereGeometry(120,48,32);
const skyCanvas=painterly.generateSkyCanvas(timeVisuals.PALETTES.day.sky,'day',performanceProfile);
const skyTexture=new THREE.CanvasTexture(skyCanvas);
skyTexture.wrapS=THREE.RepeatWrapping;skyTexture.wrapT=THREE.ClampToEdgeWrapping;skyTexture.encoding=THREE.sRGBEncoding;skyTexture.generateMipmaps=true;
const skyMaterial=new THREE.MeshBasicMaterial({map:skyTexture,side:THREE.BackSide,fog:false,depthWrite:false,toneMapped:false});
const skyDome=new THREE.Mesh(skyGeometry,skyMaterial);skyDome.frustumCulled=false;skyDome.renderOrder=-1000;scene.add(skyDome);
const starPositions=[];
for(let i=0;i<44;i++){
 const azimuth=-Math.PI+(i*2.399963229728653)%(Math.PI*2),altitude=.18+((i*37)%76)/100,horizontal=Math.cos(altitude);
 starPositions.push(Math.sin(azimuth)*horizontal*105,Math.sin(altitude)*105,-Math.cos(azimuth)*horizontal*105);
}
const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
const starMaterial=new THREE.PointsMaterial({color:0xfffbe0,size:1.1,sizeAttenuation:false,transparent:true,opacity:.86,depthWrite:false});
const starField=new THREE.Points(starGeometry,starMaterial);starField.visible=false;starField.renderOrder=1;
const celestialGroup=new THREE.Group();celestialGroup.add(starField);
const celestialDisc=new THREE.Mesh(new THREE.SphereGeometry(2.35,12,8),new THREE.MeshBasicMaterial({color:0xfff2bc,fog:false,depthWrite:false}));
celestialDisc.renderOrder=1;celestialGroup.add(celestialDisc);scene.add(celestialGroup);
let requestedTimeMode='day',activeVisualMode=null;
function setSkyGradient(colors,mode){
  skyTexture.image=painterly.generateSkyCanvas(colors,mode,performanceProfile);
  skyTexture.needsUpdate=true;
}
function skyDirection(azimuth,altitude){
 const horizontal=Math.cos(altitude);
 return new THREE.Vector3(Math.sin(azimuth)*horizontal,Math.sin(altitude),-Math.cos(azimuth)*horizontal);
}
function applyWorldTime(seconds){
 const palette=timeVisuals.getPalette(requestedTimeMode,seconds);
 if(palette.mode===activeVisualMode)return;
 activeVisualMode=palette.mode;
 scene.background.set(palette.sky[0]);scene.fog.color.set(palette.sky[2]);
 hemisphere.color.set(palette.sky[0]);hemisphere.groundColor.set(palette.ground);
 hemisphere.intensity=palette.mode==='night'?.43:palette.mode==='sunset'?.68:.86;
 sun.color.set(palette.mode==='night'?'#b8c6df':palette.sun);
 sun.intensity=palette.mode==='night'?.055:palette.mode==='sunset'?.68:1.05;
 sun.position.set(-14,palette.mode==='sunset'?7:23,16);
 fill.color.set(palette.mode==='night'?'#9eafd4':'#c5d9e8');
 fill.intensity=palette.mode==='night'?.28:palette.mode==='sunset'?.18:.24;
 floorMat.color.set(palette.ground);
 setSkyGradient(palette.sky,palette.mode);
 const night=palette.mode==='night',direction=night?skyDirection(-.48,.29):palette.mode==='sunset'?skyDirection(.98,.12):skyDirection(.42,.29);
 starField.visible=night;celestialDisc.material.color.set(night?'#f6f0ce':palette.sun);
 celestialDisc.position.copy(direction.multiplyScalar(105));
 return palette;
}
const floor=new THREE.Mesh(new THREE.PlaneGeometry(90,90),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.08;floor.receiveShadow=true;scene.add(floor);
const group=new THREE.Group();scene.add(group);
const BLOCK_SIZE=1,boxGeometry=new THREE.BoxGeometry(BLOCK_SIZE,BLOCK_SIZE,BLOCK_SIZE),tileGeometry=new THREE.BoxGeometry(BLOCK_SIZE,.13,BLOCK_SIZE),doorGeometry=new THREE.BoxGeometry(doorModels.dimensions.width,doorModels.dimensions.height,doorModels.dimensions.thickness);
const plantStemGeometry=new THREE.CylinderGeometry(.025,.04,.78,6),plantLeafGeometry=new THREE.SphereGeometry(.20,8,6),plantPetalGeometry=new THREE.SphereGeometry(.15,8,6),plantCenterGeometry=new THREE.SphereGeometry(.085,8,6),grassBladeGeometry=new THREE.ConeGeometry(.065,.72,5);
const animatedPlants=[],animalSurfaceMaterial=materials.get('#ffffff','paper');
animalSurfaceMaterial.vertexColors=true;animalSurfaceMaterial.needsUpdate=true;
let animalBatches=[],birdWingBatches=[],quadrupedLegBatches=[],renderedAnimalCount=0,animalStatesCache=[],animalCareSelection=null,animalCareFlashUntil=0,animalCareFlashEmoji='💚',animalCareFlashAnimalId=null,lastBirdFlapAngle=0,lastBirdFlightY=0,lastGroundLegAngle=0,lastGroundLegRotationOrder='YXZ',lastGroundLegRotationX=0,lastGroundLegRotationY=0;
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
let deviceStorage=null,storageReadFailed=false,storageLoadSource='pending',lastAutoSaveRevision=0;
let primaryWorldFileHandle=null,primaryWorldFileName='',deviceWorldFileState='unlinked',primaryWorldFileRemembered=false;
let deviceFileSaveTimer=0,deviceFileWriteBusy=false,deviceFileDrainPromise=null,deviceFileFlushRequested=false,pendingDeviceFileWorld=null;
let saveTimer=0,saveInFlight=false,pendingSaveWorld=null,saveGeneration=0,savedGeneration=0;
let lastPosePersisted=null,lastPosePersistAt=0,animalPlacementSpecies='';
let waterMesh=null,fishMeshes=[],renderedFishCount=0,lastWaterAnimationAt=-Infinity;
let playerPhysicsState=null,playerModelRoot=null,playerPlayMode=false,playerCameraMode='third',playerCameraPose=null,lastPlayerPhysicsTime=0;
let neighborColorName='',neighborColorPage=null,neighborColorTool='fill',neighborColorUndo=[],neighborColorDrawing=false,neighborColorLast=null,neighborColorTimer=null,neighborColorHideTimer=null,neighborColorStep=0;
const neighborColorShade=document.getElementById('neighbor-coloring');
const animalCareShade=document.getElementById('animal-care'),animalCareFlash=document.getElementById('animal-care-flash');
const neighborColorCanvas=document.getElementById('neighbor-color-canvas');
const neighborColorCtx=neighborColorCanvas.getContext('2d',{willReadFrequently:true});

const neighborModels=new Map();let renderedNeighborCount=0,neighborStatesCache=[];
let playerControls={moveX:0,moveZ:0,vertical:0,keys:{}},touchDirections=new Set(),touchVerticalDirections=new Set(),physicsClock=playerPhysics.createFixedStepper();
// World interaction is gesture-first: tap builds/fills; hold digs/removes; no action buttons are needed.
const touchControls=document.getElementById('player-controls'),touchActions=document.getElementById('player-actions'),flightVerticalControls=document.getElementById('flight-vertical-controls'),playModeButton=document.getElementById('play-mode'),cameraModeButton=document.getElementById('camera-mode'),jumpButton=document.getElementById('jump'),flightButton=document.getElementById('flight');

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
 cameraModeButton.disabled=!playerPlayMode;
 jumpButton.disabled=!playerPhysicsState;
 flightButton.disabled=!playerPhysicsState;
 cameraModeButton.textContent=playerCameraMode==='third'?'First person':'Third person';
 flightButton.textContent=playerPhysicsState?.flying?'Flight on':'Flight off';
 flightButton.setAttribute('aria-pressed',String(!!playerPhysicsState?.flying));
 // Vertical movement is exposed only while the player is in creative flight.
 flightVerticalControls.hidden=!playerPhysicsState?.flying;
 // Keep both touch clusters visible in Build Mode and Play Mode.
 // The first movement/action input starts Play Mode when needed.
 touchControls.hidden=false;touchActions.hidden=false;
}
function syncTouchMovement(){
 playerControls.moveX=(touchDirections.has('right')?1:0)-(touchDirections.has('left')?1:0);
 playerControls.moveZ=(touchDirections.has('forward')?1:0)-(touchDirections.has('back')?1:0);
 playerControls.vertical=(touchVerticalDirections.has(1)?1:0)-(touchVerticalDirections.has(-1)?1:0);
}
function clearPlayerInputs(){
 playerControls={moveX:0,moveZ:0,vertical:0,keys:{}};
 touchDirections.clear();touchVerticalDirections.clear();
}
function setPlayerPlayMode(enabled){
 playerPlayMode=!!enabled;
 clearPlayerInputs();physicsClock.reset();lastPlayerPhysicsTime=performance.now();
 if(playerPlayMode){
  playerCameraMode='third';
  status.textContent='Play mode · WASD / arrows to move · F to toggle flight · Space/Shift to rise/descend while flying';
  updatePlayerCamera();
 }else{
  status.textContent='Build mode · Tap to build or fill · Hold 0.6s to dig or remove · Drag to orbit';
  if(playerModelRoot)playerModelRoot.visible=true;
  cameraUpdate();
 }
 syncPlayerButtons();updatePlayerDiagnostics();
}
function jumpPlayer(){
 if(!playerPhysicsState)return;
 if(!playerPlayMode)setPlayerPlayMode(true);
 const result=playerPhysics.jump(playerPhysicsState);
 playerPhysicsState=result.state;
 status.textContent=result.accepted?'Jump!':'Jump is unavailable while flying, airborne, or resting.';
 updatePlayerModel();updatePlayerDiagnostics();
}
function togglePlayerFlight(){
 if(!playerPhysicsState)return;
 if(!playerPlayMode)setPlayerPlayMode(true);
 playerPhysicsState={...playerPhysicsState,flying:!playerPhysicsState.flying,jumpVelocity:0};
 status.textContent=playerPhysicsState.flying?'Creative flight enabled · Hold UP to rise and DOWN to descend.':'Flight turned off.';
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
  if(!playerPhysicsState)return;
  event.preventDefault();
  if(!playerPlayMode)setPlayerPlayMode(true);
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
document.querySelectorAll('[data-flight-vertical]').forEach(button=>{
 const direction=Number(button.dataset.flightVertical);
 const press=event=>{
  if(!playerPhysicsState?.flying||!Number.isFinite(direction)||direction===0)return;
  event.preventDefault();
  touchVerticalDirections.add(direction);syncTouchMovement();
  try{button.setPointerCapture(event.pointerId);}catch(_){}
 };
 const release=event=>{
  if(!touchVerticalDirections.has(direction))return;
  event.preventDefault();touchVerticalDirections.delete(direction);syncTouchMovement();
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
 animalBatches=[];birdWingBatches=[];quadrupedLegBatches=[];renderedAnimalCount=0;animalStatesCache=[];
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
 const root=new THREE.Group();root.position.set(block.x+.5,block.y,block.z+.5);root.scale.setScalar(plantGeometryFactory.renderScale);root.userData.blockKey=block.key;
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
function animalFacingCamera(animal){
 if(animal.species==='bird')return Number.isFinite(animal.facing)?animal.facing:0;
 // The ground animals are friendly companions: keep their faces visible while the player orbits the world.
 return Math.atan2(camera.position.x-animal.x,camera.position.z-animal.z);
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
 // Keep familiar residents visible, then use the remaining instance budget for nearby saved animals.
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
   entry={geometry,animals:[],species:animal.species,body,accent};byAppearance.set(key,entry);
  }
  entry.animals.push(animal);
 });
 const dummy=new THREE.Object3D();animalBatches=[];birdWingBatches=[];quadrupedLegBatches=[];
 byAppearance.forEach(entry=>{
  const mesh=new THREE.InstancedMesh(entry.geometry,animalSurfaceMaterial,entry.animals.length);
  mesh.castShadow=performanceProfile.shadows;mesh.receiveShadow=performanceProfile.shadows;
  mesh.userData.animalInstances=true;
  entry.animals.forEach((animal,index)=>{
   const isBird=animal.species==='bird';
   dummy.position.set(animal.x,isBird?.70:.04,animal.z);
   dummy.rotation.set(0,animalFacingCamera(animal),0);dummy.scale.setScalar(animalGeometryFactory.renderScale);dummy.updateMatrix();
   mesh.setMatrixAt(index,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;group.add(mesh);
  animalBatches.push({mesh,animals:entry.animals,species:entry.species});
  if(entry.species==='bird'){
   const leftGeometry=animalGeometryFactory.createBirdWingGeometry(THREE,{body:entry.body,accent:entry.accent,side:-1});
   const rightGeometry=animalGeometryFactory.createBirdWingGeometry(THREE,{body:entry.body,accent:entry.accent,side:1});
   leftGeometry.userData.sandboxOwned=true;rightGeometry.userData.sandboxOwned=true;
   const leftMesh=new THREE.InstancedMesh(leftGeometry,animalSurfaceMaterial,entry.animals.length);
   const rightMesh=new THREE.InstancedMesh(rightGeometry,animalSurfaceMaterial,entry.animals.length);
   leftMesh.userData.animalWingInstances=true;rightMesh.userData.animalWingInstances=true;
   leftMesh.castShadow=rightMesh.castShadow=performanceProfile.shadows;
   leftMesh.receiveShadow=rightMesh.receiveShadow=performanceProfile.shadows;
   group.add(leftMesh,rightMesh);
   birdWingBatches.push({leftMesh,rightMesh,animals:entry.animals});
  }else{
   const legGeometry=animalGeometryFactory.createQuadrupedLegGeometry(THREE,{species:entry.species,body:entry.body,accent:entry.accent});
   legGeometry.userData.sandboxOwned=true;
   const legMesh=new THREE.InstancedMesh(legGeometry,animalSurfaceMaterial,entry.animals.length*4);
   legMesh.castShadow=performanceProfile.shadows;legMesh.receiveShadow=performanceProfile.shadows;
   legMesh.userData.quadrupedLegInstances=true;
   group.add(legMesh);
   quadrupedLegBatches.push({mesh:legMesh,animals:entry.animals,layout:legGeometry.userData.legLayout,pivotY:legGeometry.userData.pivotY});
  }
 });
 renderedAnimalCount=visible.length;
}
const birdRoot=new THREE.Object3D(),birdLeftPivot=new THREE.Object3D(),birdRightPivot=new THREE.Object3D();
birdLeftPivot.position.set(-.20,1.02,-.015);birdRightPivot.position.set(.20,1.02,-.015);
birdRoot.add(birdLeftPivot,birdRightPivot);
function updateAnimalInstances(now){
 const time=now*.001,dummy=new THREE.Object3D();dummy.rotation.order='XYZ';
 const current=sandbox?sandbox.animalStates(time):animalStatesCache;
 animalStatesCache=current;
 const byId=new Map(current.map(animal=>[animal.id,animal]));
 animalBatches.forEach(batch=>{
  batch.animals.forEach((original,index)=>{
   const animal=byId.get(original.id)||original,phase=Number.isFinite(animal.phase)?animal.phase:0;
   const isBird=animal.species==='bird';
   const bob=isBird?.70+Math.sin(time*3.2+phase)*.105:.04+Math.sin(time*2.2+phase)*.03;
   dummy.position.set(animal.x,bob,animal.z);
   dummy.rotation.order='XYZ';dummy.rotation.set(0,animalFacingCamera(animal),isBird?Math.cos(time*2.1+phase)*.035:Math.sin(time*1.1+phase)*.018);
   dummy.scale.setScalar(animalGeometryFactory.renderScale);dummy.updateMatrix();batch.mesh.setMatrixAt(index,dummy.matrix);
  });
  batch.mesh.instanceMatrix.needsUpdate=true;
 });
 quadrupedLegBatches.forEach(batch=>{
  let instance=0;
  batch.animals.forEach(original=>{
   const animal=byId.get(original.id)||original,phase=Number.isFinite(animal.phase)?animal.phase:0;
   const yaw=animalFacingCamera(animal),moving=animal.moving!==false;
   const bob=.04+Math.sin(time*2.2+phase)*.03,gait=time*7.2+phase,layout=batch.layout;
   const legs=[[-layout.legX,-layout.legZ,0],[layout.legX,-layout.legZ,Math.PI],[-layout.legX,layout.legZ,Math.PI],[layout.legX,layout.legZ,0]];
   legs.forEach(leg=>{
    const stride=moving?Math.sin(gait+leg[2])*.24:Math.sin(time*1.1+phase+leg[2])*.025;
    lastGroundLegAngle=stride;
    const dx=leg[0],dz=leg[1],cos=Math.cos(yaw),sin=Math.sin(yaw),animalScale=animalGeometryFactory.renderScale;
    const worldX=animal.x+(dx*cos+dz*sin)*animalScale,worldZ=animal.z+(-dx*sin+dz*cos)*animalScale;
    dummy.position.set(worldX,bob+batch.pivotY*animalScale,worldZ);
    animalGeometryFactory.applyQuadrupedLegPose(dummy,yaw,stride);lastGroundLegRotationOrder=dummy.rotation.order;lastGroundLegRotationX=dummy.rotation.x;lastGroundLegRotationY=dummy.rotation.y;dummy.scale.setScalar(animalScale);dummy.updateMatrix();
    batch.mesh.setMatrixAt(instance++,dummy.matrix);
   });
  });
  batch.mesh.instanceMatrix.needsUpdate=true;
 });
 birdWingBatches.forEach(batch=>{
  batch.animals.forEach((original,index)=>{
   const animal=byId.get(original.id)||original,phase=Number.isFinite(animal.phase)?animal.phase:0;
   const flap=Math.sin(time*11.5+phase)*.60;
   lastBirdFlapAngle=flap;lastBirdFlightY=.70+Math.sin(time*3.2+phase)*.105;
   birdRoot.position.set(animal.x,lastBirdFlightY,animal.z);birdRoot.scale.setScalar(animalGeometryFactory.renderScale);
   birdRoot.rotation.set(0,animalFacingCamera(animal),Math.cos(time*2.1+phase)*.035);
   birdLeftPivot.rotation.set(.025*Math.cos(time*11.5+phase),0,-flap);
   birdRightPivot.rotation.set(-.025*Math.cos(time*11.5+phase),0,flap);
   birdRoot.updateMatrixWorld(true);
   batch.leftMesh.setMatrixAt(index,birdLeftPivot.matrixWorld);
   batch.rightMesh.setMatrixAt(index,birdRightPivot.matrixWorld);
  });
  batch.leftMesh.instanceMatrix.needsUpdate=true;batch.rightMesh.instanceMatrix.needsUpdate=true;
 });
}
function renderSandbox(state){
 const now=performance.now();syncDoorMotions(state,now);
 requestedTimeMode=['day','sunset','night','auto'].includes(state.world.timeMode)?state.world.timeMode:'day';
 document.getElementById('time-mode').value=requestedTimeMode;
 applyWorldTime(now*.001);
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
 const patternInput=document.getElementById('pattern');
 // Keep the saved future tile design selected unless an actual tile is selected for editing.
 patternInput.value=selectedBlock&&selectedBlock.type==='tile'
  ?(selectedBlock.tilePattern||'grid')
  :(state.world.tileDesign?.pattern||patternInput.value||'grid');
 const renderObjects=group.children.length,instanceBatches=batches.size,waterCount=(state.world.water||[]).length,fishCount=(state.world.fish||[]).length,animalCount=(state.world.animals||[]).length,residentAnimalCount=protection.RESIDENTS.length,totalAnimalCount=animalStatesCache.length;
 status.textContent=state.world.name+' · '+state.world.blocks.length+' blocks · '+instanceBatches+' instanced batches · '+renderObjects+' render objects · Bucket: '+(state.world.bucket?.length||0)+
  (selectedBlock?' · Selected: '+selectedBlock.type:' · Tap to build or fill · Hold 0.6s to dig or remove')+
  ' · Water: '+waterCount+' · Fish: '+fishCount+' ('+renderedFishCount+' shown) · Animals: '+totalAnimalCount+' ('+residentAnimalCount+' residents, '+animalCount+' saved; '+renderedAnimalCount+' shown) · '+performanceProfile.tier+' quality · '+(storageReadFailed?'Existing save protected — restore backup':'Autosaving to this device');
 window.__DIYCRAFT_THREE_EDIT__={revision:state.revision,selectedKey:state.selectedKey,blockCount:state.world.blocks.length,renderedBlocks:state.world.blocks.length,
  sourceUnchanged:state.sourceUnchanged,storageKeys:getStorageKeyCount(),renderedMeshes:renderObjects,renderObjects,instanceBatches,
  performanceProfile:{tier:performanceProfile.tier,fpsCap:performanceProfile.fpsCap,maxPixelRatio:performanceProfile.maxPixelRatio,antialias:performanceProfile.antialias,shadows:performanceProfile.shadows,textureSize:performanceProfile.textureSize,maxVisibleFish:performanceProfile.maxVisibleFish,maxVisibleAnimals:performanceProfile.maxVisibleAnimals,waterAnimationFps:performanceProfile.waterAnimationFps},
  waterCount,fishCount,renderedFishCount,animalCount,residentAnimalCount,totalAnimalCount,renderedAnimalCount,animalBatchCount:animalBatches.length,canvasSize:{width:canvas.width,height:canvas.height},get viewport(){return viewportController.getSize();},get cameraAspect(){return camera.aspect},
  getInventoryStats:()=>{const state=sandbox.getState();return {materials:(state.world.materials||[]).slice(0,60),crafted:(state.world.crafted||[]).slice(0,60),bucket:(state.world.bucket||[]).map(item=>({...item})),recipes:editing.recipes.map(recipe=>({id:recipe.id,name:recipe.name,cost:{...recipe.cost}}))};},
  getBlockRepresentationStats:()=>{
   const current=sandbox.getState(),counts=new Map();
   for(const child of group.children){
    if(child.userData.selectionOutline)continue;
    const keys=Array.isArray(child.userData.blockKeys)?child.userData.blockKeys:
     (typeof child.userData.blockKey==='string'?[child.userData.blockKey]:[]);
    for(const key of keys)counts.set(key,(counts.get(key)||0)+1);
   }
   const expected=current.world.blocks.map(block=>block.key);
   const missing=expected.filter(key=>!counts.has(key));
   const duplicates=expected.filter(key=>(counts.get(key)||0)>1);
   return {expectedCount:expected.length,representedCount:expected.filter(key=>counts.has(key)).length,missing,duplicates,
     cellDimensions:{width:BLOCK_SIZE,height:BLOCK_SIZE,depth:BLOCK_SIZE}};
  },
  focusFlowerForTest:(index=0)=>{
   const roots=group.children.filter(root=>root.userData.blockKey&&root.children.some(child=>
    child.isMesh&&child.geometry?.userData?.plantShape?.plantType==='flower'));
   if(!roots.length)return false;
   playerPlayMode=false;touchControls.hidden=true;touchActions.hidden=true;
   const root=roots[Math.max(0,Math.min(roots.length-1,Math.floor(index)))];
   target.set(root.position.x,root.position.y+.93,root.position.z);
   orbit.radius=2.35;orbit.theta=.62;orbit.phi=1.25;cameraUpdate();
   return {x:root.position.x,y:root.position.y,z:root.position.z,flowerIndex:index};
  },
  getPlantStats:()=>{
   const plants=group.children.filter(root=>root.userData.blockKey&&root.children.some(child=>child.isMesh&&child.geometry?.userData?.plantShape));
   const flowers=plants.map(root=>{
    const mesh=root.children.find(child=>child.isMesh&&child.geometry?.userData?.plantShape),shape=mesh.geometry.userData.plantShape;
    return {type:shape.plantType,renderScale:root.scale.x,petalCount:shape.petalCount,leafCount:shape.leafCount,flowerVolume:shape.flowerVolume,
     petalCrossSectionSegments:shape.petalCrossSectionSegments,petalLongitudinalRings:shape.petalLongitudinalRings,
     petalThickness:shape.petalThickness,petalRise:shape.petalRise,petalCupDepth:shape.petalCupDepth,flowerCenterY:shape.flowerCenterY,petalProfiles:shape.petalProfiles,stalkVolume:shape.stalkVolume,basalLeavesVolume:shape.basalLeavesVolume,
     leafThickness:shape.leafThickness,vertexCount:mesh.geometry.attributes.position.count,indexCount:mesh.geometry.index?.count||0};
   });
   return {plantCount:plants.length,flowerCount:flowers.filter(item=>item.type==='flower').length,flowers};
  },
  getDesignStats:()=>{const state=sandbox.getState().world;return {customBlock:{...state.customBlock},solidStyles:{...state.solidStyles},styledSolidTypes:[...(state.styledSolidTypes||[])],doorDesign:{...state.doorDesign},tileDesign:{...state.tileDesign}};},
  getBlockVisualStats:(key)=>{
   const block=blockByKey.get(key);if(!block)return null;
   if(block.type==='flower'||block.type==='tall_grass'){
    const root=group.children.find(item=>item.userData.blockKey===key),mesh=root?.children.find(item=>item.isMesh),shape=mesh?.geometry?.userData?.plantShape;
    return {type:block.type,color:block.color||null,plantBaseColor:shape?.grassBaseColor||block.color||null,hasGeometry:!!mesh};
   }
   const kind=block.type==='tile'?'tile-'+(block.tilePattern||'grid'):(block.texture||block.type),material=mat(block),image=material.map?.image,context=image?.getContext?.('2d');
   let signature=0;
   if(context&&image.width&&image.height){
    const data=context.getImageData(0,0,image.width,image.height).data;
    for(let i=0;i<data.length;i+=16)signature=Math.imul(signature^data[i],16777619)>>>0;
   }
   return {type:block.type,color:block.color||null,texture:block.texture||null,tilePattern:block.tilePattern||null,
    materialKind:kind,hasCanvasMap:!!context,textureWidth:image?.width||0,textureHeight:image?.height||0,textureSignature:signature};
  },
  inventoryOpen:()=>!inventoryPanel.hidden,
  characterOpen:()=>!characterPanel.hidden,
  artOpen:()=>!artStudio.hidden,galleryOpen:()=>!galleryPanel.hidden,
  getGalleryStats:()=>({artworks:sandbox.getState().world.artworks.map(artwork=>({name:artwork.name,dataLength:artwork.data.length})),imageCount:galleryRoot.querySelectorAll('img').length}),

  getCharacterStats:()=>{const player=sandbox.getState().world.player||{};return {player:{...player},modelScale:playerModelRoot?{x:playerModelRoot.scale.x,y:playerModelRoot.scale.y,z:playerModelRoot.scale.z}:null,meshCount:playerModelRoot?playerModelRoot.children.filter(child=>child.isMesh).length:0,vertexCount:playerModelRoot?.userData.playerGeometry?.attributes.position.count||0};},
  visualTimeMode:activeVisualMode,
  getVisualTimeStats:()=>({requestedMode:requestedTimeMode,mode:activeVisualMode,skyColors:timeVisuals.PALETTES[activeVisualMode].sky.slice(),groundColor:timeVisuals.PALETTES[activeVisualMode].ground,starsVisible:starField.visible,starCount:starGeometry.attributes.position.count,discVisible:celestialDisc.visible,skyVertexCount:skyGeometry.attributes.position.count,skyTexture:{hasMap:skyMaterial.map===skyTexture,width:skyTexture.image.width,height:skyTexture.image.height,version:skyTexture.version,signature:(()=>{const pixels=skyTexture.image.getContext('2d').getImageData(0,0,skyTexture.image.width,skyTexture.image.height).data;let hash=2166136261;const stride=Math.max(4,Math.floor(pixels.length/4096/4)*4);for(let i=0;i<pixels.length;i+=stride){hash=Math.imul(hash^pixels[i],16777619)>>>0;hash=Math.imul(hash^pixels[i+1],16777619)>>>0;hash=Math.imul(hash^pixels[i+2],16777619)>>>0;}return hash>>>0;})()}}),
  setVisualTimeAtForTest:(seconds)=>{applyWorldTime(seconds);return window.__DIYCRAFT_THREE_EDIT__.getVisualTimeStats();},
  releaseVisualTimeTest:()=>{applyWorldTime(performance.now()/1000);return window.__DIYCRAFT_THREE_EDIT__.getVisualTimeStats();},
  playerMode:playerPlayMode,cameraMode:playerCameraMode,
  getPlayerState:()=>playerPhysicsState?{player:{...playerPhysicsState.player},jumpVelocity:playerPhysicsState.jumpVelocity,playerGrounded:playerPhysicsState.playerGrounded,flying:playerPhysicsState.flying,playerActivity:playerPhysicsState.playerActivity}:null,
  getPlayerCamera:()=>playerCameraPose?{pos:{...playerCameraPose.pos},yaw:playerCameraPose.yaw,pitch:playerCameraPose.pitch}:null,
  getProtectionContext:()=>currentProtectionContext(),isProtectedDigCell:(x,z)=>isProtectedTarget(x,z),
  lastPlacement:lastPlacement?{key:lastPlacement.key,x:lastPlacement.x,y:lastPlacement.y,z:lastPlacement.z,step:lastPlacement.step.slice()}:null,
  getGroundScreenPointForTest:(x,z)=>Number.isInteger(x)&&Number.isInteger(z)?screenPointForTest(new THREE.Vector3(x+.5,-.08,z+.5)):null,
  focusGroundCellForTest:(x,z)=>{if(!Number.isInteger(x)||!Number.isInteger(z))return false;playerPlayMode=false;touchControls.hidden=true;touchActions.hidden=true;target.set(x+.5,0,z+.5);orbit.radius=23;orbit.theta=.62;orbit.phi=.92;cameraUpdate();return screenPointForTest(new THREE.Vector3(x+.5,-.08,z+.5));},
  getPoolSiteProtectionForTest:()=>({site:{...protection.POOL_WORKSITE},protected:sandbox.isProtectedDigCell(14,-5,currentProtectionContext()),context:currentProtectionContext()}),
  getBlockScreenPointForTest:(key)=>{const block=blockByKey.get(key);return block?screenPointForTest(new THREE.Vector3(block.x+.5,block.y+(block.type==='tile'?.12:.98),block.z+.5)):null;},
  getPointerTargetForTest:(x,y)=>{const hit=worldTargetAtScreen(x,y);return hit?{kind:hit.kind,key:hit.key||null,x:hit.x??null,z:hit.z??null,step:hit.step||null}:null;},
  getActorPickForTest:(x,y)=>{const animal=animalAtScreen(x,y);if(animal)return {kind:'animal',id:animal.id};const neighbor=neighborAtScreen(x,y);return neighbor?{kind:'neighbor',id:neighbor.id||null,name:neighbor.name}:null;},
  pickBlock:(key)=>{const block=blockByKey.get(key);if(!block)return false;const p=new THREE.Vector3(block.x+.5,block.y+.5,block.z+.5).project(camera);clickAt((p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2);return true;},
  getDoorAngle:(key)=>{const block=blockByKey.get(key);return block&&block.type==='door'?displayedDoorAngle(block):null;},
  getDoorVisualStats:(key)=>{const block=blockByKey.get(key),root=meshByKey.get(key);if(!block||block.type!=='door'||!root)return null;const layout=doorModels.create(block),panel=root.children.find(child=>child.isMesh),image=panel?.material?.map?.image,ctx=image?.getContext?.('2d');const sample=(x,y)=>{if(!ctx)return null;const px=Math.max(0,Math.min(image.width-1,Math.round(x/.84*image.width))),py=Math.max(0,Math.min(image.height-1,Math.round((1.96-y)/1.96*image.height))),v=ctx.getImageData(px,py,1,1).data;return {r:v[0],g:v[1],b:v[2]};};return {style:layout.style,textureKind:layout.textureKind,color:layout.color,orientation:layout.orientation,pivot:layout.pivot,baseAngle:layout.baseAngle,textureWidth:image?.width||0,textureHeight:image?.height||0,hasPainterlyMap:!!image,styleSample:sample(layout.style==='window'?.42:.43,layout.style==='window'?1.38:1.43)};},
  getWaterStats:()=>{const matrix=fishMeshes[0]?.mesh.instanceMatrix.array;return {cells:(sandbox.getState().world.water||[]).length,fish:(sandbox.getState().world.fish||[]).length,renderedFish:renderedFishCount,waterVertices:waterMesh?waterMesh.geometry.attributes.position.count:0,surfaceY:waterMesh?waterMesh.geometry.attributes.position.getY(0):null,fishAngle:matrix?Math.atan2(matrix[8],matrix[0]):null};},
  getAnimalStats:()=>({renderScale:animalGeometryFactory.renderScale,instanceScale:animalBatches[0]?.mesh.instanceMatrix.array?(()=>{const matrix=animalBatches[0].mesh.instanceMatrix.array;return {x:Math.hypot(matrix[0],matrix[1],matrix[2]),y:Math.hypot(matrix[4],matrix[5],matrix[6]),z:Math.hypot(matrix[8],matrix[9],matrix[10])};})():null,animals:sandbox.getState().world.animals||[],residents:animalStatesCache.filter(animal=>residentAnimalIds.has(animal.id)),all:animalStatesCache,rendered:renderedAnimalCount,batches:animalBatches.length,birdWingBatches:birdWingBatches.length,birdWingInstances:birdWingBatches.reduce((count,batch)=>count+batch.animals.length,0),birdFlapAngle:lastBirdFlapAngle,birdFlightY:lastBirdFlightY,birdWingPivotY:birdLeftPivot.position.y,quadrupedLegBatches:quadrupedLegBatches.length,quadrupedLegInstances:quadrupedLegBatches.reduce((count,batch)=>count+batch.animals.length*4,0),groundLegSwingAngle:lastGroundLegAngle,groundLegRotationOrder:lastGroundLegRotationOrder,groundLegRotationX:lastGroundLegRotationX,groundLegRotationY:lastGroundLegRotationY,firstY:animalBatches[0]?.mesh.instanceMatrix.array[13]??null}),getAnimalScreenPoint:animalScreenPoint,focusAnimalForTest,tapAnimal:(id)=>{const point=animalScreenPoint(id);if(!point)return false;clickAt(point.x,point.y);return !animalCareShade.hidden;},getAnimalCareStats:()=>({open:!animalCareShade.hidden,animal:animalCareSelection?.id||null,count:animalCareSelection?sandbox.getState().world.animalCare?.[animalCareSelection.id]||0:0,flash:!animalCareFlash.hidden,animalCare:{...(sandbox.getState().world.animalCare||{})}}),neighborCount:neighborModels.size,renderedNeighborCount,focusNeighborForTest:(id)=>{const actor=sandbox.characterStates(performance.now()/1000).find(item=>item.id===id);if(!actor||actor.sleeping)return false;playerPlayMode=false;touchControls.hidden=true;touchActions.hidden=true;target.set(actor.x,1.18,actor.z);orbit.radius=14;orbit.theta=.5;orbit.phi=.88;cameraUpdate();updateNeighborModels(performance.now());return true;},getNeighborScreenPoint:neighborScreenPoint,tapNeighbor:(id)=>{const point=neighborScreenPoint(id);if(!point)return false;clickAt(point.x,point.y);return !neighborColorShade.hidden;},getNeighborColoringStats:()=>({open:!neighborColorShade.hidden,neighbor:neighborColorName,page:neighborColorPage?.id||null,undo:neighborColorUndo.length,progress:document.getElementById('neighbor-color-progress-fill').style.width,artworks:sandbox.getState().world.artworks?.length||0}),getNeighborStats:(timeSeconds)=>{if(Number.isFinite(timeSeconds))updateNeighborModels(timeSeconds*1000);const actors=Number.isFinite(timeSeconds)?sandbox.characterStates(timeSeconds):neighborStatesCache;return {total:actors.length,rendered:renderedNeighborCount,actors:actors.map(actor=>({id:actor.id,name:actor.name,x:actor.x,z:actor.z,facing:actor.facing,moving:actor.moving,sleeping:actor.sleeping,phase:actor.phase,pace:actor.pace,scale:actor.scale,shirt:actor.shirt,hairStyle:actor.hairStyle,outfitStyle:actor.outfitStyle,accessory:actor.accessory,visible:!!neighborModels.get(actor.id)?.root.visible,position:neighborModels.has(actor.id)?{x:neighborModels.get(actor.id).root.position.x,y:neighborModels.get(actor.id).root.position.y,z:neighborModels.get(actor.id).root.position.z}:null}))};},debugPlaceObstacleForTest:(input,timeSeconds=performance.now()/1000)=>{const next=sandbox.addBlock(input);renderSandbox(next);updateNeighborModels(timeSeconds*1000);return {revision:next.revision,key:next.selectedKey,sourceUnchanged:next.sourceUnchanged};},debugRemoveObstacleForTest:(key,timeSeconds=performance.now()/1000)=>{const next=sandbox.remove(key,sandbox.protectionContext(timeSeconds));renderSandbox(next);updateNeighborModels(timeSeconds*1000);return {revision:next.revision,sourceUnchanged:next.sourceUnchanged};},getPersistenceStats:()=>{const state=sandbox.getState();return {name:state.world.name,sourceUnchanged:state.sourceUnchanged,storageKeys:getStorageKeyCount(),revision:state.revision,lastAutoSaveRevision,saveGeneration,savedGeneration,saveInFlight,hasPendingSave:!!pendingSaveWorld,pendingBlocks:pendingSaveWorld?.blocks?.length||0,saveTimerActive:!!saveTimer,storageReadFailed};},getState:()=>sandbox.getState()};
 updatePlayerDiagnostics();
 if(state.revision>lastAutoSaveRevision){lastAutoSaveRevision=state.revision;queueWorldSave(state.world,true);}
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
  queueWorldSave(sandbox.getState().world,false);
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
  x:actor.x+.22,y:actor.species==='giraffe'?1.65:1.12,z:actor.z
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
 return protection.pickNeighborAtScreen(actors,x,y,projectNeighborPick);
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
function placeAnimalAtScreen(x,y){
 if(!animalPlacementSpecies)return false;
 pointer.x=(x/innerWidth)*2-1;pointer.y=-(y/innerHeight)*2+1;
 raycaster.setFromCamera(pointer,camera);
 const point=raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());
 if(!point)return false;
 try{
  const next=sandbox.addAnimal({species:animalPlacementSpecies,x:point.x,z:point.z});
  const name=next.world.animals[next.world.animals.length-1]?.name||animalPlacementSpecies;
  renderSandbox(next);status.textContent=name+' joined your peaceful world. Tap them anytime for gentle care.';
  return true;
 }catch(error){status.textContent=error.message;return false;}
}
function clickAt(x,y){
 const animal=animalAtScreen(x,y);
 if(animal){lastPlacement=null;openAnimalCare(animal);return;}
 const neighbor=neighborAtScreen(x,y);
 if(neighbor){lastPlacement=null;openNeighborColoring(neighbor.name);return;}
 if(animalPlacementSpecies&&placeAnimalAtScreen(x,y))return;
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
function buildInputAt(x,y,z){
 const type=document.getElementById('block-type').value,input={type,x,y,z};
 if(type==='custom'){input.color=document.getElementById('color').value;input.texture='custom';}
 const quickColor=window.DIYCraftQuickMaterialColors?.[type];if(quickColor&&/^#[0-9a-f]{6}$/i.test(quickColor))input.color=quickColor;
 if(type==='tile')input.tilePattern=document.getElementById('pattern').value;
 if(type==='door')input.style=document.getElementById('door-style').value;
 return input;
}
function screenPointForTest(point){
 camera.updateMatrixWorld(true);
 const projected=point.project(camera),rect=canvas.getBoundingClientRect();
 if(projected.z< -1||projected.z>1||!rect.width||!rect.height)return null;
 const x=rect.left+(projected.x+1)*rect.width/2,y=rect.top+(1-projected.y)*rect.height/2;
 return {x,y,visible:x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom};
}
function worldTargetAtScreen(clientX,clientY){
 const rect=canvas.getBoundingClientRect();
 if(!rect.width||!rect.height)return null;
 pointer.x=((clientX-rect.left)/rect.width)*2-1;
 pointer.y=-((clientY-rect.top)/rect.height)*2+1;
 raycaster.setFromCamera(pointer,camera);
 const intersections=raycaster.intersectObjects([floor,...group.children],true);
 for(const hit of intersections){
  if(hit.object.userData?.selectionOutline)continue;
  if(waterMesh&&hit.object===waterMesh)
   return {kind:'water',x:Math.floor(hit.point.x),z:Math.floor(hit.point.z),depth:hit.point.clone().project(camera).z};
  const key=raycastKeys.resolve([hit]),block=key?blockByKey.get(key):null;
  if(key&&block&&hit.face){
   const normal=hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
   const values=[normal.x,normal.y,normal.z],axis=values.map(Math.abs).indexOf(Math.max(...values));
   const step=[0,0,0];step[axis]=values[axis]>=0?1:-1;
   return {kind:'block',key,block,step,depth:hit.point.clone().project(camera).z};
  }
  if(hit.object===floor)
   return {kind:'ground',x:Math.floor(hit.point.x),z:Math.floor(hit.point.z),depth:hit.point.clone().project(camera).z};
 }
 return null;
}
function tapWorldAt(clientX,clientY,target){
 if(target?.kind==='animal'){
  lastPlacement=null;openAnimalCare(target.actor);return;
 }
 if(target?.kind==='neighbor'){
  lastPlacement=null;openNeighborColoring(target.actor.name);return;
 }
 if(!target){
  const animal=animalAtScreen(clientX,clientY);
  if(animal){lastPlacement=null;openAnimalCare(animal);return;}
  const neighbor=neighborAtScreen(clientX,clientY);
  if(neighbor){lastPlacement=null;openNeighborColoring(neighbor.name);return;}
 }
 if(animalPlacementSpecies&&placeAnimalAtScreen(clientX,clientY))return;
 const hit=target||worldTargetAtScreen(clientX,clientY);
 if(!hit){status.textContent='Tap a place in the world to build.';return;}
 try{
  const type=document.getElementById('block-type').value;
  if(hit.kind==='block'){
   const block=blockByKey.get(hit.key);
   if(!block)return;
   if(block.type==='door'){renderSandbox(sandbox.toggleDoor(block.key));status.textContent='Door opened or closed.';return;}
   if(type==='water'){status.textContent='Choose a dug pool cell to add water.';return;}
   const nextX=block.x+hit.step[0],nextY=block.y+hit.step[1],nextZ=block.z+hit.step[2];
   renderSandbox(sandbox.addBlock(buildInputAt(nextX,nextY,nextZ)));
   status.textContent=(type==='door'?'Door built.':type.replace(/_/g,' ')+' placed.');
   return;
  }
  if(hit.kind==='water'){
   if(type!=='water'){status.textContent='Select Water to add another layer, or press and hold to collect it.';return;}
   renderSandbox(sandbox.addWaterLayer(hit.x,hit.z,currentProtectionContext()));
   status.textContent='Water layer added.';
   return;
  }
  if(hit.kind==='ground'){
   const depth=sandbox.groundDepthAt(hit.x,hit.z);
   if(type==='water'){
    if(depth<1)throw new Error('Dig a pool cell first, then add water.');
    renderSandbox(sandbox.addWaterLayer(hit.x,hit.z,currentProtectionContext()));
    status.textContent='Water layer added.';
    return;
   }
   const input=buildInputAt(hit.x,depth>0?-depth:0,hit.z);
   if(depth>0){
    renderSandbox(sandbox.fillExcavation(hit.x,hit.z,input));
    status.textContent='Hole filled with '+type.replace(/_/g,' ')+'.';
   }else{
    renderSandbox(sandbox.addBlock(input));
    status.textContent=(type==='door'?'Door built.':type.replace(/_/g,' ')+' placed.');
   }
  }
 }catch(error){status.textContent=error.message;}
}
function digWorldTarget(target){
 if(!target){showWorldFeedback('Aim at the ground or a block, then hold for 0.6 seconds to dig.');return;}
 try{
  if(target.kind==='block'){
   const block=blockByKey.get(target.key);
   if(!block)return;
   renderSandbox(sandbox.remove(target.key,currentProtectionContext()));
   showWorldFeedback((block.type==='door'?'Door':block.type.replace(/_/g,' '))+' removed · Recovered in your Material Bucket.');
   return;
  }
  if(target.kind==='water'){
   renderSandbox(sandbox.collectWaterLayer(target.x,target.z,currentProtectionContext()));
   showWorldFeedback('Water layer collected.');
   return;
  }
  if(target.kind==='ground'){
   renderSandbox(sandbox.excavateGround(target.x,target.z,currentProtectionContext()));
   showWorldFeedback('Ground excavated · Dirt recovered in your Material Bucket.');
  }
 }catch(error){status.textContent=error.message;}
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
const INVENTORY_META={
 seed:{name:'Seeds',icon:'🌱'},apple:{name:'Apple',icon:'🍎'},bread:{name:'Bread',icon:'🍞'},milk:{name:'Milk',icon:'🥛'},
 wood:{name:'Wood pieces',icon:'🪵'},stone:{name:'Stone',icon:'🪨'},grass:{name:'Grass',icon:'🟩'},dirt:{name:'Dirt',icon:'🟫'},
 leaves:{name:'Leaves',icon:'🌳'},brick:{name:'Brick',icon:'🧱'},glass:{name:'Glass',icon:'🔹'},flower:{name:'Flower',icon:'🌸'},
 tall_grass:{name:'Tall Grass',icon:'🌿'},sand:{name:'Sand',icon:'🟨'},snow:{name:'Snow',icon:'❄️'},tile:{name:'Decorative tile',icon:'🧩'},
 custom:{name:'Custom block pieces',icon:'🎨'},paintbrush:{name:'Paintbrush',icon:'🖌️'},wateringcan:{name:'Watering can',icon:'🚿'},
 flowerpot:{name:'Flower pot',icon:'🪴'},bench:{name:'Garden bench',icon:'🪑'},picture:{name:'Picture frame',icon:'🖼️'},picnic:{name:'Picnic basket',icon:'🧺'}
};
const BUCKET_META={water:{name:'Water',icon:'💧'},door:{name:'Door',icon:'🚪'},tile:{name:'Slab / Tile',icon:'▦'},custom:{name:'Custom solid',icon:'🎨'}};
let inventoryTab='materials';
const inventoryPanel=document.getElementById('inventory-panel');
function openInventory(tab='materials'){inventoryTab=['materials','crafted','bucket','recipes'].includes(tab)?tab:'materials';renderInventoryPanel();inventoryPanel.hidden=false;}
function closeInventory(){inventoryPanel.hidden=true;}
function appendInventorySlot(root,item,index,isBucket){
 const slot=isBucket?document.createElement('button'):document.createElement('div');
 slot.className='inventory-slot'+(item?' item':'')+(isBucket?' bucket':'');
 if(isBucket){slot.type='button';slot.title='Select this recovered item';}
 if(item){
  const meta=isBucket?(BUCKET_META[item.type]||INVENTORY_META[item.type]||{name:item.type,icon:'📦'}):(INVENTORY_META[item.id]||{name:item.id,icon:'📦'});
  const icon=document.createElement('span');icon.className='inventory-icon';icon.textContent=meta.icon;
  const name=document.createElement('small');name.textContent=item.label||meta.name;
  const count=document.createElement('small');count.className='inventory-count';count.textContent=isBucket?(item.color?item.color.toUpperCase():'Recovered'):'×'+(item.count||1);
  slot.append(icon,name,count);
  if(isBucket)slot.addEventListener('click',()=>{
   try{
    const next=sandbox.selectBucketItem(index),selectedItem=next.selectedBucketItem;
    const blockType=document.getElementById('block-type');
    if(Array.from(blockType.options).some(option=>option.value===selectedItem.type))blockType.value=selectedItem.type;
    renderSandbox(next);closeInventory();
    status.textContent=meta.name+' selected from your Material Bucket. It stays available for reuse.';
   }catch(error){document.getElementById('inventory-feedback').textContent=error.message;}
  });
 }else{const blank=document.createElement('small');blank.textContent=String(index+1);slot.append(blank);}
 root.append(slot);
}
function renderInventoryPanel(){
 const state=sandbox.getState(),slotsRoot=document.getElementById('inventory-slots'),recipesRoot=document.getElementById('inventory-recipes');
 document.querySelectorAll('[data-inventory-tab]').forEach(button=>button.classList.toggle('active',button.dataset.inventoryTab===inventoryTab));
 slotsRoot.replaceChildren();recipesRoot.replaceChildren();
 const isRecipes=inventoryTab==='recipes';slotsRoot.hidden=isRecipes;recipesRoot.hidden=!isRecipes;
 const bucket=Array.isArray(state.world.bucket)?state.world.bucket:[];
 const resources=(state.world.materials||[]).slice(0,60),crafted=(state.world.crafted||[]).slice(0,60);
 if(inventoryTab==='materials'||inventoryTab==='crafted'){
  const arr=inventoryTab==='materials'?resources:crafted,occupied=arr.filter(Boolean).length,total=arr.reduce((sum,item)=>sum+(item?.count||0),0);
  document.getElementById('inventory-summary').textContent=(inventoryTab==='materials'?'Resources':'Crafted items')+' · '+occupied+' occupied slots · '+total+' items in this pouch';
  for(let index=0;index<60;index++)appendInventorySlot(slotsRoot,arr[index],index,false);
 }else if(inventoryTab==='bucket'){
  document.getElementById('inventory-summary').textContent='Material Bucket · '+bucket.length+' / 120 recovered items. Choose an item to reuse it; it stays in the bucket.';
  for(let index=0;index<bucket.length;index++)appendInventorySlot(slotsRoot,bucket[index],index,true);
  if(!bucket.length){const empty=document.createElement('p');empty.className='inventory-help';empty.textContent='Your Material Bucket is empty. Remove a block or dig soil to recover it here.';slotsRoot.append(empty);}
 }else{
  document.getElementById('inventory-summary').textContent='Craft peaceful garden items with resources from your Materials pouch.';
  editing.recipes.forEach(recipe=>{
   const card=document.createElement('article');card.className='inventory-recipe';
   const title=document.createElement('strong');title.textContent=recipe.icon+' '+recipe.name;
   const description=document.createElement('p');description.textContent=recipe.desc+' Materials: '+Object.entries(recipe.cost).map(([id,count])=>(INVENTORY_META[id]?.name||id)+' ×'+count).join(', ');
   const button=document.createElement('button');button.type='button';button.textContent='Craft '+recipe.name;button.addEventListener('click',()=>{
    try{
     const next=sandbox.craftRecipe(recipe.id);renderSandbox(next);renderInventoryPanel();
     document.getElementById('inventory-feedback').textContent=recipe.name+' crafted.';
    }catch(error){document.getElementById('inventory-feedback').textContent=error.message;}
   });
   card.append(title,description,button);recipesRoot.append(card);
  });
 }
}

document.getElementById('add').addEventListener('click',()=>{try{addBeside();}catch(e){status.textContent=e.message;}});
document.getElementById('animal-place').addEventListener('click',()=>{
 const requested=document.getElementById('animal-species').value;
 animalPlacementSpecies=animalPlacementSpecies?'':requested;
 const button=document.getElementById('animal-place');
 button.classList.toggle('primary',!!animalPlacementSpecies);
 button.textContent=animalPlacementSpecies?'Tap the ground to place · Cancel':'Place an animal';
 status.textContent=animalPlacementSpecies?'Tap an open patch of ground to welcome a '+animalPlacementSpecies+'.':'Animal placement cancelled.';
});
document.getElementById('time-mode').addEventListener('change',event=>{
 try{
  const next=sandbox.setTimeMode(event.target.value);
  requestedTimeMode=next.world.timeMode;
  applyWorldTime(performance.now()/1000);
  updateNeighborModels(performance.now());
  status.textContent=requestedTimeMode==='auto'?'Automatic day and night cycle enabled.':requestedTimeMode.charAt(0).toUpperCase()+requestedTimeMode.slice(1)+' selected.';
 }catch(error){
  event.target.value=requestedTimeMode;
  status.textContent=error.message;
 }
});

document.getElementById('inventory-open').addEventListener('click',()=>openInventory());
document.getElementById('inventory-close').addEventListener('click',closeInventory);
document.querySelectorAll('[data-inventory-tab]').forEach(button=>button.addEventListener('click',()=>{
 inventoryTab=button.dataset.inventoryTab;document.getElementById('inventory-feedback').textContent='';renderInventoryPanel();
}));
inventoryPanel.addEventListener('pointerdown',event=>{if(event.target===inventoryPanel)closeInventory();});
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!inventoryPanel.hidden)closeInventory();});

const characterPanel=document.getElementById('character-studio');
const CHARACTER_PRESETS={
 explorer:{hairStyle:'short',outfitStyle:'hoodie',accessory:'none',hair:'#493127',skin:'#efc39d',shirt:'#d94b3d',pants:'#397d8f',shoes:'#bd4540',eyes:'#302820',accessoryColor:'#f4a8bb'},
 sunshine:{hairStyle:'pigtails',outfitStyle:'overalls',accessory:'glasses',hair:'#efbd43',skin:'#f2cda9',shirt:'#48a78b',pants:'#219da5',shoes:'#e6b64d',eyes:'#302820',accessoryColor:'#ec83ba'},
 artist:{hairStyle:'bob',outfitStyle:'sweater',accessory:'flower',hair:'#754c3c',skin:'#e8b995',shirt:'#9b79b7',pants:'#48617a',shoes:'#6b527c',eyes:'#302820',accessoryColor:'#ef82a4'},
 garden:{hairStyle:'long',outfitStyle:'dress',accessory:'bow',hair:'#5a3827',skin:'#f0c7a3',shirt:'#e98eae',pants:'#68a96d',shoes:'#d45b80',eyes:'#302820',accessoryColor:'#f4c6dc'}
};
const CHARACTER_INPUTS={
 hairStyle:'character-hair-style',outfitStyle:'character-outfit-style',accessory:'character-accessory',
 accessoryColor:'character-accessory-color',hair:'character-hair-color',skin:'character-skin-color',
 shirt:'character-shirt-color',pants:'character-pants-color',shoes:'character-shoes-color',eyes:'character-eyes-color'
};
function characterFormValues(){
 return Object.fromEntries(Object.entries(CHARACTER_INPUTS).map(([field,id])=>[field,document.getElementById(id).value]));
}
function setCharacterFormValues(player){
 for(const [field,id] of Object.entries(CHARACTER_INPUTS)){
  const defaults=CHARACTER_PRESETS.explorer;
  const fallback=defaults[field]||'#302820';
  document.getElementById(id).value=player[field]||fallback;
 }
 document.querySelectorAll('[data-character-look]').forEach(button=>button.classList.remove('active'));
 updateCharacterPreview();
}
function updateCharacterPreview(){
 const p=characterFormValues(),canvas=document.getElementById('character-preview'),ctx=canvas.getContext('2d');
 const w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);
 const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#d4e9ed');bg.addColorStop(1,'#eff2d8');
 ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle='#94bd78';ctx.fillRect(0,232,w,52);ctx.fillStyle='#6e9d57';ctx.fillRect(0,232,w,5);
 ctx.fillStyle=p.shoes;ctx.fillRect(81,244,42,18);ctx.fillRect(136,244,42,18);
 ctx.fillStyle=p.pants;ctx.fillRect(86,190,32,58);ctx.fillRect(141,190,32,58);
 ctx.fillStyle=p.shirt;ctx.fillRect(67,111,122,83);ctx.fillRect(45,120,26,70);ctx.fillRect(185,120,26,70);
 ctx.fillStyle=p.skin;ctx.fillRect(45,184,26,20);ctx.fillRect(185,184,26,20);
 if(p.outfitStyle==='dress'){
  ctx.fillStyle=p.shirt;ctx.beginPath();ctx.moveTo(67,168);ctx.lineTo(189,168);ctx.lineTo(205,221);ctx.lineTo(51,221);ctx.closePath();ctx.fill();
 }else if(p.outfitStyle==='overalls'){
  ctx.fillStyle=p.pants;ctx.fillRect(93,126,70,75);ctx.fillRect(91,110,16,59);ctx.fillRect(149,110,16,59);
  ctx.fillStyle='#f0dda7';ctx.fillRect(121,151,14,12);
 }else if(p.outfitStyle==='hoodie'){ctx.fillStyle='#00000018';ctx.fillRect(112,169,32,8);}
 ctx.fillStyle=p.skin;ctx.fillRect(111,91,34,24);ctx.fillRect(87,35,82,68);
 ctx.fillStyle=p.hair;ctx.fillRect(82,27,92,24);
 if(p.hairStyle==='bob'){ctx.fillRect(78,44,18,63);ctx.fillRect(160,44,18,63);}
 if(p.hairStyle==='long'){ctx.fillRect(77,42,20,125);ctx.fillRect(160,42,20,125);}
 if(p.hairStyle==='ponytail'){ctx.fillRect(159,35,29,56);ctx.fillRect(171,72,18,65);}
 if(p.hairStyle==='pigtails'){ctx.fillRect(70,48,23,56);ctx.fillRect(158,48,23,56);ctx.fillRect(68,88,24,30);ctx.fillRect(160,88,24,30);}
 if(p.hairStyle==='curly'){for(const [x,y] of [[82,24],[105,14],[130,14],[151,24],[72,43],[166,43]])ctx.fillRect(x,y,27,28);}
 if(p.hairStyle==='buns'){ctx.fillRect(65,18,35,34);ctx.fillRect(157,18,35,34);}
 ctx.fillStyle=p.hair;ctx.fillRect(83,46,34,15);ctx.fillRect(118,35,54,15);
 ctx.fillStyle=p.eyes;ctx.fillRect(105,71,8,7);ctx.fillRect(145,71,8,7);ctx.fillStyle='#9b6959';ctx.fillRect(124,83,13,4);
 if(p.accessory==='bow'){ctx.fillStyle=p.accessoryColor;ctx.fillRect(69,30,19,13);ctx.fillRect(90,30,19,13);ctx.fillRect(85,32,9,10);}
 if(p.accessory==='flower'){ctx.fillStyle=p.accessoryColor;ctx.fillRect(75,31,19,19);ctx.fillStyle='#f6d36b';ctx.fillRect(81,37,8,8);}
 if(p.accessory==='glasses'){ctx.strokeStyle=p.accessoryColor;ctx.lineWidth=5;ctx.strokeRect(96,65,27,20);ctx.strokeRect(137,65,27,20);ctx.beginPath();ctx.moveTo(123,74);ctx.lineTo(137,74);ctx.stroke();}
 if(p.accessory==='cap'){ctx.fillStyle=p.accessoryColor;ctx.fillRect(78,15,100,18);ctx.fillRect(78,30,115,9);}
 document.getElementById('character-preview-description').textContent=p.hairStyle+' hair · '+p.outfitStyle+' · '+p.accessory;
}
function openCharacterStudio(){
 const player=sandbox.getState().world.player||{};
 setCharacterFormValues(player);
 characterPanel.hidden=false;
}
function closeCharacterStudio(){characterPanel.hidden=true;}
function applyCharacterStudio(){
 const appearance=characterFormValues();
 try{
  const next=sandbox.setPlayerAppearance(appearance);
  playerPhysicsState={...playerPhysicsState,player:{...playerPhysicsState.player,...appearance}};
  if(playerModelRoot)playerModelFactory.dispose(playerModelRoot);
  playerModelRoot=playerModelFactory.create(THREE,materials,playerPhysicsState.player,performanceProfile.shadows);
  scene.add(playerModelRoot);
  updatePlayerModel();
  if(playerPlayMode)updatePlayerCamera();
  renderSandbox(next);
  updatePlayerDiagnostics();
  closeCharacterStudio();
  status.textContent='Character updated in this experimental world copy.';
 }catch(error){
  document.getElementById('character-feedback').textContent=error.message;
 }
}
document.getElementById('character-open').addEventListener('click',openCharacterStudio);
document.getElementById('character-close').addEventListener('click',closeCharacterStudio);
document.getElementById('character-apply').addEventListener('click',applyCharacterStudio);
characterPanel.addEventListener('pointerdown',event=>{if(event.target===characterPanel)closeCharacterStudio();});
document.querySelectorAll('[data-character-look]').forEach(button=>button.addEventListener('click',()=>{
 const preset=CHARACTER_PRESETS[button.dataset.characterLook];if(!preset)return;
 setCharacterFormValues(preset);
 document.querySelectorAll('[data-character-look]').forEach(item=>item.classList.toggle('active',item===button));
}));
for(const id of Object.values(CHARACTER_INPUTS))document.getElementById(id).addEventListener('input',()=>{
 document.querySelectorAll('[data-character-look]').forEach(button=>button.classList.remove('active'));
 updateCharacterPreview();
});
document.getElementById('character-preview').setAttribute('width','256');
updateCharacterPreview();
document.getElementById('character-studio').addEventListener('keydown',event=>{if(event.key==='Escape')closeCharacterStudio();});

const artStudio=document.getElementById('art-studio'),galleryPanel=document.getElementById('gallery-panel');
const artCanvas=document.getElementById('art-canvas'),artContext=artCanvas.getContext('2d');
const galleryRoot=document.getElementById('gallery-artworks');
let artDrawing=false,artLastPoint=null;
function clearArtCanvas(){
 artContext.fillStyle='#fffdf8';artContext.fillRect(0,0,artCanvas.width,artCanvas.height);
 artContext.strokeStyle='#eee8da';artContext.lineWidth=1;
 for(let x=24;x<artCanvas.width;x+=24){artContext.beginPath();artContext.moveTo(x,0);artContext.lineTo(x,artCanvas.height);artContext.stroke();}
 for(let y=24;y<artCanvas.height;y+=24){artContext.beginPath();artContext.moveTo(0,y);artContext.lineTo(artCanvas.width,y);artContext.stroke();}
}
function artPoint(event){
 const rect=artCanvas.getBoundingClientRect();
 return {x:(event.clientX-rect.left)*artCanvas.width/rect.width,y:(event.clientY-rect.top)*artCanvas.height/rect.height};
}
function renderGallery(){
 const artworks=sandbox.getState().world.artworks||[];
 galleryRoot.replaceChildren();
 document.getElementById('gallery-note').textContent=artworks.length+' / 20 saved pictures · Original PNG artwork';
 if(!artworks.length){
  const empty=document.createElement('div');empty.className='gallery-empty';empty.textContent='Your gallery is waiting for its first picture. Visit Art Studio and create something lovely.';
  galleryRoot.append(empty);return;
 }
 artworks.forEach((artwork,index)=>{
  const card=document.createElement('article');card.className='gallery-card';card.dataset.galleryIndex=String(index);
  const image=document.createElement('img');image.src=artwork.data;image.alt=artwork.name||'Saved artwork';image.loading='lazy';
  const title=document.createElement('strong');title.textContent=artwork.name||'Artwork';
  card.append(image,title);galleryRoot.append(card);
 });
}
function openArtStudio(){artStudio.hidden=false;document.getElementById('art-feedback').textContent='Draw with your mouse or finger. Save your PNG to the sandbox gallery.';}
function closeArtStudio(){artStudio.hidden=true;artDrawing=false;artLastPoint=null;}
function openGallery(){renderGallery();galleryPanel.hidden=false;}
function closeGallery(){galleryPanel.hidden=true;}
artCanvas.addEventListener('pointerdown',event=>{
 if(event.button!==0)return;
 artDrawing=true;artLastPoint=artPoint(event);
 try{artCanvas.setPointerCapture(event.pointerId);}catch(_){}
});
artCanvas.addEventListener('pointermove',event=>{
 if(!artDrawing||!artLastPoint)return;
 const next=artPoint(event);
 artContext.strokeStyle=document.getElementById('art-paint-color').value;
 artContext.lineWidth=Number(document.getElementById('art-brush-size').value);
 artContext.lineCap='round';artContext.lineJoin='round';
 artContext.beginPath();artContext.moveTo(artLastPoint.x,artLastPoint.y);artContext.lineTo(next.x,next.y);artContext.stroke();
 artLastPoint=next;
});
for(const eventName of ['pointerup','pointercancel','lostpointercapture']){
 artCanvas.addEventListener(eventName,()=>{artDrawing=false;artLastPoint=null;});
}
document.getElementById('art-clear').addEventListener('click',clearArtCanvas);
document.getElementById('art-save').addEventListener('click',()=>{
 try{
  const name=document.getElementById('art-name').value.slice(0,28)||'My picture';
  const data=artCanvas.toDataURL('image/png');
  const next=sandbox.saveArtwork(name,data);
  renderSandbox(next);
  closeArtStudio();clearArtCanvas();
  status.textContent='Artwork saved to your sandbox gallery and crafted pouch.';
 }catch(error){document.getElementById('art-feedback').textContent=error.message;}
});
document.getElementById('art-open').addEventListener('click',openArtStudio);
document.getElementById('art-close').addEventListener('click',closeArtStudio);
document.getElementById('art-view-gallery').addEventListener('click',()=>{closeArtStudio();openGallery();});
document.getElementById('gallery-open').addEventListener('click',openGallery);
document.getElementById('gallery-close').addEventListener('click',closeGallery);
artStudio.addEventListener('pointerdown',event=>{if(event.target===artStudio)closeArtStudio();});
galleryPanel.addEventListener('pointerdown',event=>{if(event.target===galleryPanel)closeGallery();});
document.getElementById('art-invite').addEventListener('click',()=>{
 const actor=sandbox.characterStates(performance.now()/1000).find(item=>!item.sleeping);
 if(!actor){document.getElementById('art-feedback').textContent='A neighbor will join when one is nearby.';return;}
 closeArtStudio();openNeighborColoring(actor.name);
});
clearArtCanvas();



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
  closeNeighborColoring();status.textContent='Your shared coloring picture has been saved in your world gallery and crafted pouch.';
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
 playerPlayMode=false;touchControls.hidden=true;touchActions.hidden=true;target.set(actor.x,.55,actor.z);orbit.radius=14;orbit.theta=.5;orbit.phi=.88;cameraUpdate();updateAnimalInstances(performance.now());return true;
}
function neighborScreenPoint(id){
 const actor=sandbox?.characterStates(performance.now()/1000).find(item=>item.id===id);
 if(!actor||actor.sleeping)return null;
 const point=projectNeighborPick(actor);
 return point?{...point,visible:point.x>=0&&point.x<=innerWidth&&point.y>=0&&point.y<=innerHeight}:null;
}
canvas.addEventListener('contextmenu',event=>event.preventDefault());
let pointerGesture=null;
const HOLD_TO_DIG_MS=600,TOUCH_DRAG_THRESHOLD=18,MOUSE_DRAG_THRESHOLD=5;
function clearPointerHold(gesture){
 if(gesture&&gesture.holdTimer!==null){clearTimeout(gesture.holdTimer);gesture.holdTimer=null;}
}
function endPointerGesture(){
 if(pointerGesture)clearPointerHold(pointerGesture);
 pointerGesture=null;
}
canvas.addEventListener('pointerdown',event=>{
 if(event.pointerType==='mouse'&&event.button===2){
  event.preventDefault();digWorldTarget(worldTargetAtScreen(event.clientX,event.clientY));return;
 }
 if(event.pointerType==='mouse'&&event.button!==0)return;
 event.preventDefault();
 const gesture={id:event.pointerId,pointerType:event.pointerType,startedAt:performance.now(),startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false,holdTriggered:false,target:null,holdTimer:null};
 // World gestures stay available after a movement arrow enters Play Mode.
 // Only a drag is reserved for camera look; a tap builds/interacts and a hold digs.
 const worldHit=worldTargetAtScreen(event.clientX,event.clientY);
 const animal=animalAtScreen(event.clientX,event.clientY);
 const neighbor=animal?null:neighborAtScreen(event.clientX,event.clientY);
 const actor=animal?{kind:'animal',actor:animal}:neighbor?{kind:'neighbor',actor:neighbor}:null;
 const poolWorksite=worldHit?.kind==='ground'&&worldHit.x===14&&worldHit.z>=-8&&worldHit.z<=-3;
 if(poolWorksite)gesture.target=worldHit;
 else if(actor&&worldHit&&Number.isFinite(worldHit.depth)){
  // Generous actor hit areas must not steal a foreground ground, water, or block tap.
  const point=actor.kind==='animal'
   ?new THREE.Vector3(animal.x,animal.species==='giraffe'?.8:.48,animal.z)
   :new THREE.Vector3(neighbor.x+Math.sin(neighbor.facing||0)*.38,1.18,neighbor.z+Math.cos(neighbor.facing||0)*.38);
  const actorDepth=point.project(camera).z;
  gesture.target=actorDepth<worldHit.depth-.003?actor:worldHit;
 }else gesture.target=actor||worldHit;
 if(gesture.target&&['block','ground','water'].includes(gesture.target.kind)){
  gesture.holdTimer=setTimeout(()=>{
   if(pointerGesture!==gesture||gesture.moved||gesture.holdTriggered)return;
   gesture.holdTriggered=true;clearPointerHold(gesture);digWorldTarget(gesture.target);
  },HOLD_TO_DIG_MS);
 }
 pointerGesture=gesture;
 try{canvas.setPointerCapture(event.pointerId);}catch(_){}
});
canvas.addEventListener('pointermove',event=>{
 const gesture=pointerGesture;if(!gesture||gesture.id!==event.pointerId)return;
 const dx=event.clientX-gesture.lastX,dy=event.clientY-gesture.lastY;
 const dragThreshold=gesture.pointerType==='touch'?TOUCH_DRAG_THRESHOLD:MOUSE_DRAG_THRESHOLD;
 if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>dragThreshold){
  if(!gesture.moved){gesture.moved=true;clearPointerHold(gesture);}
 }
 gesture.lastX=event.clientX;gesture.lastY=event.clientY;
 if(!gesture.moved)return;
 if(playerPlayMode&&playerPhysicsState){
  playerPhysicsState.player.yaw-=dx*.0055;
  if(playerCameraMode==='first')playerPhysicsState.player.pitch=Math.max(-1.25,Math.min(1.25,playerPhysicsState.player.pitch+dy*.004));
  updatePlayerCamera();
 }else{orbit.theta-=dx*.005;orbit.phi+=dy*.004;cameraUpdate();}
});
canvas.addEventListener('pointerup',event=>{
 const gesture=pointerGesture;if(!gesture||gesture.id!==event.pointerId)return;
 const dragThreshold=gesture.pointerType==='touch'?TOUCH_DRAG_THRESHOLD:MOUSE_DRAG_THRESHOLD;
 if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>dragThreshold){
  if(!gesture.moved){gesture.moved=true;clearPointerHold(gesture);}
 }
 clearPointerHold(gesture);
 if(!gesture.moved&&!gesture.holdTriggered){
  const heldFor=performance.now()-gesture.startedAt;
  if(heldFor>=HOLD_TO_DIG_MS)digWorldTarget(gesture.target);
  else tapWorldAt(event.clientX,event.clientY,gesture.target);
 }
 endPointerGesture();
});
for(const eventName of ['pointercancel','lostpointercapture'])canvas.addEventListener(eventName,()=>{
 if(pointerGesture)endPointerGesture();
});
canvas.addEventListener('wheel',event=>{event.preventDefault();if(playerPlayMode)return;orbit.radius=Math.max(14,Math.min(60,orbit.radius+event.deltaY*.02));cameraUpdate();},{passive:false});

let frame=0;
function applyPlayerActivity(){
 const activity=document.getElementById('activity-mode').value;
 if(!playerPhysicsState||!sandbox)return;
 try{
  let player={...playerPhysicsState.player};
  if(activity==='stop'){
   playerPhysicsState={...playerPhysicsState,playerActivity:''};
   if(playerModelRoot){playerModelRoot.scale.set(playerModelFactory.proportions.widthScale,1,1);playerModelRoot.rotation.x=0;playerModelRoot.rotation.z=0;}
   status.textContent='Standing up. Ready to explore!';
  }else{
   if(activity==='sleep'||activity==='transformer'){
    player.y=sandbox.surfaceHeightAt(player.x,player.z,player.y);
    playerPhysicsState={...playerPhysicsState,player,playerGrounded:true,jumpVelocity:0,flying:false,playerActivity:activity};
   }else playerPhysicsState={...playerPhysicsState,playerActivity:activity};
   status.textContent=activity==='sleep'?'Resting here. Sweet dreams!':
    activity==='transformer'?'Transformer sleep selected.':
    activity.charAt(0).toUpperCase()+activity.slice(1)+' activity selected.';
  }
  clearPlayerInputs();setPlayerPlayMode(false);
  const next=sandbox.setPlayerPose({x:playerPhysicsState.player.x,y:playerPhysicsState.player.y,z:playerPhysicsState.player.z,yaw:playerPhysicsState.player.yaw,pitch:playerPhysicsState.player.pitch});
  renderSandbox(next);lastPosePersisted={...playerPhysicsState.player};cameraUpdate();updatePlayerModel();
 }catch(error){status.textContent='Activity could not be applied: '+error.message;}
}
function setHomeBed(){
 if(!sandbox||!playerPhysicsState)return;
 try{
  const player=playerPhysicsState.player,floor=sandbox.surfaceHeightAt(player.x,player.z,player.y);
  const bed={x:Math.round(player.x*100)/100,y:floor,z:Math.round(player.z*100)/100,yaw:player.yaw||0};
  const next=sandbox.setPlayerPose({bed});
  playerPhysicsState={...playerPhysicsState,player:{...player,bed},playerActivity:''};
  renderSandbox(next);status.textContent='Your home bed is saved. Use Go home & sleep anytime.';
 }catch(error){status.textContent='Home bed was not set: '+error.message;}
}
function goHomeAndSleep(){
 if(!sandbox||!playerPhysicsState)return;
 const bed=playerPhysicsState.player.bed;
 if(!bed){status.textContent='No home bed saved yet. Set your home bed first.';return;}
 try{
  const player={...playerPhysicsState.player,x:bed.x,y:bed.y,z:bed.z,yaw:bed.yaw||0};
  playerPhysicsState={...playerPhysicsState,player,playerGrounded:true,jumpVelocity:0,flying:false,playerActivity:'bed'};
  const next=sandbox.setPlayerPose({x:player.x,y:player.y,z:player.z,yaw:player.yaw,pitch:player.pitch,bed});
  renderSandbox(next);setPlayerPlayMode(false);cameraUpdate();status.textContent='Back home in bed. Sweet dreams!';
  lastPosePersisted={...player};lastPosePersistAt=performance.now();
 }catch(error){status.textContent='Could not return home: '+error.message;}
}
document.getElementById('fullscreen-toggle').addEventListener('click',async()=>{
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
  else status.textContent='Full screen is not available in this browser.';
 }catch(error){status.textContent='Full screen could not be enabled: '+String(error.message||error).slice(0,120);}
});
document.addEventListener('fullscreenchange',()=>{
 const button=document.getElementById('fullscreen-toggle');
 if(button)button.textContent=document.fullscreenElement?'Exit full screen':'Full screen';
});
document.getElementById('activity-apply').addEventListener('click',applyPlayerActivity);
document.getElementById('set-home-bed').addEventListener('click',setHomeBed);
document.getElementById('go-home').addEventListener('click',goHomeAndSleep);
function animatePlayerActivity(now){
 if(!playerModelRoot||!playerPhysicsState)return;
 const activity=playerPhysicsState.playerActivity;
 playerModelRoot.position.y=playerPhysicsState.player.y+(activity==='sit'?-.08:0);
 playerModelRoot.scale.set(playerModelFactory.proportions.widthScale,1,1);playerModelRoot.rotation.x=0;playerModelRoot.rotation.z=0;
 if(activity==='sit')playerModelRoot.scale.y=.82;
 else if(activity==='work')playerModelRoot.rotation.z=-.055;
 else if(activity==='dance')playerModelRoot.rotation.z=Math.sin(now*.0042)*.13;
 else if(activity==='sleep'||activity==='bed'){playerModelRoot.scale.y=.72;playerModelRoot.rotation.x=1.34;}
 else if(activity==='transformer')playerModelRoot.scale.set(playerModelFactory.proportions.widthScale*1.04,1.04,1.04);
}
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
  syncPlayerPoseToWorld(now,false);
 }else lastPlayerPhysicsTime=now;
 applyWorldTime(now*.001);skyDome.position.copy(camera.position);celestialGroup.position.copy(camera.position);
 updateDoorAnimations(now);updateWaterAndFish(now);updateAnimalInstances(now);updateAnimalCareFlash(now);updateNeighborModels(now);animatePlayerActivity(now);
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
const MAX_BACKUP_BYTES=storage.MAX_BACKUP_BYTES;
const worldNameInput=document.getElementById('world-name');
const backupFeedback=document.getElementById('backup-feedback');
const deviceFileFeedback=document.getElementById('device-file-feedback'),deviceFileConnect=document.getElementById('device-file-connect'),deviceFileOpen=document.getElementById('device-file-open'),deviceFileDownload=document.getElementById('device-file-download'),deviceFileFallback=document.getElementById('device-file-fallback');
function getStorageKeyCount(){try{return deviceStorage?deviceStorage.length:0;}catch(error){return -1;}}

function syncDeviceFileControls(message=''){
 if(deviceFileConnect)deviceFileConnect.textContent=deviceWorldFileState==='permission-required'?'Reconnect world file':
  (deviceWorldFileState==='connected'?'Change device file':'Choose device file');
 if(deviceFileFeedback){
  if(message)deviceFileFeedback.textContent=message;
  else if(deviceWorldFileState==='connected')deviceFileFeedback.textContent='Linked: '+primaryWorldFileName+'. World changes are compressed and saved to this file automatically.';
  else if(deviceWorldFileState==='permission-required')deviceFileFeedback.textContent='Your file is remembered. Reconnect it and grant access to reopen the latest world.';
  else if(deviceWorldFileState==='invalid')deviceFileFeedback.textContent='The remembered .diycraft file could not be read. It has not been overwritten.';
  else if(deviceWorldFileState==='error')deviceFileFeedback.textContent='The device file could not be updated. Choose or reconnect a file. Browser recovery remains available.';
  else deviceFileFeedback.textContent='Choose a device file to create MyWorld.diycraft. Browser recovery remains enabled.';
 }
}
function queueDeviceFileSave(world,immediate=false){
 if(!primaryWorldFileHandle||deviceWorldFileState!=='connected'||!world||typeof world!=='object')return false;
 pendingDeviceFileWorld=world;
 if(immediate){
  if(deviceFileSaveTimer){clearTimeout(deviceFileSaveTimer);deviceFileSaveTimer=0;}
  void drainDeviceFileSave(true);
 }else if(!deviceFileSaveTimer){
  deviceFileSaveTimer=setTimeout(()=>{deviceFileSaveTimer=0;void drainDeviceFileSave(false);},1500);
 }
 return true;
}
async function drainDeviceFileSave(immediate=false){
 if(!primaryWorldFileHandle||deviceWorldFileState!=='connected')return false;
 if(deviceFileSaveTimer){clearTimeout(deviceFileSaveTimer);deviceFileSaveTimer=0;}
 if(deviceFileDrainPromise){
  if(immediate)deviceFileFlushRequested=true;
  const active=deviceFileDrainPromise,result=await active;
  if(pendingDeviceFileWorld&&primaryWorldFileHandle&&deviceWorldFileState==='connected')
   return drainDeviceFileSave(immediate||deviceFileFlushRequested);
  return result;
 }
 const handleForRun=primaryWorldFileHandle;
 deviceFileWriteBusy=true;let succeeded=true;
 const run=(async()=>{
  while(pendingDeviceFileWorld&&primaryWorldFileHandle===handleForRun&&deviceWorldFileState==='connected'){
   const snapshot=pendingDeviceFileWorld;pendingDeviceFileWorld=null;
   try{
    const result=await deviceFiles.writeHandle(handleForRun,adapter.toSavedWorld(snapshot));
    primaryWorldFileName=result.fileName||primaryWorldFileName;
    syncDeviceFileControls('Saved '+primaryWorldFileName+' · '+result.format+' · '+result.bytes.toLocaleString()+' bytes.');
   }catch(error){
    succeeded=false;const reason=String(error.message||error).slice(0,220);
    deviceWorldFileState=/permission|grant access|reconnect/i.test(reason)?'permission-required':'error';
    pendingDeviceFileWorld=null;syncDeviceFileControls('Device-file save paused: '+reason);
    break;
   }
  }
  return succeeded;
 })();
 deviceFileDrainPromise=run;
 try{return await run;}
 finally{
  if(deviceFileDrainPromise===run)deviceFileDrainPromise=null;
  deviceFileWriteBusy=false;
  const flushAgain=deviceFileFlushRequested;deviceFileFlushRequested=false;
  if(pendingDeviceFileWorld&&primaryWorldFileHandle&&deviceWorldFileState==='connected'){
   if(flushAgain)void drainDeviceFileSave(true);
   else if(!deviceFileSaveTimer)deviceFileSaveTimer=setTimeout(()=>{deviceFileSaveTimer=0;void drainDeviceFileSave(false);},1500);
  }
 }
}
async function importDeviceWorldText(worldText,fileName){
 if(typeof worldText!=='string'||!worldText)throw new Error('The selected world file is empty.');
 adapter.createSnapshot(JSON.parse(worldText));
 const imported=await restoreWorldBackup(new File([worldText],(fileName||'MyWorld')+'.json',{type:'application/json'}));
 if(!imported)throw new Error('The selected world could not be restored. Your current world remains unchanged.');
 return true;
}
async function connectDeviceWorldFile(){
 deviceFileConnect.disabled=true;
 try{
  if(primaryWorldFileHandle&&deviceWorldFileState==='permission-required'){
   if(!await deviceFiles.permission(primaryWorldFileHandle,'readwrite',true))
    throw new Error('File permission was not granted. The existing file was left unchanged.');
   const text=await deviceFiles.readHandle(primaryWorldFileHandle);
   if(text)await importDeviceWorldText(text,primaryWorldFileName.replace(/\.diycraft$/i,''));
   else await deviceFiles.writeHandle(primaryWorldFileHandle,adapter.toSavedWorld(sandbox.getState().world));
   deviceWorldFileState='connected';await deviceFiles.rememberHandle(primaryWorldFileHandle);
   syncDeviceFileControls(text?'Reconnected '+primaryWorldFileName+' and reopened its latest world.':'Reconnected '+primaryWorldFileName+'.');return;
  }
  // The picker is called directly from this button's user gesture.
  const handle=await deviceFiles.chooseSaveHandle();
  if(!await deviceFiles.permission(handle,'readwrite',false)&&!await deviceFiles.permission(handle,'readwrite',true))
   throw new Error('File permission was not granted. No file was changed.');
  const text=await deviceFiles.readHandle(handle);
  if(text)await importDeviceWorldText(text,handle.name.replace(/\.diycraft$/i,''));
  else await deviceFiles.writeHandle(handle,adapter.toSavedWorld(sandbox.getState().world));
  primaryWorldFileHandle=handle;primaryWorldFileName=handle.name;deviceWorldFileState='connected';
  await deviceFiles.rememberHandle(handle);
  syncDeviceFileControls(text?'Opened and linked '+handle.name+'. Automatic saves are enabled.':'Created '+handle.name+'. Automatic saves are enabled.');
 }catch(error){
  if(error?.name==='AbortError')syncDeviceFileControls('File selection cancelled. Your current world was not changed.');
  else syncDeviceFileControls('Device file not linked: '+String(error.message||error).slice(0,220));
 }finally{deviceFileConnect.disabled=false;}
}
async function openDeviceWorldFile(){
 deviceFileOpen.disabled=true;
 try{
  if(typeof window.showOpenFilePicker==='function'){
   const handle=await deviceFiles.chooseOpenHandle(),text=await deviceFiles.readHandle(handle,'read');
   await importDeviceWorldText(text,handle.name.replace(/\.diycraft$/i,''));
   syncDeviceFileControls('Opened '+handle.name+'. Choose a device file to enable automatic updates.');
  }else deviceFileFallback.click();
 }catch(error){
  if(error?.name!=='AbortError')syncDeviceFileControls('World file not opened: '+String(error.message||error).slice(0,220));
 }finally{deviceFileOpen.disabled=false;}
}
async function downloadDeviceWorldFile(){
 deviceFileDownload.disabled=true;
 try{
  const named=sandbox.setWorldName(worldNameInput.value);worldNameInput.value=named.world.name;renderSandbox(named);
  const result=await deviceFiles.download(adapter.toSavedWorld(named.world),named.world.name);
  syncDeviceFileControls('Downloaded '+result.fileName+' · '+result.format+' · '+result.bytes.toLocaleString()+' bytes. Keep this file as your portable world.');
 }catch(error){syncDeviceFileControls('The .diycraft file was not created: '+String(error.message||error).slice(0,220));}
 finally{deviceFileDownload.disabled=false;}
}

function queueWorldSave(world,immediate=false){
 if(!world||typeof world!=='object')return false;
 // The selected file is independent of browser-managed recovery storage.
 queueDeviceFileSave(world,false);
 if(storageReadFailed)return false;
 pendingSaveWorld=world;saveGeneration++;
 if(saveTimer){clearTimeout(saveTimer);saveTimer=0;}
 if(immediate){void drainWorldSave();return true;}
 saveTimer=setTimeout(()=>{saveTimer=0;void drainWorldSave();},420);
 return true;
}
async function drainWorldSave(){
 if(saveInFlight||storageReadFailed)return false;
 if(saveTimer){clearTimeout(saveTimer);saveTimer=0;}
 saveInFlight=true;let allSaved=true;
 try{
  while(pendingSaveWorld&&!storageReadFailed){
   const snapshot=pendingSaveWorld,generation=saveGeneration;pendingSaveWorld=null;
   const result=await storage.save(deviceStorage,adapter,snapshot,{storageReadFailed,isCurrent:()=>generation===saveGeneration});
   if(result.superseded)continue;
   if(result.saved){
    savedGeneration=generation;
    backupFeedback.textContent='Browser recovery save updated'+(result.format==='gzip'?' (compressed).':'.');
    queueDeviceFileSave(snapshot,false);
   }else{
    allSaved=false;backupFeedback.textContent='Browser recovery save failed: '+result.reason+' Your current world remains open.';
    queueDeviceFileSave(snapshot,false);
    break;
   }
  }
 }finally{
  saveInFlight=false;
  if(pendingSaveWorld&&!storageReadFailed&&!saveTimer)saveTimer=setTimeout(()=>{saveTimer=0;void drainWorldSave();},120);
 }
 return allSaved;
}
function syncPlayerPoseToWorld(now=performance.now(),force=false){
 if(!sandbox||!playerPhysicsState?.player)return false;
 const player=playerPhysicsState.player,last=lastPosePersisted;
 const moved=!last||Math.hypot(player.x-last.x,player.y-last.y,player.z-last.z)>.12;
 const turned=!last||Math.abs(Math.atan2(Math.sin(player.yaw-last.yaw),Math.cos(player.yaw-last.yaw)))>.12||
  Math.abs((player.pitch||0)-(last.pitch||0))>.12;
 if(!force&&(!moved&&!turned||now-lastPosePersistAt<360))return false;
 try{
  const next=sandbox.setPlayerPose({x:player.x,y:player.y,z:player.z,yaw:player.yaw,pitch:player.pitch});
  lastPosePersisted={x:player.x,y:player.y,z:player.z,yaw:player.yaw,pitch:player.pitch};
  lastPosePersistAt=now;
  if(next.revision>lastAutoSaveRevision)lastAutoSaveRevision=next.revision;
  queueWorldSave(next.world,false);return true;
 }catch(error){backupFeedback.textContent='Player position could not be saved: '+error.message;return false;}
}
function flushWorldSaveSync(){
 if(!sandbox)return false;
 if(saveTimer){clearTimeout(saveTimer);saveTimer=0;}
 syncPlayerPoseToWorld(performance.now(),true);
 if(saveTimer){clearTimeout(saveTimer);saveTimer=0;}
 // Invalidate any async compression already running. Its final write check will fail.
 saveGeneration++;
 const world=pendingSaveWorld||sandbox.getState().world;
 pendingSaveWorld=null;
 let browserSaved=false;
 if(!storageReadFailed){
  const result=storage.saveSync(deviceStorage,adapter,world,{storageReadFailed});
  browserSaved=!!result.saved;
  if(browserSaved){savedGeneration=saveGeneration;backupFeedback.textContent='Latest world changes saved to browser recovery.';}
  else backupFeedback.textContent='Browser recovery could not save the latest changes: '+result.reason;
 }
 // Always request the same final snapshot for the selected device file.
 queueDeviceFileSave(world,true);
 return browserSaved;
}
async function saveWorldNow(){
 if(!sandbox)return false;
 if(!storageReadFailed){pendingSaveWorld=sandbox.getState().world;saveGeneration++;}
 const browserSaved=storageReadFailed?false:await drainWorldSave();
 let fileSaved=false;
 if(primaryWorldFileHandle&&deviceWorldFileState==='connected'){
  pendingDeviceFileWorld=sandbox.getState().world;fileSaved=await drainDeviceFileSave(true);
 }
 if(browserSaved&&fileSaved)backupFeedback.textContent='Saved to '+primaryWorldFileName+' and browser recovery.';
 else if(fileSaved)backupFeedback.textContent='Saved to '+primaryWorldFileName+'. Browser recovery is unavailable.';
 else if(browserSaved)backupFeedback.textContent='Saved to browser recovery. Link a .diycraft file for a separate device copy.';
 else backupFeedback.textContent='The world could not be saved. Check the device-file link or download a portable .diycraft backup.';
 return browserSaved||fileSaved;
}
function applyWorldName(){
 try{const next=sandbox.setWorldName(worldNameInput.value);worldNameInput.value=next.world.name;renderSandbox(next);backupFeedback.textContent='World name updated.';}
 catch(error){backupFeedback.textContent='World name was not changed: '+error.message;}
}
function downloadWorldBackup(){
 try{
  const named=sandbox.setWorldName(worldNameInput.value);worldNameInput.value=named.world.name;renderSandbox(named);
  const saved=adapter.toSavedWorld(named.world),blob=new Blob([JSON.stringify(saved,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  const safeName=saved.name.replace(/[^a-z0-9_-]+/gi,'_')||'DIYCraft';
  anchor.href=url;anchor.download=safeName+'.json';anchor.style.display='none';document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);backupFeedback.textContent='Version-1 JSON backup prepared: '+safeName+'.json.';
 }catch(error){backupFeedback.textContent='Backup was not created: '+error.message;}
}
async function readBackupPayload(file){
 if(!file||file.size>MAX_BACKUP_BYTES)throw new RangeError('Backup file exceeds the 24 MB safety limit.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(deviceFiles.isDiycraftFile(bytes))return await deviceFiles.decode(bytes);
 if(bytes.length>=2&&bytes[0]===0x1f&&bytes[1]===0x8b){
  let binary='';for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
  return await storage.decode(storage.GZIP_PREFIX+btoa(binary));
 }
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
async function restoreWorldBackup(file){
 if(!file)return;let replacementModel=null;
 try{
  const backupText=await readBackupPayload(file),parsed=JSON.parse(await storage.decode(backupText));
  const restoredSnapshot=adapter.createSnapshot(parsed),normalizedBackup=adapter.toSavedWorld(restoredSnapshot);
  const replacement=editing.create(restoredSnapshot),replacementState=replacement.getState(),player={...restoredSnapshot.player};
  const floor=replacement.surfaceHeightAt(player.x,player.z,player.y),grounded=Math.abs(player.y-floor)<=.18;
  const replacementPhysics={player,jumpVelocity:0,playerGrounded:grounded,flying:false,playerActivity:''};
  replacementModel=playerModelFactory.create(THREE,materials,player,performanceProfile.shadows);
  const committed=await storage.restore(deviceStorage,adapter,backupText);
  if(!committed.restored)throw new Error(committed.error);
  closeNeighborColoring();closeInventory();closeCharacterStudio();closeArtStudio();closeGallery();closeDesigners();
  animalCareShade.hidden=true;animalCareSelection=null;animalCareFlash.hidden=true;
  if(playerModelRoot)playerModelFactory.dispose(playerModelRoot);
  sandbox=replacement;sourceSnapshot=restoredSnapshot;originalJson=JSON.stringify(normalizedBackup);
  storageReadFailed=false;storageLoadSource='device';pendingSaveWorld=null;lastAutoSaveRevision=replacementState.revision;
  saveGeneration++;savedGeneration=saveGeneration;
  playerPhysicsState=replacementPhysics;playerPlayMode=false;playerCameraMode='third';
  playerModelRoot=replacementModel;replacementModel=null;scene.add(playerModelRoot);updatePlayerModel();
  target.set(player.x,Math.max(1,player.y+1),player.z);
  animalPlacementSpecies='';document.getElementById('animal-place').classList.remove('primary');document.getElementById('animal-place').textContent='Place an animal';
  lastPosePersisted={x:player.x,y:player.y,z:player.z,yaw:player.yaw,pitch:player.pitch};
  setPlayerPlayMode(false);renderSandbox(replacementState);updateNeighborModels(performance.now());cameraUpdate();
  worldNameInput.value=normalizedBackup.name;
  backupFeedback.textContent='World restored to browser recovery.';
  status.textContent='Restored: '+normalizedBackup.name+' · '+normalizedBackup.blocks.length+' blocks.';
  queueDeviceFileSave(replacementState.world,false);
  return true;
 }catch(error){
  if(replacementModel)playerModelFactory.dispose(replacementModel);
  backupFeedback.textContent='Backup not restored. Your current world and saved data remain unchanged. '+error.message;
  return false;
 }finally{document.getElementById('backup-restore').value='';}
}
document.getElementById('world-name-apply').addEventListener('click',applyWorldName);
document.getElementById('backup-download').addEventListener('click',downloadWorldBackup);
document.getElementById('backup-restore').addEventListener('change',event=>restoreWorldBackup(event.target.files?.[0]));
document.getElementById('save-now').addEventListener('click',()=>{void saveWorldNow();});
deviceFileConnect.addEventListener('click',()=>{void connectDeviceWorldFile();});
deviceFileOpen.addEventListener('click',()=>{void openDeviceWorldFile();});
deviceFileDownload.addEventListener('click',()=>{void downloadDeviceWorldFile();});
deviceFileFallback.addEventListener('change',async event=>{
 const selectedFile=event.target.files?.[0];if(!selectedFile)return;
 try{const text=await deviceFiles.openFile(selectedFile);await importDeviceWorldText(text,selectedFile.name.replace(/\.diycraft$/i,''));syncDeviceFileControls('Opened '+selectedFile.name+'. Choose a device file to enable automatic updates.');}
 catch(error){syncDeviceFileControls('World file not opened: '+String(error.message||error).slice(0,220));}
 finally{deviceFileFallback.value='';}
});

const solidDesigner=document.getElementById('solid-designer');
const doorDesigner=document.getElementById('door-designer');
const tileDesigner=document.getElementById('tile-designer');
const SOLID_BASE_COLORS={grass:'#70b85a',dirt:'#9a7049',stone:'#9ca6a1',wood:'#a97545',leaves:'#4e9a59',brick:'#c87862',glass:'#a5dce3',flower:'#e9a4c1',sand:'#e8d38b',snow:'#f2f8fa',custom:'#aa83d8'};
const SOLID_TEXTURES=['grass','dirt','stone','wood','leaves','brick','glass','flower','sand','snow','custom'];
function closeDesigners(){solidDesigner.hidden=true;doorDesigner.hidden=true;tileDesigner.hidden=true;}
function updateSolidDesignPreview(){
 const type=document.getElementById('solid-design-type').value,color=document.getElementById('solid-design-color').value,texture=document.getElementById('solid-design-texture').value;
 const chip=document.getElementById('solid-design-chip');
 chip.style.backgroundColor=color;
 const texturePreview=painterly.generateCanvas(color,0x51a7,texture,{textureSize:128});
 chip.style.backgroundImage='url("'+texturePreview.toDataURL('image/png')+'")';
 chip.style.backgroundSize='cover';chip.style.backgroundRepeat='repeat';
 document.getElementById('solid-design-name').textContent=type==='custom'?'Custom solid':type.charAt(0).toUpperCase()+type.slice(1);
 document.getElementById('solid-design-details').textContent=color+' · '+texture+' texture';
}
function openSolidDesigner(){
 const state=sandbox.getState().world,type=document.getElementById('block-type').value;
 const selectedType=type==='custom'||Object.prototype.hasOwnProperty.call(SOLID_BASE_COLORS,type)?type:'stone';
 const style=selectedType==='custom'?state.customBlock:state.solidStyles?.[selectedType];
 document.getElementById('solid-design-type').value=selectedType;
 const quickColor=window.DIYCraftQuickMaterialColors?.[selectedType];
 document.getElementById('solid-design-color').value=quickColor||style?.color||SOLID_BASE_COLORS[selectedType];
 document.getElementById('solid-design-texture').value=SOLID_TEXTURES.includes(style?.texture)?style.texture:(selectedType==='custom'?'custom':selectedType);
 updateSolidDesignPreview();solidDesigner.hidden=false;
}
function updateDoorDesignPreview(){
 const style=document.getElementById('door-design-style').value,color=document.getElementById('door-design-color').value;
 document.getElementById('door-design-chip').style.background='linear-gradient(90deg,'+color+',#f2e0b8 48%,'+color+')';
 document.getElementById('door-design-name').textContent=style.charAt(0).toUpperCase()+style.slice(1)+' door';
 document.getElementById('door-design-details').textContent=color;
}
function openDoorDesigner(){
 const design=sandbox.getState().world.doorDesign||{color:'#a97545',style:'classic'};
 document.getElementById('door-design-style').value=design.style||'classic';
 document.getElementById('door-design-color').value=design.color||'#a97545';
 updateDoorDesignPreview();doorDesigner.hidden=false;
}
function updateTileDesignPreview(){
 const pattern=document.getElementById('tile-design-pattern').value,color=document.getElementById('tile-design-color').value;
 const chip=document.getElementById('tile-design-chip');
 chip.style.backgroundColor=color;
 const texturePreview=painterly.generateCanvas(color,0x51a7,'tile-'+pattern,{textureSize:128});
 chip.style.backgroundImage='url("'+texturePreview.toDataURL('image/png')+'")';
 chip.style.backgroundSize='cover';chip.style.backgroundRepeat='repeat';
 document.getElementById('tile-design-name').textContent=pattern.charAt(0).toUpperCase()+pattern.slice(1);
 document.getElementById('tile-design-details').textContent=color+' · '+pattern;
}
function openTileDesigner(){
 const design=sandbox.getState().world.tileDesign||{color:'#c5a98a',pattern:'grid'};
 document.getElementById('tile-design-pattern').value=design.pattern||'grid';
 document.getElementById('tile-design-color').value=design.color||'#c5a98a';
 updateTileDesignPreview();tileDesigner.hidden=false;
}
document.getElementById('solid-design-open').addEventListener('click',openSolidDesigner);
document.getElementById('door-design-open').addEventListener('click',openDoorDesigner);
document.getElementById('tile-design-open').addEventListener('click',openTileDesigner);
document.querySelectorAll('.design-shade [data-design-close]').forEach(button=>button.addEventListener('click',closeDesigners));
[document.getElementById('solid-design-type'),document.getElementById('solid-design-color'),document.getElementById('solid-design-texture')].forEach(input=>input.addEventListener('change',updateSolidDesignPreview));
[document.getElementById('door-design-style'),document.getElementById('door-design-color')].forEach(input=>input.addEventListener('change',updateDoorDesignPreview));
[document.getElementById('tile-design-pattern'),document.getElementById('tile-design-color')].forEach(input=>input.addEventListener('change',updateTileDesignPreview));
document.getElementById('solid-design-apply').addEventListener('click',()=>{
 try{
  const type=document.getElementById('solid-design-type').value,design={color:document.getElementById('solid-design-color').value,texture:document.getElementById('solid-design-texture').value};
  const next=type==='custom'?sandbox.setCustomBlockDesign(design):sandbox.setSolidStyle(type,design);
  // A fresh designer choice supersedes any temporary color-only picker override.
  if(window.DIYCraftQuickMaterialColors)delete window.DIYCraftQuickMaterialColors[type];
  document.getElementById('block-type').value=type;document.getElementById('color').value=design.color;
  renderSandbox(next);window.DIYCraftSyncHudChoices?.();closeDesigners();status.textContent='New '+type+' blocks will use this '+design.texture+' finish.';
 }catch(error){status.textContent=error.message;}
});
document.getElementById('door-design-apply').addEventListener('click',()=>{
 try{
  const design={color:document.getElementById('door-design-color').value,style:document.getElementById('door-design-style').value};
  const next=sandbox.setDoorDesign(design);document.getElementById('door-style').value=design.style;
  document.getElementById('block-type').value='door';renderSandbox(next);closeDesigners();status.textContent='Your door design is ready for new doors.';
 }catch(error){status.textContent=error.message;}
});
document.getElementById('tile-design-apply').addEventListener('click',()=>{
 try{
  const design={color:document.getElementById('tile-design-color').value,pattern:document.getElementById('tile-design-pattern').value};
  const next=sandbox.setTileDesign(design);
  // Clear any selected old tile so renderSandbox cannot overwrite the new future-placement pattern.
  const ready=sandbox.select(null);
  renderSandbox(ready||next);
  document.getElementById('pattern').value=design.pattern;
  document.getElementById('block-type').value='tile';
  window.DIYCraftSyncHudChoices?.();
  closeDesigners();status.textContent='Your '+design.pattern+' tile design is ready for new tiles.';
 }catch(error){status.textContent=error.message;}
});
document.getElementById('bucket-empty').addEventListener('click',()=>{
 const current=sandbox.getState().world.bucket||[];
 if(!current.length){document.getElementById('inventory-feedback').textContent='Your Material Bucket is already empty.';return;}
 if(!window.confirm('Empty the Material Bucket? Recovered blocks will be discarded.'))return;
 const next=sandbox.clearMaterialBucket();document.getElementById('bucket-item').value='';
 renderSandbox(next);document.getElementById('inventory-feedback').textContent='Material Bucket emptied in this sandbox copy.';
});
document.getElementById('clear-placed').addEventListener('click',()=>{
 if(!window.confirm('Clear the blocks you have built? The starter garden and neighbor homes will remain.'))return;
 const before=sandbox.getState().world.blocks.length,next=sandbox.clearPlacedBlocks();
 renderSandbox(next);status.textContent=Math.max(0,before-next.world.blocks.length)+' placed blocks cleared. Starter garden and homes are safe.';
});
[solidDesigner,doorDesigner,tileDesigner].forEach(panel=>panel.addEventListener('pointerdown',event=>{if(event.target===panel)closeDesigners();}));
async function registerOffline(){
 const note=document.getElementById('offline-ready-note');
 if(!('serviceWorker' in navigator)){if(note)note.textContent='Offline play is not supported by this browser.';return;}
 try{
  const script=location.pathname.includes('/offline/')?'../sw.js':'./sw.js';
  await navigator.serviceWorker.register(script);
  if(note)note.textContent='Offline game files are being prepared on this device. Keep this page open until setup finishes.';
  const registration=await navigator.serviceWorker.ready;
  if(note)note.textContent=registration.active?'Offline game engine is ready on this device.':'Offline game setup is still preparing.';
 }catch(error){if(note)note.textContent='Offline setup could not finish: '+String(error.message||error).slice(0,120);}
}
async function start(){
 try{deviceStorage=window.localStorage;}catch(error){deviceStorage=null;}
 let loaded=await storage.load(deviceStorage,adapter,starterWorld.create());
 let remembered=null,deviceMessage='';
 try{remembered=await deviceFiles.loadRemembered();}catch(error){remembered={status:'unavailable'};}
 if(remembered?.status==='loaded'){
  try{
   const fileSnapshot=adapter.createSnapshot(JSON.parse(remembered.worldText));
   loaded={snapshot:fileSnapshot,source:'device-file',storageReadFailed:false,error:''};
   primaryWorldFileHandle=remembered.handle;primaryWorldFileName=remembered.fileName||remembered.handle.name;deviceWorldFileState='connected';
   const recovered=await storage.restore(deviceStorage,adapter,remembered.worldText);
   if(!recovered.restored)deviceMessage='Device file opened; browser recovery could not be refreshed: '+recovered.error;
  }catch(error){deviceWorldFileState='invalid';deviceMessage='Remembered device file failed validation and was not overwritten.';}
 }else if(remembered?.status==='empty'){
  primaryWorldFileHandle=remembered.handle;primaryWorldFileName=remembered.fileName||remembered.handle.name;deviceWorldFileState='connected';
  deviceMessage='Linked device file is empty. Your current world will be copied into it.';
 }else if(remembered?.status==='permission-required'){
  primaryWorldFileHandle=remembered.handle;primaryWorldFileName=remembered.fileName||remembered.handle.name;deviceWorldFileState='permission-required';
  deviceMessage='Your device file is remembered. Reconnect it to grant access and reopen the latest world.';
 }else if(remembered?.status==='invalid'){
  deviceWorldFileState='invalid';deviceMessage='The remembered .diycraft file could not be read. It has not been overwritten.';
 }
 sourceSnapshot=loaded.snapshot;storageReadFailed=loaded.storageReadFailed;storageLoadSource=loaded.source;
 originalJson=JSON.stringify(adapter.toSavedWorld(sourceSnapshot));
 sandbox=editing.create(sourceSnapshot);buildNeighborModels();
 const blocks=sourceSnapshot.blocks;
 if(blocks.length){const xs=blocks.map(b=>b.x),zs=blocks.map(b=>b.z);target.set((Math.min(...xs)+Math.max(...xs)+1)/2,1,(Math.min(...zs)+Math.max(...zs)+1)/2);}
 playerPhysicsState={player:{...sourceSnapshot.player},jumpVelocity:0,playerGrounded:false,flying:false,playerActivity:''};
 const playerFloor=sandbox.surfaceHeightAt(playerPhysicsState.player.x,playerPhysicsState.player.z,playerPhysicsState.player.y);
 playerPhysicsState.playerGrounded=Math.abs(playerPhysicsState.player.y-playerFloor)<=.18;
 playerPhysicsEnvironment={
  groundDepthAt:(x,z)=>sandbox.groundDepthAt(x,z),surfaceHeightAt:(x,z,y)=>sandbox.surfaceHeightAt(x,z,y),
  playerCollisionAt:(x,z,y)=>sandbox.playerCollisionAt(x,z,y),nudgePlayer:player=>sandbox.nudgePlayerOutOfBlocks(player)
 };
 playerModelRoot=playerModelFactory.create(THREE,materials,playerPhysicsState.player,performanceProfile.shadows);
 scene.add(playerModelRoot);updatePlayerModel();syncPlayerButtons();
 worldNameInput.value=sourceSnapshot.name;lastAutoSaveRevision=0;
 lastPosePersisted={x:playerPhysicsState.player.x,y:playerPhysicsState.player.y,z:playerPhysicsState.player.z,yaw:playerPhysicsState.player.yaw,pitch:playerPhysicsState.player.pitch};
 cameraUpdate();renderSandbox(sandbox.getState());
 if(storageReadFailed)backupFeedback.textContent='Existing browser recovery data could not be read. It has been preserved. Restore a valid backup before making changes.';
 else if(loaded.source==='starter'){backupFeedback.textContent='A new world is ready. Browser recovery will save automatically.';queueWorldSave(sandbox.getState().world,true);}
 else backupFeedback.textContent=loaded.source==='device-file'?'Your world was reopened from '+primaryWorldFileName+'.':'Your saved world was restored from browser recovery.';
 syncDeviceFileControls(deviceMessage);
 if(deviceWorldFileState==='connected'&&remembered?.status==='empty'&&!storageReadFailed)queueDeviceFileSave(sandbox.getState().world,true);
 await registerOffline();
 window.__DIYCRAFT_THREE_EDIT__=window.__DIYCRAFT_THREE_EDIT__||{};
 window.__DIYCRAFT_THREE_EDIT__.sourceUnchanged=true;
 window.__DIYCRAFT_THREE_EDIT__.storageSource=storageLoadSource;
 window.__DIYCRAFT_THREE_EDIT__.storageReadFailed=storageReadFailed;
 window.__DIYCRAFT_THREE_EDIT__.deviceFileState=deviceWorldFileState;
 requestAnimationFrame(animate);
}
start().catch(error=>{status.textContent='DIYCraft could not start: '+error.message;backupFeedback.textContent='The game could not open: '+error.message;throw error;});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){flushWorldSaveSync();void drainDeviceFileSave();}});
window.addEventListener('pagehide',()=>{flushWorldSaveSync();void drainDeviceFileSave();});
})();