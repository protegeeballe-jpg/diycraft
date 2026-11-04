/* Stage 2 browser sandbox. All editing is confined to a cloned snapshot. */
(function(){
'use strict';
const THREE=window.THREE,adapter=window.DIYCraftThreeWorldAdapter;
const painterly=window.DIYCraftPainterlyMaterials,editing=window.DIYCraftThreeEditSandbox;
const raycastKeys=window.DIYCraftThreeRaycast,doorMotion=window.DIYCraftThreeDoorMotion,performanceProfiles=window.DIYCraftThreePerformanceProfile,plantGeometryFactory=window.DIYCraftThreePlantGeometry,doorModels=window.DIYCraftThreeDoorModel;
const canvas=document.getElementById('three-world'),status=document.getElementById('status');
if(!THREE||!adapter||!painterly||!editing||!raycastKeys||!doorMotion||!performanceProfiles||!plantGeometryFactory||!doorModels)throw new Error('A local Three.js sandbox dependency did not load.');
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
const animatedPlants=[];
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const fishGeometry=new THREE.BufferGeometry();
fishGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
 0,0,0,-.08,0,-.075,.10,0,-.055,.18,0,0,.10,0,.055,-.08,0,.075,
 -.16,0,0,-.30,0,-.09,-.30,0,.09
],3));
fishGeometry.setIndex([0,2,1,0,3,2,0,4,3,0,5,4,6,8,7]);fishGeometry.computeVertexNormals();
const fishColors=['#f1ad55','#f28c72','#f2d56b','#72c4cb'];
let sandbox=null,originalJson=null,sourceSnapshot=null,selected=null,lastPlacement=null,meshByKey=new Map(),blockByKey=new Map(),doorMotions=new Map();
let waterMesh=null,fishMeshes=[],renderedFishCount=0,lastWaterAnimationAt=-Infinity;
let target=new THREE.Vector3(0,1,0),orbit={radius:38,theta:.62,phi:.88};
function cameraUpdate(){
 orbit.phi=Math.max(.2,Math.min(1.3,orbit.phi));
 camera.position.set(target.x+orbit.radius*Math.sin(orbit.phi)*Math.sin(orbit.theta),target.y+orbit.radius*Math.cos(orbit.phi),target.z+orbit.radius*Math.sin(orbit.phi)*Math.cos(orbit.theta));
 camera.lookAt(target);
}
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
 const renderObjects=group.children.length,instanceBatches=batches.size,waterCount=(state.world.water||[]).length,fishCount=(state.world.fish||[]).length;
 status.textContent=state.world.name+' · '+state.world.blocks.length+' blocks · '+instanceBatches+' instanced batches · '+renderObjects+' render objects · Bucket: '+(state.world.bucket?.length||0)+
  (selectedBlock?' · Selected: '+selectedBlock.type:' · Select a block to edit')+
  ' · Water: '+waterCount+' · Fish: '+fishCount+' ('+renderedFishCount+' shown) · '+performanceProfile.tier+' quality · Original unchanged: '+state.sourceUnchanged;
 window.__DIYCRAFT_THREE_EDIT__={revision:state.revision,selectedKey:state.selectedKey,blockCount:state.world.blocks.length,renderedBlocks:state.world.blocks.length,
  sourceUnchanged:state.sourceUnchanged,storageKeys:localStorage.length,renderedMeshes:renderObjects,renderObjects,instanceBatches,
  performanceProfile:{tier:performanceProfile.tier,fpsCap:performanceProfile.fpsCap,maxPixelRatio:performanceProfile.maxPixelRatio,antialias:performanceProfile.antialias,shadows:performanceProfile.shadows,textureSize:performanceProfile.textureSize,maxVisibleFish:performanceProfile.maxVisibleFish,waterAnimationFps:performanceProfile.waterAnimationFps},
  waterCount,fishCount,renderedFishCount,canvasSize:{width:canvas.width,height:canvas.height},
  lastPlacement:lastPlacement?{key:lastPlacement.key,x:lastPlacement.x,y:lastPlacement.y,z:lastPlacement.z,step:lastPlacement.step.slice()}:null,
  pickBlock:(key)=>{const block=blockByKey.get(key);if(!block)return false;const p=new THREE.Vector3(block.x+.5,block.y+.5,block.z+.5).project(camera);clickAt((p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2);return true;},
  getDoorAngle:(key)=>{const block=blockByKey.get(key);return block&&block.type==='door'?displayedDoorAngle(block):null;},
  getDoorVisualStats:(key)=>{const block=blockByKey.get(key),root=meshByKey.get(key);if(!block||block.type!=='door'||!root)return null;const layout=doorModels.create(block),panel=root.children.find(child=>child.isMesh),image=panel?.material?.map?.image,ctx=image?.getContext?.('2d');const sample=(x,y)=>{if(!ctx)return null;const px=Math.max(0,Math.min(image.width-1,Math.round(x/.84*image.width))),py=Math.max(0,Math.min(image.height-1,Math.round((1.96-y)/1.96*image.height))),v=ctx.getImageData(px,py,1,1).data;return {r:v[0],g:v[1],b:v[2]};};return {style:layout.style,textureKind:layout.textureKind,color:layout.color,orientation:layout.orientation,pivot:layout.pivot,baseAngle:layout.baseAngle,textureWidth:image?.width||0,textureHeight:image?.height||0,hasPainterlyMap:!!image,styleSample:sample(layout.style==='window'?.42:.43,layout.style==='window'?1.38:1.43)};},
  getWaterStats:()=>{const matrix=fishMeshes[0]?.mesh.instanceMatrix.array;return {cells:(sandbox.getState().world.water||[]).length,fish:(sandbox.getState().world.fish||[]).length,renderedFish:renderedFishCount,waterVertices:waterMesh?waterMesh.geometry.attributes.position.count:0,surfaceY:waterMesh?waterMesh.geometry.attributes.position.getY(0):null,fishAngle:matrix?Math.atan2(matrix[8],matrix[0]):null};},getState:()=>sandbox.getState()};
}
function selectedBlock(){
 const state=sandbox.getState();return state.world.blocks.find(b=>b.key===state.selectedKey)||null;
}
function choose(key){renderSandbox(sandbox.select(key));}
function clickAt(x,y){
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
 if(type==='water'){const cell=waterCellInput();renderSandbox(sandbox.addWaterLayer(cell.x,cell.z));return;}
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
document.getElementById('remove').addEventListener('click',()=>{if(selected){try{renderSandbox(sandbox.remove(selected));}catch(error){status.textContent=error.message;}}});
document.getElementById('door').addEventListener('click',()=>{try{renderSandbox(sandbox.toggleDoor(selected));}catch(e){status.textContent=e.message;}});
document.getElementById('apply-pattern').addEventListener('click',()=>{try{renderSandbox(sandbox.setTilePattern(selected,document.getElementById('pattern').value));}catch(e){status.textContent=e.message;}});
function waterCellInput(){
 const xValue=document.getElementById('water-x').value.trim(),zValue=document.getElementById('water-z').value.trim();
 const x=Number(xValue),z=Number(zValue);
 if(!xValue||!zValue||!Number.isInteger(x)||!Number.isInteger(z))throw new TypeError('Enter whole-number X and Z coordinates for the pool.');
 return {x,z};
}
document.getElementById('water-add').addEventListener('click',()=>{try{const cell=waterCellInput();renderSandbox(sandbox.addWaterLayer(cell.x,cell.z));}catch(e){status.textContent=e.message;}});
document.getElementById('water-collect').addEventListener('click',()=>{try{const cell=waterCellInput();renderSandbox(sandbox.collectWaterLayer(cell.x,cell.z));}catch(e){status.textContent=e.message;}});
document.getElementById('fish-add').addEventListener('click',()=>{try{const cell=waterCellInput();renderSandbox(sandbox.addFish(cell.x,cell.z));}catch(e){status.textContent=e.message;}});
let pointerDown=null;
canvas.addEventListener('pointerdown',event=>{pointerDown={x:event.clientX,y:event.clientY,id:event.pointerId,moved:false};canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointermove',event=>{
 if(!pointerDown)return;const dx=event.clientX-pointerDown.x,dy=event.clientY-pointerDown.y;
 if(Math.abs(dx)+Math.abs(dy)>3)pointerDown.moved=true;pointerDown.x=event.clientX;pointerDown.y=event.clientY;orbit.theta-=dx*.005;orbit.phi+=dy*.004;cameraUpdate();
});
canvas.addEventListener('pointerup',event=>{
 if(!pointerDown)return;const dx=event.clientX-pointerDown.x,dy=event.clientY-pointerDown.y;
 if(!pointerDown.moved&&Math.abs(dx)+Math.abs(dy)<7)clickAt(event.clientX,event.clientY);pointerDown=null;
});
canvas.addEventListener('pointercancel',()=>{pointerDown=null;});
canvas.addEventListener('wheel',event=>{event.preventDefault();orbit.radius=Math.max(14,Math.min(60,orbit.radius+event.deltaY*.02));cameraUpdate();},{passive:false});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,performanceProfile.maxPixelRatio));});
let frame=0;
function animate(now){requestAnimationFrame(animate);if(!frameGate.shouldRender(now))return;updateDoorAnimations(now);updateWaterAndFish(now);for(const item of animatedPlants){if(item.kind==='flower')item.object.rotation.z=Math.sin(now*.00125+item.phase)*.075;else item.object.rotation.z=Math.sin(now*.0018+item.phase)*.11;}renderer.render(scene,camera);frame++;if(window.__DIYCRAFT_THREE_EDIT__){window.__DIYCRAFT_THREE_EDIT__.frames=frame;window.__DIYCRAFT_THREE_EDIT__.drawCalls=renderer.info.render.calls;window.__DIYCRAFT_THREE_EDIT__.geometryCount=renderer.info.memory.geometries;window.__DIYCRAFT_THREE_EDIT__.textureCount=renderer.info.memory.textures;}}
async function start(){
 const response=await fetch('./preview-three/starter-world.json',{cache:'no-store'});
 if(!response.ok)throw new Error('Starter-world fixture unavailable ('+response.status+').');
 const raw=await response.json();originalJson=JSON.stringify(raw);sourceSnapshot=adapter.createSnapshot(raw);
 sandbox=editing.create(sourceSnapshot);
 const blocks=sourceSnapshot.blocks;
 if(blocks.length){const xs=blocks.map(b=>b.x),zs=blocks.map(b=>b.z);target.set((Math.min(...xs)+Math.max(...xs)+1)/2,1,(Math.min(...zs)+Math.max(...zs)+1)/2);}
 cameraUpdate();renderSandbox(sandbox.getState());
 if(JSON.stringify(raw)!==originalJson)throw new Error('The source starter world changed while opening the sandbox.');
 window.__DIYCRAFT_THREE_EDIT__.sourceUnchanged=true;
 requestAnimationFrame(animate);
}
start().catch(error=>{status.textContent='Sandbox could not start: '+error.message;throw error;});
})();
