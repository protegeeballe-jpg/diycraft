/* Stage 1: render the actual DIYCraft starter-world snapshot in Three.js.
   The source world is read-only; this module never writes storage. */
(function(){
'use strict';
const THREE=window.THREE,adapter=window.DIYCraftThreeWorldAdapter;
const painterly=window.DIYCraftPainterlyMaterials,performanceProfiles=window.DIYCraftThreePerformanceProfile,plantGeometryFactory=window.DIYCraftThreePlantGeometry;
const canvas=document.getElementById('three-world');
const status=document.getElementById('counts');
const errorPanel=document.getElementById('error');
if(!THREE||!adapter||!painterly||!performanceProfiles||!plantGeometryFactory)throw new Error('A required local DIYCraft Three.js migration module did not load.');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xf2ead9);
scene.fog=new THREE.Fog(0xf2ead9,34,78);
const camera=new THREE.PerspectiveCamera(40,1,.1,140);
const target=new THREE.Vector3(0,1.0,-4);
let orbit={radius:31,theta:Math.PI*.17,phi:Math.PI*.34};
function positionCamera(){
 orbit.phi=Math.max(.20,Math.min(1.22,orbit.phi));
 camera.position.set(
  target.x+orbit.radius*Math.sin(orbit.phi)*Math.sin(orbit.theta),
  target.y+orbit.radius*Math.cos(orbit.phi),
  target.z+orbit.radius*Math.sin(orbit.phi)*Math.cos(orbit.theta)
 );
 camera.lookAt(target);
}
positionCamera();
const deviceSignals=performanceProfiles.browserCapabilities(window.navigator,!!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches),4096,false);
const performanceProfile=performanceProfiles.select(deviceSignals),frameGate=performanceProfiles.createFrameGate(performanceProfile.fpsCap);
const renderer=new THREE.WebGLRenderer({canvas,antialias:performanceProfile.antialias,alpha:false,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,performanceProfile.maxPixelRatio));
renderer.setSize(window.innerWidth,window.innerHeight,false);
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=.96;
renderer.shadowMap.enabled=performanceProfile.shadows;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setClearColor(0xf2ead9,1);
scene.add(new THREE.HemisphereLight(0xfff7e9,0x788b70,.78));
const sun=new THREE.DirectionalLight(0xfff0d5,1.05);
sun.position.set(-14,23,16);sun.castShadow=performanceProfile.shadows;
sun.shadow.mapSize.set(performanceProfile.shadows?1536:1,performanceProfile.shadows?1536:1);
sun.shadow.camera.left=-25;sun.shadow.camera.right=25;
sun.shadow.camera.top=25;sun.shadow.camera.bottom=-25;
sun.shadow.bias=-.00025;scene.add(sun);
const fill=new THREE.DirectionalLight(0xc5d9e8,.24);
fill.position.set(12,9,-15);scene.add(fill);
const palette=painterly.create(THREE,renderer,performanceProfile);
const plantSurfaceMaterial=palette.get('#ffffff','paper');
plantSurfaceMaterial.vertexColors=true;plantSurfaceMaterial.side=THREE.DoubleSide;plantSurfaceMaterial.needsUpdate=true;
const sharedGeometry={
 cube:new THREE.BoxGeometry(1,1,1),
 tile:new THREE.BoxGeometry(1,.13,1),
 stem:new THREE.CylinderGeometry(.035,.05,.78,7),
 petal:new THREE.SphereGeometry(.17,10,8),
 center:new THREE.SphereGeometry(.105,10,8),
 grassBlade:new THREE.ConeGeometry(.07,.72,5)
};
const animated=[];
const blockInstances=new Map();
let renderedBlocks=0,renderedPlants=0,renderedDoors=0,renderedAnimals=0;
const defaultColors={
 grass:'#70b85a',dirt:'#9a7049',stone:'#9ca6a1',wood:'#a97545',
 leaves:'#4e9a59',brick:'#c87862',glass:'#a5dce3',flower:'#e9a4c1',
 tall_grass:'#4ea859',sand:'#e8d38b',snow:'#f2f8fa',tile:'#c5a98a',
 door:'#a97545'
};
function material(color,kind,options){
 return palette.get(color||'#9ca6a1',kind||'surface',options||{});
}
function addMesh(geometry,mat,x,y,z,parent=scene){
 const mesh=new THREE.Mesh(geometry,mat);
 mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
}
function box(parent,x,y,z,w,h,d,mat){
 const mesh=addMesh(w===1&&h===1&&d===1?sharedGeometry.cube:new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
 return mesh;
}
function buildTerrain(){
 const terrain=addMesh(new THREE.PlaneGeometry(72,72),material('#789767','grass'),0,-.055,0);
 terrain.rotation.x=-Math.PI/2;terrain.receiveShadow=true;terrain.castShadow=false;
 // A faint broad meadow tint gives the original blocks a soft natural setting.
 const underlay=addMesh(new THREE.PlaneGeometry(110,110),
  new THREE.MeshBasicMaterial({color:0xe9e3cf}),0,-.085,0);
 underlay.rotation.x=-Math.PI/2;underlay.receiveShadow=false;underlay.castShadow=false;
}
function addInstanced(key,entry){
 if(!entry.items.length)return;
 const mesh=new THREE.InstancedMesh(entry.geometry,entry.material,entry.items.length);
 const dummy=new THREE.Object3D();
 entry.items.forEach((b,i)=>{
  dummy.position.set(b.x+.5,b.y+(key.startsWith('tile|')?.065:.5),b.z+.5);
  dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
  mesh.setMatrixAt(i,dummy.matrix);
 });
 mesh.instanceMatrix.needsUpdate=true;
 mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.userData.blockKeys=entry.items.map(b=>b.key);
 mesh.userData.blockType=entry.type;
 scene.add(mesh);
 renderedBlocks+=entry.items.length;
}
function queueSolidBlock(block){
 const type=block.type;
 const kind=type==='tile'?'tile-'+(block.tilePattern||'grid'):(block.texture||type);
 const color=block.color||defaultColors[type]||'#a0a0a0';
 const mat=material(color,kind,{glass:type==='glass',roughness:type==='glass'?.23:.94});
 const geometry=type==='tile'?sharedGeometry.tile:sharedGeometry.cube;
 const key=Math.floor(block.x/16)+','+Math.floor(block.z/16)+'|'+type+'|'+kind+'|'+color;
 let entry=blockInstances.get(key);
 if(!entry){entry={type,geometry,material:mat,items:[]};blockInstances.set(key,entry);}
 entry.items.push(block);
}
function makePlant(block){
 const root=new THREE.Group();root.position.set(block.x+.5,block.y,block.z+.5);
 const geometry=plantGeometryFactory.createGeometry(THREE,block);
 const mesh=new THREE.Mesh(geometry,plantSurfaceMaterial);
 mesh.castShadow=performanceProfile.shadows;mesh.receiveShadow=performanceProfile.shadows;
 root.add(mesh);scene.add(root);
 animated.push({object:root,kind:block.type==='flower'?'flower':'grass',phase:block.x*.71+block.z*.53});
 renderedPlants++;
}
function makeDoor(block){
 const root=new THREE.Group();
 root.position.set(block.x+.08,block.y,block.z+.08);
 scene.add(root);
 const leaf=new THREE.Group();root.add(leaf);
 const wood=material(block.color||defaultColors.door,'wood');
 const trim=material('#6f5039','wood');
 const glass=material('#a9dce8','glass',{glass:true});
 const panel=box(leaf,.42,.98,0,.84,1.96,.12,wood);
 panel.castShadow=true;
 for(const y of [.31,1.22]){
  box(leaf,.42,y,.068,.56,.54,.018,trim);
 }
 if(block.style==='window'){
  box(leaf,.42,1.43,.075,.44,.42,.018,glass);
 }
 box(leaf,.70,.87,.09,.07,.13,.055,material('#e6bd62','flower'));
 if(block.orientation==='ew')leaf.rotation.y=-Math.PI/2;
 if(block.open)leaf.rotation.y+=(block.swing===-1?-1:1)*1.28;
 renderedDoors++;
 return root;
}
function makePlayer(player){
 const root=new THREE.Group();
 root.position.set(player.x+.5,player.y,player.z+.5);
 root.rotation.y=player.yaw||0;scene.add(root);
 const skin=material(player.skin,'skin'),shirt=material(player.shirt,'cloth');
 const pants=material(player.pants,'cloth'),shoes=material(player.shoes,'cloth');
 const hair=material(player.hair,'hair'),eyes=new THREE.MeshStandardMaterial({color:player.eyes||'#302820',roughness:.9});
 // Legs and shoes.
 for(const x of [-.19,.19]){
  box(root,x,.34,0,.23,.62,.25,pants);
  box(root,x,.10,.055,.25,.18,.34,shoes);
 }
 // Torso, neck and head.
 box(root,0,1.02,0,.62,.78,.34,shirt);
 addMesh(new THREE.SphereGeometry(.14,10,8),skin,0,1.46,0,root);
 addMesh(new THREE.SphereGeometry(.31,12,10),skin,0,1.76,.015,root);
 const hairCap=addMesh(new THREE.SphereGeometry(.33,12,8),hair,0,1.91,-.035,root);
 hairCap.scale.set(1,.55,1.02);
 for(const x of [-.11,.11])addMesh(new THREE.SphereGeometry(.035,8,6),eyes,x,1.78,.294,root);
 const fringe=addMesh(new THREE.SphereGeometry(.22,10,7),hair,0,1.9,.20,root);
 fringe.scale.set(1,.27,.42);
 return root;
}
function makeAnimal(animal){
 const root=new THREE.Group();root.position.set(animal.x,0,animal.z);root.rotation.y=animal.facing||0;scene.add(root);
 const bodyColor=animal.body||({sheep:'#f0eee6',cat:'#c5c0b6',dog:'#c89b6d',cow:'#f2eee5',horse:'#8a6347',bird:'#e8c96d',giraffe:'#d9ad55'}[animal.species]||'#e9dfca');
 const accent=animal.accent||'#d0b6a0';
 const bodyMat=material(bodyColor,'animal'),accentMat=material(accent,'animal'),legMat=material('#775941','wood');
 if(animal.species==='bird'){
  const body=addMesh(new THREE.SphereGeometry(.31,12,9),bodyMat,0,.55,0,root);body.scale.set(1.2,.85,.8);
  addMesh(new THREE.SphereGeometry(.17,10,8),bodyMat,0,.82,.17,root);
  const beak=addMesh(new THREE.ConeGeometry(.09,.22,5),material('#e8ad56','flower'),0,.79,.36,root);beak.rotation.x=Math.PI/2;
 }else{
  const body=addMesh(new THREE.SphereGeometry(.48,14,10),bodyMat,0,.72,0,root);body.scale.set(1.35,.82,.9);
  const neck=animal.species==='giraffe'?addMesh(new THREE.CylinderGeometry(.14,.19,.85,8),bodyMat,0,1.25,.28,root):null;
  const headY=animal.species==='giraffe'?1.72:1.0;
  const headZ=animal.species==='giraffe'?.34:.43;
  const head=addMesh(new THREE.SphereGeometry(.27,12,9),bodyMat,0,headY,headZ,root);
  head.scale.set(1,.9,1);
  if(animal.species==='cat'||animal.species==='dog'){
   for(const x of [-.16,.16]){
    const ear=addMesh(new THREE.ConeGeometry(.10,.25,5),accentMat,x,headY+.22,headZ,root);
    ear.rotation.z=x*.8;
   }
  }
  if(neck&&animal.species==='giraffe'){
   for(let i=0;i<5;i++)addMesh(new THREE.SphereGeometry(.055,7,6),accentMat,(i%2)*.13-.07,1.0+i*.15,.42,root);
  }
  for(const x of [-.27,.27])for(const z of [-.24,.24])addMesh(new THREE.CylinderGeometry(.055,.07,.42,6),legMat,x,.22,z,root);
 }
 animated.push({object:root,kind:'animal',phase:animal.phase||0});
 renderedAnimals++;
}
function makeWater(snapshot){
 if(!snapshot.water.length)return null;
 const positions=[],indices=[],baseHeights=[];
 snapshot.water.forEach(cell=>{
  const y=-cell.depth+cell.level-.02,x=cell.x,z=cell.z,offset=positions.length/3;
  positions.push(x,y,z,x+1,y,z,x+1,y,z+1,x,y,z+1);
  baseHeights.push(y,y,y,y);
  indices.push(offset,offset+2,offset+1,offset,offset+3,offset+2);
 });
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const waterMat=material('#79b5c3','water',{roughness:.25});
 waterMat.transparent=true;waterMat.opacity=.84;waterMat.side=THREE.DoubleSide;
 const mesh=addMesh(geometry,waterMat,0,0,0);
 mesh.castShadow=false;mesh.userData.baseHeights=baseHeights;
 return mesh;
}
function buildWorld(snapshot,originalJson){
 buildTerrain();
 // Block material and geometry grouping keeps the voxel world efficient.
 snapshot.blocks.forEach(block=>{
  if(block.type==='flower'||block.type==='tall_grass'){makePlant(block);return;}
  if(block.type==='door'){makeDoor(block);return;}
  queueSolidBlock(block);
 });
 for(const [key,entry] of blockInstances)addInstanced(key,entry);
 const water=makeWater(snapshot);
 const player=makePlayer(snapshot.player);
 snapshot.animals.forEach(makeAnimal);
 // The immutable snapshot is independent from the original source.
 window.__DIYCRAFT_THREE_WORLD__={
  revision:THREE.REVISION,source:snapshot.source,
  snapshotCounts:snapshot.counts,
  sourceBlocks:snapshot.counts.blocks,
  renderedBlocks,renderedPlants,renderedDoors,renderedAnimals,
  materialCount:palette.materialCount,textureCount:palette.textureCount,
  geometryCount:renderer.info.memory.geometries,
  instanceGroups:blockInstances.size,
  sourceUnchanged:JSON.stringify(originalJson)===JSON.stringify(window.__DIYCRAFT_ORIGINAL_WORLD__),
  frames:0,drawCalls:0,performanceProfile:{tier:performanceProfile.tier,fpsCap:performanceProfile.fpsCap,maxPixelRatio:performanceProfile.maxPixelRatio,antialias:performanceProfile.antialias,shadows:performanceProfile.shadows,textureSize:performanceProfile.textureSize,waterAnimationFps:performanceProfile.waterAnimationFps}
 };
 return {water,player};
}
let pointer=null;
canvas.addEventListener('pointerdown',event=>{
 pointer={x:event.clientX,y:event.clientY,id:event.pointerId};
 canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{
 if(!pointer)return;
 const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
 pointer.x=event.clientX;pointer.y=event.clientY;
 orbit.theta-=dx*.0055;orbit.phi+=dy*.004;positionCamera();
});
canvas.addEventListener('pointerup',()=>{pointer=null;});
canvas.addEventListener('pointercancel',()=>{pointer=null;});
canvas.addEventListener('wheel',event=>{
 event.preventDefault();orbit.radius=Math.max(18,Math.min(58,orbit.radius+event.deltaY*.02));positionCamera();
},{passive:false});
window.addEventListener('resize',()=>{
 camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth,window.innerHeight,false);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,performanceProfile.maxPixelRatio));
});
let waterMesh=null,last=performance.now(),elapsed=0,lastWaterUpdate=-Infinity;
function animate(now){
 requestAnimationFrame(animate);
 if(!frameGate.shouldRender(now))return;
 const dt=Math.min(.05,(now-last)/1000||0);last=now;elapsed+=dt;
 for(const item of animated){
  if(item.kind==='flower')item.object.rotation.z=Math.sin(elapsed*1.25+item.phase)*.075;
  else if(item.kind==='grass')item.object.rotation.z=Math.sin(elapsed*1.8+item.phase)*.11;
  else if(item.kind==='animal'){
   item.object.position.y=Math.max(0,Math.sin(elapsed*2.2+item.phase))*.035;
   item.object.rotation.z=Math.sin(elapsed*1.1+item.phase)*.018;
  }
 }
 if(waterMesh&&now-lastWaterUpdate>=1000/performanceProfile.waterAnimationFps){
  lastWaterUpdate=now;
  const position=waterMesh.geometry.attributes.position,base=waterMesh.userData.baseHeights;
  for(let i=0;i<position.count;i++){
   const x=position.getX(i),z=position.getZ(i);
   position.setY(i,base[i]+Math.sin(x*1.4+elapsed*1.4)*.045+Math.cos(z*1.6+elapsed)*.03);
  }
  position.needsUpdate=true;
 }
 renderer.render(scene,camera);
 if(window.__DIYCRAFT_THREE_WORLD__){
  window.__DIYCRAFT_THREE_WORLD__.frames++;
  window.__DIYCRAFT_THREE_WORLD__.drawCalls=renderer.info.render.calls;
  window.__DIYCRAFT_THREE_WORLD__.geometryCount=renderer.info.memory.geometries;
 }
}
async function start(){
 try{
  const response=await fetch('./preview-three/starter-world.json',{cache:'no-store'});
  if(!response.ok)throw new Error('The test-generated starter-world fixture is not available ('+response.status+').');
  const rawWorld=await response.json();
  window.__DIYCRAFT_ORIGINAL_WORLD__=JSON.parse(JSON.stringify(rawWorld));
  const before=JSON.stringify(rawWorld);
  const snapshot=adapter.createSnapshot(rawWorld);
  const built=buildWorld(snapshot,rawWorld);
  waterMesh=built.water;
  const after=JSON.stringify(rawWorld);
  if(before!==after)throw new Error('The Three.js renderer mutated the original starter-world data.');
  status.textContent=
   snapshot.name+' · '+snapshot.counts.blocks+' blocks · '+renderedPlants+
   ' plants · '+snapshot.counts.animals+' animals · '+palette.materialCount+
   ' painterly materials · '+performanceProfile.tier+' quality';
  requestAnimationFrame(animate);
 }catch(error){
  errorPanel.style.display='block';
  errorPanel.textContent='Three.js world preview could not start.\n'+(error.stack||error.message);
  throw error;
 }
}
start();
})();
