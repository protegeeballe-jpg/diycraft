'use strict';
const assert=require('node:assert/strict');
const raycast=require('../js/three-world-raycast.js');
function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
test('resolves instanced voxel IDs to stable block keys',()=>{
 const hit={object:{userData:{blockKeys:['b0','b1','b2']}},instanceId:2};
 assert.equal(raycast.resolve([hit]),'b2');
});
test('resolves ordinary mesh and parent-group block keys',()=>{
 const mesh={userData:{blockKey:'door-1'}};
 const child={userData:{},parent:mesh};
 assert.equal(raycast.resolve([{object:child}]),'door-1');
 assert.equal(raycast.resolve([{object:{userData:{blockKey:'tile-2'}}}]),'tile-2');
});
test('skips non-block intersections and invalid instance IDs',()=>{
 assert.equal(raycast.resolve([{object:{userData:{blockKeys:['a']}},instanceId:8}]),null);
 assert.equal(raycast.resolve([{object:{userData:{}}}]),null);
 assert.equal(raycast.resolve(null),null);
});
test('prefers the nearest usable block intersection',()=>{
 assert.equal(raycast.resolve([
  {object:{userData:{}}},
  {object:{userData:{blockKey:'nearest'}}},
  {object:{userData:{blockKey:'farther'}}}
 ]),'nearest');
});
console.log('Three.js raycast resolver tests complete.');
