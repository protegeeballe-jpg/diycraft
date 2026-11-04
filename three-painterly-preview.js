/* DIYCraft Three.js painterly rendering experiment.
   Uses the repository's local Three.js r128 build. This page is an isolated
   art/renderer prototype; it does not replace or mutate the production game. */
(function(){
'use strict';
const canvas=document.getElementById('three-world');
if(!canvas||!window.THREE)throw new Error('The local Three.js library did not load.');
const THREE=window.THREE;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0xf2ead9);
scene.fog=new THREE.Fog(0xf2ead9,24,48);
const camera=new THREE.PerspectiveCamera(42,1,.1,100);
const target=new THREE.Vector3(0,1.1,0);
let orbit={radius:22,theta:Math.PI*.22,phi:Math.PI*.31};
function placeCamera(){
 orbit.phi=Math.max(.18,Math.min(1.18,orbit.phi));
 camera.position.set(
  target.x+orbit.radius*Math.sin(orbit.phi)*Math.sin(orbit.theta),
  target.y+orbit.radius*Math.cos(orbit.phi),
  target.z+orbit.radius*Math.sin(orbit.phi)*Math.cos(orbit.theta)
 );
 camera.lookAt(target);
}
placeCamera();
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(window.innerWidth,window.innerHeight,false);
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setClearColor(0xf2ead9,1);

scene.add(new THREE.HemisphereLight(0xfff7e9,0x788b70,1.05));
const sun=new THREE.DirectionalLight(0xfff0d5,1.35);
sun.position.set(-9,17,10);sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-22;sun.shadow.camera.right=22;
sun.shadow.camera.top=22;sun.shadow.camera.bottom=-22;
sun.shadow.bias=-.00025;scene.add(sun);
const fill=new THREE.DirectionalLight(0xc5d9e8,.42);
fill.position.set(12,8,-10);scene.add(fill);

function seeded(seed){
 let x=seed>>>0||1;
 return function(){x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
}
function hexRgb(hex){
 const n=parseInt(hex.slice(1),16);
 return [(n>>16)&255,(n>>8)&255,n&255];
}
function mix(a,b,t){return Math.round(a+(b-a)*t);}
function rgbString(a){return 'rgb('+a[0]+','+a[1]+','+a[2]+')';}
let generatedTextures=0;
function painterlyTexture(color,seed,kind){
 const random=seeded(seed),size=256;
 const c=document.createElement('canvas');c.width=c.height=size;
 const g=c.getContext('2d');
 const base=hexRgb(color);
 g.fillStyle=rgbString(base);g.fillRect(0,0,size,size);
 // Soft watercolor blooms: broad, irregular pigment pools in nearby tints.
 const washCount=kind==='paper'?26:34;
 for(let i=0;i<washCount;i++){
  const x=random()*size,y=random()*size,rx=10+random()*34,ry=7+random()*27;
  const warm=i%3===0?[255,246,224]:i%3===1?[base[0],Math.min(255,base[1]+24),Math.min(255,base[2]+18)]:[Math.max(0,base[0]-18),Math.max(0,base[1]-12),Math.max(0,base[2]-8)];
  const alpha=.035+random()*.075;
  const grad=g.createRadialGradient(x,y,1,x,y,Math.max(rx,ry)*1.4);
  grad.addColorStop(0,'rgba('+warm.join(',')+','+(alpha*1.8)+')');
  grad.addColorStop(.55,'rgba('+warm.join(',')+','+alpha+')');
  grad.addColorStop(1,'rgba('+warm.join(',')+',0)');
  g.fillStyle=grad;g.beginPath();g.ellipse(x,y,rx,ry,random()*Math.PI,0,Math.PI*2);g.fill();
 }
 // Colored-pencil hatching: repeated, slightly irregular strokes with layered pressure.
 g.lineCap='round';g.lineJoin='round';
 const pencilCount=kind==='paper'?980:690;
 for(let i=0;i<pencilCount;i++){
  const x=random()*size,y=random()*size,len=3+random()*(kind==='paper'?13:19);
  const angle=(random()-.5)*.9+(kind==='grass'?.3:0);
  const dx=Math.cos(angle)*len,dy=Math.sin(angle)*len;
  const light=i%5===0;
  const tint=light?base.map(v=>mix(v,255,.5)):base.map(v=>mix(v,Math.max(0,v-48),.48));
  const alpha=(light?.10:.085)+random()*.085;
  g.strokeStyle='rgba('+tint.join(',')+','+alpha+')';
  g.lineWidth=.7+random()*1.7;
  g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+dx*.48,y+dy*.48+(random()-.5)*2,x+dx,y+dy);g.stroke();
 }
 // Fine paper fibers and flecks sit above every pigment layer.
 for(let i=0;i<1250;i++){
  const x=random()*size,y=random()*size;
  const v=random()>.48?255:48,a=.025+random()*.075;
  g.fillStyle='rgba('+v+','+v+','+v+','+a+')';
  g.fillRect(x,y,.45+random()*1.1,.35+random()*.8);
 }
 const texture=new THREE.CanvasTexture(c);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 texture.encoding=THREE.sRGBEncoding;
 generatedTextures++;
 return texture;
}
const materialCache=new Map();
function paint(color,kind='surface',roughness=.94){
 const key=color+'|'+kind;
 if(materialCache.has(key))return materialCache.get(key);
 const tex=painterlyTexture(color,Math.abs((color+'-'+kind).split('').reduce((h,ch)=>Math.imul(h^ch.charCodeAt(0),16777619),2166136261))>>>0,kind);
 const mat=new THREE.MeshStandardMaterial({map:tex,color:0xffffff,roughness,metalness:0});
 materialCache.set(key,mat);return mat;
}
const mats={
 grass:paint('#86ad70','grass'),grassLight:paint('#a5c17c','grass'),
 earth:paint('#a88765','earth'),stone:paint('#c0b8a5','stone'),
 path:paint('#d5c49f','path'),wood:paint('#96704e','wood'),
 leaf:paint('#729b65','leaf'),leafLight:paint('#a2b77b','leaf'),
 roof:paint('#c98576','roof'),wall:paint('#ead8b9','wall'),
 cream:paint('#f2e5c8','wall'),blue:paint('#9ebdc0','wall'),
 flowerPink:paint('#e9a2bb','flower'),flowerYellow:paint('#edc76b','flower'),
 flowerLilac:paint('#b8a8d3','flower'),flowerWhite:paint('#f3eee0','flower'),
 water:paint('#8dc5d0','water',.28)
};
function add(geometry,material,x,y,z,parent=scene){
 const obj=new THREE.Mesh(geometry,material);
 obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;
 parent.add(obj);return obj;
}
function box(x,y,z,w,h,d,material,parent=scene){
 return add(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);
}
function groundTile(x,z,material=mats.grass,w=1,d=1){
 const tile=box(x,.035,z,w,.07,d,material);tile.receiveShadow=true;return tile;
}
// Broad meadow and a gentle, hand-laid path of textured stones.
const meadow=add(new THREE.PlaneGeometry(42,42),mats.grass,0,-.045,0);
meadow.rotation.x=-Math.PI/2;meadow.receiveShadow=true;meadow.castShadow=false;
for(let i=0;i<13;i++){
 const x=(i-6)*1.18,z=2.8+Math.sin(i*.48)*.55;
 const slab=box(x,.04,z,1.08,.09,.92,i%3===0?mats.stone:mats.path);
 slab.rotation.y=(i%2?-.12:.1);
}
for(let x=-5;x<=5;x++)for(let z=-5;z<=5;z++){
 if((x+z)%4===0)groundTile(x*1.15,z*1.15,(x*z)%3===0?mats.grassLight:mats.grass,1.08,1.08);
}
// Water pond: a real subdivided 3D surface with animated vertex waves.
const waterGeo=new THREE.PlaneGeometry(7.3,5.1,36,28);
const waterBase=waterGeo.attributes.position.array.slice();
const water=add(waterGeo,mats.water,5,.19,-2.6);
water.rotation.x=-Math.PI/2;water.castShadow=false;water.receiveShadow=true;
water.material.side=THREE.DoubleSide;water.material.transparent=true;water.material.opacity=.91;
const pondEdge=box(5,-.07,-2.6,7.7,.24,5.5,mats.earth);
pondEdge.position.y=-.09;pondEdge.position.z=-2.6;pondEdge.position.x=5;
pondEdge.material.side=THREE.DoubleSide;
// Small water-edge stones.
for(let i=0;i<10;i++){
 const a=i/10*Math.PI*2,x=5+Math.cos(a)*3.8,z=-2.6+Math.sin(a)*2.7;
 const pebble=add(new THREE.DodecahedronGeometry(.22+((i%3)*.035),0),mats.stone,x,.16,z);
 pebble.scale.set(1,.55,.8);
}

const animatedPlants=[];
function makeTree(x,z,scale=1){
 const group=new THREE.Group();group.position.set(x,0,z);group.scale.setScalar(scale);scene.add(group);
 add(new THREE.CylinderGeometry(.19,.28,2.0,7),mats.wood,0,1,0,group);
 const crown=new THREE.Group();crown.position.set(0,2.25,0);group.add(crown);
 for(let i=0;i<7;i++){
  const a=i*2.399,rad=.35+(i%3)*.18;
  const blob=add(new THREE.IcosahedronGeometry(.72+(i%2)*.08,1),i%3===0?mats.leafLight:mats.leaf,Math.cos(a)*rad,(i%3)*.36,Math.sin(a)*rad,crown);
  blob.scale.set(1.05,.9,1);
 }
 animatedPlants.push({group,kind:'tree',phase:x*1.7+z});
}
makeTree(-7,-4,1.3);makeTree(8,-5,1.45);makeTree(-9,5,1.08);makeTree(9,6,1.12);makeTree(-3,-10,.95);

// Cozy little cottage with textured 3D walls, door, windows and a painted roof.
function makeHouse(x,z,wallMaterial,roofMaterial){
 const house=new THREE.Group();house.position.set(x,0,z);scene.add(house);
 box(0,1.15,0,3.7,2.3,2.8,wallMaterial,house);
 box(0,.68,1.43,.78,1.35,.08,mats.wood,house);
 const knob=add(new THREE.SphereGeometry(.055,8,6),mats.flowerYellow,.25,.72,1.49,house);
 const win1=box(-1.15,1.48,1.445,.72,.7,.07,mats.blue,house);
 const win2=box(1.15,1.48,1.445,.72,.7,.07,mats.blue,house);
 const roof=add(new THREE.ConeGeometry(2.65,1.75,4),roofMaterial,0,3.05,0,house);
 roof.rotation.y=Math.PI/4;roof.scale.z=.84;
 for(const w of [win1,win2]){w.castShadow=false;w.material.side=THREE.DoubleSide;}
}
makeHouse(-3.7,3.8,mats.wall,mats.roof);
makeHouse(3.3,7,mats.cream,mats.leafLight);

// Flower stems and petals use shared watercolor/pencil CanvasTextures as 3D materials.
function makeFlower(x,z,color,phase){
 const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
 add(new THREE.CylinderGeometry(.035,.055,.84,7),mats.leaf,0,.42,0,group);
 const leaf1=add(new THREE.SphereGeometry(.23,9,7),mats.leafLight,-.19,.36,0,group);leaf1.scale.set(1,.28,.55);leaf1.rotation.z=-.35;
 const leaf2=add(new THREE.SphereGeometry(.22,9,7),mats.leaf,.19,.55,0,group);leaf2.scale.set(1,.27,.5);leaf2.rotation.z=.38;
 const petalMat=color==='pink'?mats.flowerPink:color==='yellow'?mats.flowerYellow:color==='lilac'?mats.flowerLilac:mats.flowerWhite;
 const bloom=new THREE.Group();bloom.position.y=.86;group.add(bloom);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  const petal=add(new THREE.SphereGeometry(.18,10,7),petalMat,Math.cos(a)*.2,.02,Math.sin(a)*.2,bloom);
  petal.scale.set(1,.58,.42);petal.rotation.y=-a;
 }
 add(new THREE.SphereGeometry(.105,10,8),mats.flowerYellow,0,.04,0,bloom);
 animatedPlants.push({group,kind:'flower',phase});
}
for(let i=0;i<24;i++){
 const x=-7+(i%8)*.55,z=5+Math.floor(i/8)*.7;
 makeFlower(x,z,['pink','yellow','lilac','white'][i%4],i*.83);
}
// Tufts of individually modeled blades, grouped for smooth collective swaying.
function makeGrass(x,z,phase){
 const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
 for(let i=0;i<7;i++){
  const a=i*2.399,rad=.12+(i%3)*.035;
  const blade=add(new THREE.ConeGeometry(.075,.66,4),i%3===0?mats.grassLight:mats.leaf,Math.cos(a)*rad,.32,Math.sin(a)*rad,group);
  blade.rotation.z=Math.cos(a)*.24;blade.rotation.x=Math.sin(a)*.2;
 }
 animatedPlants.push({group,kind:'grass',phase});
}
for(let i=0;i<46;i++)makeGrass(-8+(i%12)*1.35,-6+Math.floor(i/12)*1.4,i*.53);

// Tiny sheep companion to test painterly materials on rounded forms.
const sheep=new THREE.Group();sheep.position.set(-1.2,0,1.1);scene.add(sheep);
for(let i=0;i<7;i++){
 const a=i*2.399,blob=add(new THREE.SphereGeometry(.39,12,9),mats.flowerWhite,Math.cos(a)*.23,.74+(i%2)*.13,Math.sin(a)*.34,sheep);
 blob.scale.set(1,.88,1);
}
add(new THREE.SphereGeometry(.29,12,10),mats.stone,0,.89,.53,sheep);
for(const x of [-.22,.22])for(const z of [-.2,.2])add(new THREE.CylinderGeometry(.055,.07,.42,6),mats.wood,x,.22,z,sheep);
const eyeMat=new THREE.MeshBasicMaterial({color:0x39473b});
add(new THREE.SphereGeometry(.035,8,6),eyeMat,-.105,.96,.78,sheep);
add(new THREE.SphereGeometry(.035,8,6),eyeMat,.105,.96,.78,sheep);
const nose=add(new THREE.SphereGeometry(.065,8,6),mats.flowerPink,0,.78,.81,sheep);
const floatShadow=add(new THREE.CircleGeometry(1.25,24),new THREE.MeshBasicMaterial({color:0x6d7b61,transparent:true,opacity:.12,depthWrite:false}),0,.006,0);
floatShadow.rotation.x=-Math.PI/2;floatShadow.scale.set(1.1,.48,1);floatShadow.position.set(-1.2,.008,1.1);floatShadow.castShadow=false;floatShadow.receiveShadow=false;

let pointer=null;
canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
 if(!pointer)return;
 const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
 pointer.x=e.clientX;pointer.y=e.clientY;
 orbit.theta-=dx*.006;orbit.phi+=dy*.004;placeCamera();
});
canvas.addEventListener('pointerup',()=>{pointer=null;});
canvas.addEventListener('pointercancel',()=>{pointer=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.radius=Math.max(13,Math.min(34,orbit.radius+e.deltaY*.018));placeCamera();},{passive:false});
window.addEventListener('resize',()=>{
 camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();
 renderer.setSize(window.innerWidth,window.innerHeight,false);
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
});

let frameCount=0,elapsed=0,last=performance.now();
function animate(now){
 requestAnimationFrame(animate);
 const dt=Math.min(.05,(now-last)/1000||0);last=now;elapsed+=dt;frameCount++;
 for(const item of animatedPlants){
  if(item.kind==='flower'){item.group.rotation.z=Math.sin(elapsed*1.35+item.phase)*.075;}
  else if(item.kind==='grass'){item.group.rotation.z=Math.sin(elapsed*1.8+item.phase)*.11;}
  else {item.group.rotation.z=Math.sin(elapsed*.35+item.phase)*.012;}
 }
 const pos=waterGeo.attributes.position;
 for(let i=0;i<pos.count;i++){
  const x=waterBase[i*3],y=waterBase[i*3+1];
  pos.setZ(i,Math.sin(x*1.45+elapsed*1.5)*.055+Math.cos(y*1.7+elapsed*1.1)*.035);
 }
 pos.needsUpdate=true;waterGeo.computeVertexNormals();
 renderer.render(scene,camera);
 window.__THREE_PREVIEW_STATUS__={
  revision:THREE.REVISION,frameCount,elapsed,objectCount:scene.children.length,
  textureCount:generatedTextures,drawCalls:renderer.info.render.calls,
  geometryCount:renderer.info.memory.geometries,materialCount:materialCache.size
 };
}
requestAnimationFrame(animate);
})();
