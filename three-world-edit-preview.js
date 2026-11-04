/* Stage 2 browser sandbox. All editing is confined to a cloned snapshot. */
(function(){
'use strict';
const THREE=window.THREE,adapter=window.DIYCraftThreeWorldAdapter;
const painterly=window.DIYCraftPainterlyMaterials,editing=window.DIYCraftThreeEditSandbox;
const raycastKeys=window.DIYCraftThreeRaycast;
const canvas=document.getElementById('three-world'),status=document.getElementById('status');
if(!THREE||!adapter||!painterly||!editing||!raycastKeys)throw new Error('A local Three.js sandbox dependency did not load.');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xf2ead9);scene.fog=new THREE.Fog(0xf2ead9,30,75);
const camera=new THREE.PerspectiveCamera(48,1,.1,150);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);
renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight(0xfff7e9,0x788b70,.86));
const sun=new THREE.DirectionalLight(0xfff0d5,1.05);sun.position.set(-14,23,16);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const fill=new THREE.DirectionalLight(0xc5d9e8,.24);fill.position.set(12,9,-15);scene.add(fill);
const materials=painterly.create(THREE,renderer);
const floorMat=new THREE.MeshStandardMaterial({color:0x789767,roughness:1});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(90,90),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.08;floor.receiveShadow=true;scene.add(floor);
const group=new THREE.Group();scene.add(group);
const boxGeometry=new THREE.BoxGeometry(1,1,1),tileGeometry=new THREE.BoxGeometry(1,.13,1),doorGeometry=new THREE.BoxGeometry(.82,1.9,.14);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let sandbox=null,originalJson=null,sourceSnapshot=null,selected=null,lastPlacement=null,meshByKey=new Map();
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
 while(group.children.length){const child=group.children[group.children.length-1];if(child.userData.selectionOutline){child.geometry.dispose();child.material.dispose();}group.remove(child);}
 meshByKey.clear();
}
function renderSandbox(state){
 clearGroup();
 state.world.blocks.forEach(block=>{
  const isTile=block.type==='tile',isDoor=block.type==='door';
  const geometry=isTile?tileGeometry:(isDoor?doorGeometry:boxGeometry);
  const mesh=new THREE.Mesh(geometry,mat(block));
  mesh.position.set(block.x+.5,block.y+(isTile?.065:(isDoor?.95:.5)),block.z+.5);
  if(isDoor){mesh.rotation.y=block.orientation==='ew'?-Math.PI/2:0;if(block.open)mesh.rotation.y+=(block.swing===-1?-1:1)*1.28;}
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.blockKey=block.key;mesh.userData.blockType=block.type;
  group.add(mesh);meshByKey.set(block.key,mesh);
  if(block.type==='flower'||block.type==='tall_grass'){
   const topper=new THREE.Mesh(block.type==='flower'?new THREE.SphereGeometry(.24,10,8):new THREE.ConeGeometry(.18,.62,6),mat(block));
   topper.position.set(block.x+.5,block.y+(block.type==='flower'?.88:.7),block.z+.5);
   topper.castShadow=true;topper.userData.blockKey=block.key;group.add(topper);
  }
 });
 if(state.selectedKey&&meshByKey.has(state.selectedKey)){
  const selectedMesh=meshByKey.get(state.selectedKey);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(selectedMesh.geometry),new THREE.LineBasicMaterial({color:0x4b6550,transparent:true,opacity:.9}));
  edges.position.copy(selectedMesh.position);edges.rotation.copy(selectedMesh.rotation);edges.scale.setScalar(1.035);edges.userData.selectionOutline=true;group.add(edges);
 }
 selected=state.selectedKey;
 const selectedBlock=state.world.blocks.find(b=>b.key===selected);
 document.getElementById('remove').disabled=!selectedBlock;
 document.getElementById('door').disabled=!selectedBlock||selectedBlock.type!=='door';
 document.getElementById('apply-pattern').disabled=!selectedBlock||selectedBlock.type!=='tile';
 document.getElementById('pattern').value=selectedBlock&&selectedBlock.type==='tile'?selectedBlock.tilePattern||'grid':'grid';
 status.textContent=state.world.name+' · '+state.world.blocks.length+' sandbox blocks · revision '+state.revision+
  (selectedBlock?' · Selected: '+selectedBlock.type:' · Select a block to edit')+
  ' · Original unchanged: '+state.sourceUnchanged;
 window.__DIYCRAFT_THREE_EDIT__={revision:state.revision,selectedKey:state.selectedKey,blockCount:state.world.blocks.length,
  sourceUnchanged:state.sourceUnchanged,storageKeys:localStorage.length,renderedMeshes:meshByKey.size,lastPlacement:lastPlacement?{key:lastPlacement.key,x:lastPlacement.x,y:lastPlacement.y,z:lastPlacement.z,step:lastPlacement.step.slice()}:null,
  pickBlock:(key)=>{const mesh=meshByKey.get(key);if(!mesh)return false;const p=mesh.position.clone().project(camera);clickAt((p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2);return true;},getState:()=>sandbox.getState()};
}
function selectedBlock(){
 const state=sandbox.getState();return state.world.blocks.find(b=>b.key===state.selectedKey)||null;
}
function choose(key){renderSandbox(sandbox.select(key));}
function clickAt(x,y){
 pointer.x=(x/innerWidth)*2-1;pointer.y=-(y/innerHeight)*2+1;raycaster.setFromCamera(pointer,camera);
 const hits=raycaster.intersectObjects(group.children,false).filter(hit=>!hit.object.userData.selectionOutline);
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
 const input={type,x,y,z};
 if(type==='custom')input.color=color;
 if(type==='custom')input.texture='custom';
 if(type==='tile')input.tilePattern=document.getElementById('pattern').value;
 if(type==='door'){input.style='classic';input.orientation='ns';}
 renderSandbox(sandbox.addBlock(input));
}
document.getElementById('add').addEventListener('click',()=>{try{addBeside();}catch(e){status.textContent=e.message;}});
document.getElementById('remove').addEventListener('click',()=>{if(selected)renderSandbox(sandbox.remove(selected));});
document.getElementById('door').addEventListener('click',()=>{try{renderSandbox(sandbox.toggleDoor(selected));}catch(e){status.textContent=e.message;}});
document.getElementById('apply-pattern').addEventListener('click',()=>{try{renderSandbox(sandbox.setTilePattern(selected,document.getElementById('pattern').value));}catch(e){status.textContent=e.message;}});
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
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));});
let frame=0;
function animate(){requestAnimationFrame(animate);renderer.render(scene,camera);frame++;if(window.__DIYCRAFT_THREE_EDIT__)window.__DIYCRAFT_THREE_EDIT__.frames=frame;}
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
