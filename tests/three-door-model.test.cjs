'use strict';
const assert=require('node:assert/strict');
const model=require('../js/three-door-model.js');
function testCase(name,fn){try{fn();console.log('PASS '+name);}catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}}
testCase('matches the production NS door hinge, body dimensions and texture style',()=>{
 const d=model.create({key:'d1',type:'door',x:10,y:-2,z:7,orientation:'ns',style:'classic',color:'#123456',swing:1});
 assert.deepEqual(d.pivot,{x:10.08,y:-2,z:7.5});
 assert.equal(d.baseAngle,0);assert.equal(d.width,.84);assert.equal(d.height,1.96);assert.equal(d.thickness,.12);
 assert.deepEqual(d.localCenter,{x:.42,y:.98,z:-.06});
 assert.equal(d.textureKind,'door-classic');assert.equal(d.angle(1.32),1.32);
});
testCase('matches the production EW hinge and base rotation',()=>{
 const d=model.create({x:-3,y:0,z:12,orientation:'ew',style:'window',swing:-1});
 assert.deepEqual(d.pivot,{x:-2.5,y:0,z:12.08});
 assert.equal(d.baseAngle,-Math.PI/2);
 assert.equal(d.textureKind,'door-window');
 assert.ok(Math.abs(d.angle(1.32)-(-Math.PI/2-1.32))<1e-12);
});
testCase('supports garden details and preserves valid user door color',()=>{
 const d=model.create({x:0,y:0,z:0,orientation:'ns',style:'garden',color:'#Aa33Cc',swing:-1});
 assert.equal(d.style,'garden');assert.equal(d.textureKind,'door-garden');assert.equal(d.color,'#Aa33Cc');
 assert.equal(d.swing,-1);assert.equal(d.angle(.5),-.5);
});
testCase('falls back safely for malformed optional style, orientation, swing and color',()=>{
 const d=model.create({x:0,y:0,z:0,orientation:'bad',style:'castle',color:'red',swing:0});
 assert.equal(d.style,'classic');assert.equal(d.orientation,'ns');assert.equal(d.swing,1);
 assert.equal(d.color,'#a97545');assert.equal(d.textureKind,'door-classic');
});
testCase('rejects invalid door coordinates',()=>{
 assert.throws(()=>model.create(null),/whole-number coordinates/);
 assert.throws(()=>model.create({x:1.5,y:0,z:0}),/whole-number coordinates/);
});
console.log('Three.js door model tests complete.');
