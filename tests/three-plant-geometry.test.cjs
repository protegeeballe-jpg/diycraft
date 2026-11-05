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
assert.equal(shape.flowerVolume,true,'The blossom must be built from closed volumetric geometry.');
assert.equal(shape.petalCrossSectionSegments,8,'Each petal must have an eight-sided 3D cross-section.');
assert.equal(shape.petalLongitudinalRings,7,'Each petal must use multiple longitudinal rings rather than one plane.');
assert.ok(shape.petalThickness>=.03,'Each petal must have visible physical thickness.');
assert.equal(shape.stalkVolume,true,'The flower stalk must be a tapered 3D volume.');
assert.ok(shape.stalkRadialSegments>=6,'The stalk must have a rounded radial cross-section.');
assert.equal(shape.basalLeavesVolume,true,'Basal leaves must have closed three-dimensional volume.');
assert.ok(shape.leafThickness>.015,'Leaves must have measurable thickness.');
assert.ok(shape.petalYRange.max-shape.petalYRange.min>=.20,'Petals should have a clearly raised bowl profile, not one horizontal plane.');
assert.equal(shape.petalProfiles.length,8,'Each flower petal must have an independently tracked upward profile.');
assert.ok(shape.petalProfiles.every(profile=>profile.rise>=.20),'Every petal must rise visibly from its base toward its tip.');
assert.ok(shape.petalProfiles.every(profile=>profile.tipY>shape.flowerCenterY+.14),'The petal rim must stand clearly above the recessed flower heart.');
assert.ok(shape.petalProfiles.every(profile=>profile.radialExtent>.38),'Petals must extend outward from the stem into a flower-shaped crown.');
assert.ok(shape.petalCupDepth>.14,'The flower must have a measurable cupped side profile.');
assert.ok(shape.petalCupDepth<.25,'The flower center must remain nested within the blossom rather than buried below it.');
assert.ok(flower.attributes.position.count>0);
assert.equal(flower.attributes.position.count,flower.attributes.color.count,'Painterly vertex colors should align with geometry.');
assert.equal(flower.attributes.position.count,flower.attributes.uv.count,'Texture UVs should align with geometry.');
assert.ok(flower.normalsComputed&&flower.boundingSphere.computed,'Flower geometry should compute normals and bounds.');
const grass=plants.createGeometry(THREE,{type:'tall_grass'});
assert.equal(grass.userData.plantShape.plantType,'tall_grass');
assert.equal(grass.userData.plantShape.petalCount,0);
assert.ok(grass.attributes.position.count>0,'Tall grass should retain merged blade geometry.');
assert.ok(grass.attributes.position.count<500,'Tall grass should remain a compact merged low-poly mesh.');
assert.throws(()=>plants.createGeometry(THREE,{type:'stone'}),/flower or tall-grass/);
console.log('Three.js dimensional plant geometry tests complete.');
