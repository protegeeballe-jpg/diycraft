'use strict';
const assert=require('node:assert/strict');
const motion=require('../js/three-door-motion.js');
function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
test('matches production 260 ms smoothstep door opening endpoints and midpoint',()=>{
 const open=motion.create(0,motion.OPEN_ANGLE,1000);
 assert.equal(motion.angleAt(open,1000),0);
 assert.equal(motion.angleAt(open,1120),motion.OPEN_ANGLE*.5);
 assert.equal(motion.angleAt(open,1260),motion.OPEN_ANGLE);
 assert.equal(motion.angleAt(open,1500),motion.OPEN_ANGLE);
});
test('clamps before motion start and supports a continuous reversal while moving',()=>{
 const opening=motion.create(0,motion.OPEN_ANGLE,1000);
 assert.equal(motion.angleAt(opening,900),0);
 const current=motion.angleAt(opening,1080);
 const closing=motion.create(current,0,1080);
 assert.equal(motion.angleAt(closing,1080),current);
 assert.ok(motion.angleAt(closing,1140)<current);
 assert.equal(motion.angleAt(closing,1340),0);
});
test('rejects invalid motion parameters and timestamps',()=>{
 assert.throws(()=>motion.create(0,1,0,0),/finite/);
 assert.throws(()=>motion.create(NaN,1,0),/finite/);
 assert.throws(()=>motion.angleAt(null,0),/valid door motion/);
 assert.throws(()=>motion.angleAt(motion.create(0,1,0),NaN),/timestamp/);
});
console.log('Three.js door motion tests complete.');
