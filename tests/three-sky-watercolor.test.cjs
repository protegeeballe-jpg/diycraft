'use strict';
const assert=require('node:assert/strict');
const painterly=require('../js/three-painterly-materials.js');
for(const mode of ['day','sunset','night']){
 assert.ok(painterly.skyStyles[mode],mode+' must have a watercolor pigment palette.');
 assert.ok(painterly.skyStyles[mode].glow.every(v=>Number.isInteger(v)&&v>=0&&v<=255),mode+' glow pigment must be valid RGB.');
 assert.ok(Object.isFrozen(painterly.skyStyles[mode]),mode+' pigment palette must be immutable.');
}
assert.throws(()=>painterly.generateSkyCanvas(['#ffffff','#ffffff','#ffffff'],'dawn'),/day, sunset or night/);
assert.throws(()=>painterly.generateSkyCanvas(['#ffffff','blue','#ffffff'],'day'),/three six-digit palette colors/);
console.log('Three.js watercolor sky palette tests complete.');
