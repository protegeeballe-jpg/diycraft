'use strict';
const assert=require('node:assert/strict');
const models=require('../js/three-player-model.js');

function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
class Position{
 constructor(){this.x=0;this.y=0;this.z=0;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
}
class FakeGroup{
 constructor(){this.children=[];this.position=new Position();this.rotation={x:0,y:0,z:0};this.userData={};this.parent=null;}
 add(child){child.parent=this;this.children.push(child);}
 remove(child){this.children=this.children.filter(item=>item!==child);child.parent=null;}
}
class FakeGeometry{
 constructor(){
  this.index={count:36};
  this.attributes={
   position:{array:new Float32Array([-.5,-.5,-.5,.5,-.5,-.5,.5,.5,-.5,-.5,.5,-.5]),itemSize:3},
   normal:{array:new Float32Array([0,0,-1,0,0,-1,0,0,-1,0,0,-1]),itemSize:3},
   uv:{array:new Float32Array([0,0,1,0,1,1,0,1]),itemSize:2}
  };
  this.disposed=false;
 }
 clone(){const copy=new FakeGeometry();copy.attributes=Object.fromEntries(Object.entries(this.attributes).map(([key,value])=>[key,{array:new Float32Array(value.array),itemSize:value.itemSize}]));return copy;}
 scale(){return this;}
 translate(){return this;}
 toNonIndexed(){const copy=this.clone();copy.index=null;return copy;}
 dispose(){this.disposed=true;}
}
class FakeBufferGeometry{
 constructor(){this.attributes={};this.disposed=false;}
 setAttribute(name,attribute){this.attributes[name]=attribute;return this;}
 computeBoundingSphere(){this.boundingSphere={radius:1};}
 dispose(){this.disposed=true;}
}
class FakeAttribute{
 constructor(array,itemSize){this.array=array;this.itemSize=itemSize;}
}
class FakeColor{
 constructor(hex){const value=parseInt(String(hex).slice(1),16);this.r=((value>>16)&255)/255;this.g=((value>>8)&255)/255;this.b=(value&255)/255;}
}
class FakeMesh extends FakeGroup{
 constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;this.castShadow=false;this.receiveShadow=false;}
}
const THREE={Group:FakeGroup,BoxGeometry:FakeGeometry,BufferGeometry:FakeBufferGeometry,Float32BufferAttribute:FakeAttribute,Color:FakeColor,Mesh:FakeMesh};
const material={vertexColors:false,needsUpdate:false};
const materials={get:()=>material};
const base={x:0,y:0,z:7,yaw:0,hairStyle:'short',outfitStyle:'hoodie',accessory:'none',
 hair:'#493127',skin:'#efc39d',shirt:'#d94b3d',pants:'#397d8f',shoes:'#bd4540',eyes:'#302820',accessoryColor:'#f4a8bb'};

test('builds the complete player with one painterly mesh and one draw-call surface',()=>{
 const root=models.create(THREE,materials,base,false);
 assert.equal(root.children.length,1);
 assert.equal(root.children[0].isMesh,true);
 assert.equal(root.userData.sharedMaterial.vertexColors,true);
 assert.ok(root.userData.playerGeometry.attributes.position.array.length>0);
 assert.equal(root.userData.playerGeometry.attributes.color.array.length,root.userData.playerGeometry.attributes.position.array.length);
 assert.equal(root.position.x,.5);
 assert.equal(root.position.y,0);
 assert.equal(root.position.z,7.5);
});

test('preserves every saved hairstyle, outfit and accessory appearance',()=>{
 const styles=['short','bob','long','ponytail','pigtails','curly','buns'];
 const outfits=['hoodie','sweater','overalls','dress','tee'];
 const accessories=['none','bow','flower','glasses','cap'];
 const baseline=models.create(THREE,materials,base,false);
 const baselineVertices=baseline.userData.playerGeometry.attributes.position.array.length;
 for(const hairStyle of styles){
  const model=models.create(THREE,materials,{...base,hairStyle},false);
  assert.equal(model.userData.appearance.hairStyle,hairStyle);
  assert.ok(model.userData.playerGeometry.attributes.position.array.length>0);
 }
 for(const outfitStyle of outfits){
  const model=models.create(THREE,materials,{...base,outfitStyle},false);
  assert.equal(model.userData.appearance.outfitStyle,outfitStyle);
  assert.ok(model.userData.playerGeometry.attributes.position.array.length>0);
 }
 for(const accessory of accessories){
  const model=models.create(THREE,materials,{...base,accessory},false);
  assert.equal(model.userData.appearance.accessory,accessory);
 }
 const pigtails=models.create(THREE,materials,{...base,hairStyle:'pigtails'},false);
 assert.ok(pigtails.userData.playerGeometry.attributes.position.array.length>baselineVertices);
});

test('updates the existing model pose without rebuilding geometry',()=>{
 const root=models.create(THREE,materials,base,false),geometry=root.userData.playerGeometry;
 models.update(root,{...base,x:12.25,y:1.5,z:-4.75,yaw:Math.PI/3});
 assert.deepEqual({x:root.position.x,y:root.position.y,z:root.position.z,rotation:root.rotation.y},
  {x:12.75,y:1.5,z:-4.25,rotation:Math.PI/3});
 assert.equal(root.userData.playerGeometry,geometry);
});

test('disposes replaced avatar geometry when the model is removed',()=>{
 const root=models.create(THREE,materials,base,false),parent=new FakeGroup(),geometry=root.userData.playerGeometry;
 parent.add(root);
 assert.equal(models.dispose(root),true);
 assert.equal(root.parent,null);
 assert.equal(parent.children.length,0);
 assert.equal(geometry.disposed,true);
});

console.log('Three.js player model tests complete.');
