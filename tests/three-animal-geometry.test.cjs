'use strict';
const assert=require('node:assert/strict');
const animals=require('../js/three-animal-geometry.js');
class Attribute{
 constructor(values,itemSize){this.array=new Float32Array(values);this.itemSize=itemSize;this.count=this.array.length/itemSize;}
 getX(i){return this.array[i*this.itemSize];}
 getY(i){return this.array[i*this.itemSize+1];}
}
class Geometry{
 constructor(points){this.attributes={position:new Attribute(points.flat(),3),uv:new Attribute(points.flatMap(()=>[0,0]),2)};this.index=null;this.disposed=false;}
 dispose(){this.disposed=true;}
}
class SphereGeometry extends Geometry{constructor(radius=1){super([[radius,0,0],[-radius,0,0],[0,radius,0],[0,-radius,0],[0,0,radius],[0,0,-radius]]);}}
class CylinderGeometry extends Geometry{
 constructor(top,bottom,height){super([[top,height/2,0],[-top,height/2,0],[0,height/2,top],[bottom,-height/2,0],[-bottom,-height/2,0],[0,-height/2,bottom]]);}
}
class ConeGeometry extends Geometry{
 constructor(radius,height){super([[0,height/2,0],[radius,-height/2,0],[-radius,-height/2,0],[0,-height/2,radius],[radius,-height/2,0],[0,-height/2,-radius]]);}
}
class Vector3{
 constructor(){this.x=0;this.y=0;this.z=0;}
 fromBufferAttribute(a,i){this.x=a.getX(i);this.y=a.getY(i);this.z=a.array[i*3+2];return this;}
 applyMatrix4(m){
  let x=this.x*m.scale.x,y=this.y*m.scale.y,z=this.z*m.scale.z;
  let c=Math.cos(m.rotation.x),s=Math.sin(m.rotation.x),yy=y*c-z*s,zz=y*s+z*c;y=yy;z=zz;
  c=Math.cos(m.rotation.y);s=Math.sin(m.rotation.y);let xx=x*c+z*s;zz=-x*s+z*c;x=xx;z=zz;
  c=Math.cos(m.rotation.z);s=Math.sin(m.rotation.z);xx=x*c-y*s;yy=x*s+y*c;x=xx;y=yy;
  this.x=x+m.position.x;this.y=y+m.position.y;this.z=z+m.position.z;return this;
 }
}
class Object3D{
 constructor(){this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};this.rotation={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z;}};}
 updateMatrix(){this.matrix={position:this.position,rotation:this.rotation,scale:this.scale};}
}
class Matrix3{getNormalMatrix(){return this;}}
class Color{constructor(hex){const n=parseInt(String(hex).slice(1),16);this.r=((n>>16)&255)/255;this.g=((n>>8)&255)/255;this.b=(n&255)/255;}}
class BufferGeometry{constructor(){this.attributes={};this.userData={};}setAttribute(n,v){this.attributes[n]=v;return this;}computeVertexNormals(){}computeBoundingSphere(){this.boundingSphere={radius:1};}}
class Float32BufferAttribute extends Attribute{}
const THREE={SphereGeometry,CylinderGeometry,ConeGeometry,Object3D,Vector3,Matrix3,Color,BufferGeometry,Float32BufferAttribute};
function extent(b,axis){return b.max[axis]-b.min[axis];}
for(const species of animals.species){
 const geometry=animals.create(THREE,{species}),features=geometry.userData.animalFeatureBounds;
 assert.equal(geometry.userData.animalSpecies,species);
 if(species==='bird')assert.deepEqual(geometry.userData.animalBodyShape,[.43,.40,.58],'Bird torso should stay compact so the wings and head define its silhouette.');
 if(species!=='bird')assert.ok(geometry.userData.animalBodyShape[0]<=.50,species+' torso should stay narrow across the shoulders and hips.');
 assert.ok(geometry.attributes.position.array.length>0,species+' has visible geometry');
 assert.ok(features.body&&features.head&&features.eye&&features.leg,species+' has body, projected head, eyes and legs');
 assert.ok(features.legSocket,species+' has visible upper-leg/body sockets that join the limbs to the torso');
 if(species!=='bird'&&species!=='giraffe')assert.ok(features.neck,species+' should have a short connecting neck between body and head');
 assert.ok(features.head.max[2]>features.body.max[2]+.08,species+' head must extend beyond the body silhouette');
 assert.ok(features.eye.max[2]>features.body.max[2],species+' eyes must sit on the visible front of the head');
 if(species==='bird'){
  assert.ok(features.eye.min[0]<features.head.min[0]-.015&&features.eye.max[0]>features.head.max[0]+.015,'Bird has a separate visible eye on both sides of its head.');
 }else assert.ok(features.eye.min[2]>features.head.max[2]-.055,species+' layered eyes must sit on the head surface rather than inside it');
 assert.ok(features.leg.min[1]<.02&&features.leg.max[1]>.28,species+' legs must reach the ground');
 if(species==='bird')assert.ok(extent(features.leg,0)>.5&&extent(features.leg,2)>.05,'bird feet must be spaced side-to-side');
 else assert.ok(extent(features.leg,0)>.5&&extent(features.leg,2)>.35,species+' legs must be separated in width and depth');
 assert.equal(geometry.attributes.position.array.length,geometry.attributes.color.array.length,species+' vertex colors must align with positions');
 if(species==='bird')assert.ok(features.beak&&features.beak.max[2]>features.head.max[2]+.02,'Bird beak must project beyond the face');
 else assert.ok(features.muzzle&&features.muzzle.max[2]>features.head.max[2]+.02,species+' muzzle or nose must project beyond the face');
 const bodyWidth=extent(features.body,0),bodyHeight=extent(features.body,1),bodyDepth=extent(features.body,2);
 assert.ok(bodyWidth/bodyHeight<=1.5,species+' body silhouette must not be excessively wide or pancake-shaped');
 if(species==='bird')assert.ok(features.head.max[1]>features.body.max[1]+.02,'Bird head should rise above the compact flight torso');
 else assert.ok(features.head.min[1]>features.body.min[1]+.55,species+' head should sit visibly above the lower body line');
 assert.ok(bodyWidth<1.8&&bodyDepth<1.6,species+' torso should remain compact laterally while preserving natural front-to-back length');
 assert.ok(geometry.userData.animalBodyShape.every(value=>Number.isFinite(value)&&value>0),species+' must expose safe body proportions');
 if(species==='sheep'){
  assert.ok(extent(features.wool,0)<.85,'Sheep fleece should not overwhelm the body and head with a wide shell-like silhouette');
  assert.ok(features.head.max[1]>1.35,'Sheep face should rise clearly above the fleece cluster');
  assert.ok(extent(features.head,0)>.5,'Sheep face should remain recognizable at the more compact scale');
 }


}
const leftWing=animals.createBirdWingGeometry(THREE,{body:'#75b9df',accent:'#f3bd54',side:-1});
const rightWing=animals.createBirdWingGeometry(THREE,{body:'#75b9df',accent:'#f3bd54',side:1});
assert.equal(leftWing.userData.animalWing,true);
assert.equal(rightWing.userData.animalWing,true);
assert.equal(leftWing.userData.wingSide,-1);
assert.equal(rightWing.userData.wingSide,1);
assert.equal(leftWing.userData.featherCount,5);
assert.equal(rightWing.userData.featherCount,5);
assert.ok(Math.min(...leftWing.attributes.position.array.filter((_,i)=>i%3===0))<-.65,'Left wing geometry must extend out from its shoulder pivot.');
assert.ok(Math.max(...rightWing.attributes.position.array.filter((_,i)=>i%3===0))>.65,'Right wing geometry must extend out from its shoulder pivot.');
assert.equal(leftWing.attributes.position.array.length,leftWing.attributes.color.array.length,'Wing feather colors must align with positions.');
assert.throws(()=>animals.createBirdWingGeometry(THREE,{side:0}),/side must be -1 or 1/);
assert.throws(()=>animals.create(THREE,{species:'unknown'}),/supported animal/);
console.log('Three.js recognizable animal geometry tests complete.');
