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
 assert.ok(geometry.attributes.position.array.length>0,species+' has visible geometry');
 assert.ok(features.body&&features.head&&features.eye&&features.leg,species+' has body, projected head, eyes and legs');
 assert.ok(features.head.max[2]>features.body.max[2]+.08,species+' head must extend beyond the body silhouette');
 assert.ok(features.eye.max[2]>features.body.max[2],species+' eyes must sit on the visible front of the head');
 assert.ok(features.leg.min[1]<.02&&features.leg.max[1]>.28,species+' legs must reach the ground');
 if(species==='bird')assert.ok(extent(features.leg,0)>.5&&extent(features.leg,2)>.05,'bird feet must be spaced side-to-side');
 else assert.ok(extent(features.leg,0)>.5&&extent(features.leg,2)>.35,species+' legs must be separated in width and depth');
 assert.equal(geometry.attributes.position.array.length,geometry.attributes.color.array.length,species+' vertex colors must align with positions');
 const bodyWidth=extent(features.body,0),bodyHeight=extent(features.body,1),bodyDepth=extent(features.body,2);
 assert.ok(bodyWidth/bodyHeight<=1.5,species+' body silhouette must not be excessively wide or pancake-shaped');
 assert.ok(features.head.min[1]>features.body.min[1]+.55,species+' head should sit visibly above the lower body line');
 assert.ok(bodyWidth<1.8&&bodyDepth<1.25,species+' body dimensions must stay compact around the legs and head');
 assert.ok(geometry.userData.animalBodyShape.every(value=>Number.isFinite(value)&&value>0),species+' must expose safe body proportions');
 if(species==='sheep'){
  assert.ok(extent(features.wool,0)<.85,'Sheep fleece should not overwhelm the body and head with a wide shell-like silhouette');
  assert.ok(features.head.max[1]>1.15,'Sheep face should rise clearly above the fleece cluster');
  assert.ok(extent(features.head,0)>.5,'Sheep face should remain recognizable at the more compact scale');
 }


}
assert.throws(()=>animals.create(THREE,{species:'unknown'}),/supported animal/);
console.log('Three.js recognizable animal geometry tests complete.');
