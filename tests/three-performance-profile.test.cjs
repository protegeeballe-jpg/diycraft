'use strict';
const assert=require('node:assert/strict');
const profiles=require('../js/three-performance-profile.js');
function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
test('selects conservative profile for budget phones and data-saver mode',()=>{
 const low=profiles.select({mobile:true,hardwareConcurrency:4,deviceMemory:2,maxTextureSize:4096});
 assert.equal(low.tier,'low');assert.equal(low.maxPixelRatio,1);assert.equal(low.antialias,false);
 assert.equal(low.shadows,false);assert.equal(low.fpsCap,30);assert.equal(low.textureSize,128);assert.equal(low.pencilScale,1);assert.ok(low.watercolorStrength>=1.2);assert.ok(low.pencilStrength>=1.15);assert.equal(low.maxVisibleFish,48);assert.equal(low.maxVisibleAnimals,12);assert.equal(low.waterAnimationFps,15);
 assert.equal(profiles.select({saveData:true}).tier,'low');
 assert.equal(profiles.select({maxTextureSize:2048}).tier,'low');
});
test('keeps 4 GB and hardware-unknown budget phones on the low profile',()=>{
 assert.equal(profiles.select({mobile:true,hardwareConcurrency:8,deviceMemory:4,maxTextureSize:4096}).tier,'low');
 assert.equal(profiles.select({mobile:true,hardwareConcurrency:4,deviceMemory:undefined,maxTextureSize:4096}).tier,'low');
 assert.equal(profiles.select({mobile:true,hardwareConcurrency:undefined,deviceMemory:6,maxTextureSize:4096}).tier,'low');
});
test('selects balanced profile for typical phones and midrange hardware',()=>{
 assert.equal(profiles.select({mobile:true,hardwareConcurrency:8,deviceMemory:6,maxTextureSize:8192}).tier,'balanced');
 assert.equal(profiles.select({hardwareConcurrency:6,deviceMemory:8}).tier,'balanced');
 const p=profiles.select({mobile:true,hardwareConcurrency:8,deviceMemory:6});
 assert.equal(p.shadows,false);assert.ok(p.fpsCap>=30&&p.fpsCap<=45);assert.ok(p.watercolorStrength>=1.2&&p.pencilStrength>=1.15);
});
test('selects high profile only when capability signals support it',()=>{
 const p=profiles.select({mobile:false,hardwareConcurrency:12,deviceMemory:16,maxTextureSize:16384});
 assert.equal(p.tier,'high');assert.equal(p.shadows,true);assert.equal(p.fpsCap,60);assert.ok(p.watercolorStrength>=1.25&&p.pencilStrength>=1.2);
});
test('frame gate respects configured cadence, rejects invalid times and resets safely',()=>{
 const gate=profiles.createFrameGate(30);
 assert.ok(Math.abs(gate.intervalMs-1000/30)<1e-9);
 assert.equal(gate.shouldRender(0),true);
 assert.equal(gate.shouldRender(16),false);
 assert.equal(gate.shouldRender(33.34),true);
 assert.equal(gate.shouldRender(NaN),false);
 gate.reset();assert.equal(gate.shouldRender(5),true);
 assert.throws(()=>profiles.createFrameGate(0),/Frame cap/);
});
test('browser capability adapter recognizes coarse pointer, data saver and hardware fields',()=>{
 const c=profiles.browserCapabilities({hardwareConcurrency:4,deviceMemory:3,maxTouchPoints:5,userAgent:'Android Mobile',connection:{saveData:true}},true,2048,false);
 assert.equal(c.mobile,true);assert.equal(c.saveData,true);assert.equal(c.hardwareConcurrency,4);
 assert.equal(profiles.select(c).tier,'low');
});
test('recognizes iPadOS Safari in desktop mode through MacIntel and touch points',()=>{
 const ipad=profiles.browserCapabilities({
  platform:'MacIntel',maxTouchPoints:5,userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
  hardwareConcurrency:8,deviceMemory:8
 },false,4096,false);
 assert.equal(ipad.mobile,true);
 assert.equal(profiles.select(ipad).tier,'balanced');
});
console.log('Three.js performance profile tests complete.');
