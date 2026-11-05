'use strict';
const assert=require('node:assert/strict');
const models=require('../js/three-neighbor-model.js');
const protection=require('../js/three-world-protection.js');

function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
class Position{
 constructor(){this.x=0;this.y=0;this.z=0;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
}
class FakeGroup{
 constructor(){this.children=[];this.position=new Position();this.rotation={x:0,y:0,z:0};this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z;return this;},setScalar(v){this.x=v;this.y=v;this.z=v;}};this.visible=true;this.userData={};this.parent=null;}
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
 clone(){const result=new FakeGeometry();result.attributes=Object.fromEntries(Object.entries(this.attributes).map(([k,a])=>[k,{array:new Float32Array(a.array),itemSize:a.itemSize}]));return result;}
 scale(){return this;} translate(){return this;}
 toNonIndexed(){const result=this.clone();result.index=null;return result;}
 dispose(){this.disposed=true;}
}
class FakeBufferGeometry{
 constructor(){this.attributes={};this.disposed=false;}
 setAttribute(name,attribute){this.attributes[name]=attribute;return this;}
 computeBoundingSphere(){}
 dispose(){this.disposed=true;}
}
class FakeColor{
 constructor(hex){
  const value=parseInt(String(hex).slice(1),16);
  this.r=((value>>16)&255)/255;this.g=((value>>8)&255)/255;this.b=(value&255)/255;
 }
}
class FakeMesh extends FakeGroup{
 constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.castShadow=false;this.receiveShadow=false;this.isMesh=true;}
}
class FakeAttribute{
 constructor(array,itemSize){this.array=array;this.itemSize=itemSize;}
}
const THREE={Group:FakeGroup,Mesh:FakeMesh,BoxGeometry:FakeGeometry,BufferGeometry:FakeBufferGeometry,
 Float32BufferAttribute:FakeAttribute,Color:FakeColor};
const material={vertexColors:false,needsUpdate:false};
const materials={get:()=>material};
const actors=protection.characterStates({timeMode:'day',blocks:[],excavations:[]},0,0);

test('creates a reusable painterly 3D model for each of the seven original neighbor appearances',()=>{
 assert.equal(actors.length,7);
 for(const actor of actors){
  const model=models.create(THREE,materials,actor,false);
  assert.equal(model.root.userData.neighborId,actor.id);
  assert.equal(model.root.children.length,5,'A character uses one merged body mesh and four animated limb meshes.');
  assert.equal(model.root.userData.sharedMaterial.vertexColors,true,'The shared painterly surface material must support character colors.');
  assert.equal(model.root.visible,true);
  model.dispose();
 }
});

test('updates world position, facing and walking gait using the original neighbor cadence',()=>{
 const actor=actors.find(item=>item.id==='lia');
 const model=models.create(THREE,materials,actor,false);
 model.update({...actor,x:12.25,z:-4.75,facing:Math.PI/3,moving:true},2.1);
 assert.deepEqual({x:model.root.position.x,z:model.root.position.z},{x:12.25,z:-4.75});
 assert.equal(model.root.rotation.y,Math.PI/3);
 const limbs=model.root.userData.limbs;
 assert.notEqual(limbs.leftLeg.rotation.x,0,'Walking animates the left leg.');
 assert.notEqual(limbs.rightLeg.rotation.x,0,'Walking animates the right leg.');
 assert.notEqual(limbs.leftArm.rotation.x,0,'Walking counter-swings the left arm.');
 model.dispose();
});

test('keeps sleeping neighbors hidden and preserves character scale and identity',()=>{
 const actor=actors.find(item=>item.id==='maya'),model=models.create(THREE,materials,actor,false);
 model.update({...actor,x:19.1,z:-6.2,facing:Math.PI/2,sleeping:true,moving:false},140);
 assert.equal(model.root.visible,false);
 assert.equal(model.root.scale.x,.75*models.proportions.widthScale,'Neighbor characters should be a little narrower while retaining their personal height.');
  assert.equal(model.root.scale.y,.75);
  assert.equal(model.root.scale.z,.75);
 assert.equal(model.root.userData.neighborId,'maya');
 model.dispose();
});

console.log('Three.js neighbor model tests complete.');
