'use strict';
const assert=require('node:assert/strict');
const plants=require('../js/three-plant-geometry.js');
class Attribute{
 constructor(values,itemSize){this.array=new Float32Array(values);this.itemSize=itemSize;this.count=this.array.length/itemSize;}
}
class Color{
 constructor(hex){const n=parseInt(String(hex).slice(1),16);this.r=((n>>16)&255)/255;this.g=((n>>8)&255)/255;this.b=(n&255)/255;}
}
class BufferGeometry{
 constructor(){this.attributes={};this.userData={};this.index=null;}
 setAttribute(name,value){this.attributes[name]=value;}
 setIndex(value){this.index=value;}
 computeVertexNormals(){this.normalsComputed=true;}
 computeBoundingSphere(){this.boundingSphere={computed:true};}
}
class Float32BufferAttribute extends Attribute{}
const THREE={Color,BufferGeometry,Float32BufferAttribute};
const flower=plants.createGeometry(THREE,{type:'flower',color:'#e9a4c1'});
const shape=flower.userData.plantShape;
assert.equal(shape.plantType,'flower');
assert.equal(shape.petalCount,8,'A flower should retain eight readable petals.');
assert.equal(shape.leafCount,2,'A flower should have two leaves.');
assert.equal(shape.raisedPetalRidges,true,'Petals should be folded and cupped in 3D.');
assert.equal(shape.raisedLeafVeins,true,'Leaves should have raised center veins.');
assert.ok(shape.petalYRange.max-shape.petalYRange.min>=.12,'Petals should have real vertical relief, not one horizontal plane.');
assert.ok(flower.attributes.position.count>0);
assert.equal(flower.attributes.position.count,flower.attributes.color.count,'Painterly vertex colors should align with geometry.');
assert.equal(flower.attributes.position.count,flower.attributes.uv.count,'Texture UVs should align with geometry.');
assert.ok(flower.normalsComputed&&flower.boundingSphere.computed,'Flower geometry should compute normals and bounds.');
const grass=plants.createGeometry(THREE,{type:'tall_grass'});
assert.equal(grass.userData.plantShape.plantType,'tall_grass');
assert.equal(grass.userData.plantShape.petalCount,0);
assert.ok(grass.attributes.position.count>0,'Tall grass should retain merged blade geometry.');
assert.ok(grass.attributes.position.count<200,'Plant geometry should remain inexpensive for low-end devices.');
assert.throws(()=>plants.createGeometry(THREE,{type:'stone'}),/flower or tall-grass/);
console.log('Three.js dimensional plant geometry tests complete.');
