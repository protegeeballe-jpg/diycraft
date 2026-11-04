'use strict';
const assert=require('node:assert/strict');
globalThis.DIYCraftThreeWorldProtection=require('../js/three-world-protection.js');
const time=require('../js/three-world-time.js');
function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\\n'+(error.stack||error));process.exitCode=1;}
}
const original={
 day:{sky:['#8fc6e2','#d8e9d2','#b3d39a'],ground:'#80bd65',sun:'#fff2bc'},
 sunset:{sky:['#a66e82','#e7a07e','#d7a77f'],ground:'#9a8967',sun:'#ffcb83',overlay:'rgba(255,123,79,.07)'},
 night:{sky:['#14213d','#263858','#52606e'],ground:'#465848',overlay:'rgba(8,14,37,.24)'}
};
test('keeps exact original day, sunset and night watercolor palette values',()=>{
 for(const mode of Object.keys(original)){
  const actual=time.getPalette(mode,0),{mode:actualMode,...palette}=actual;
  assert.equal(actualMode,mode);
  assert.deepEqual(palette,original[mode]);
  assert.ok(Object.isFrozen(actual));
  assert.ok(Object.isFrozen(actual.sky));
 }
});
test('follows the original automatic cycle boundaries exactly',()=>{
 const samples=[[0,'day'],[98.999,'day'],[99,'sunset'],[122.399,'sunset'],[122.5,'night'],[179.999,'night'],[180,'day'],[279,'sunset'],[302.5,'night']];
 for(const [seconds,mode] of samples)assert.equal(time.getPalette('auto',seconds).mode,mode);
});
test('rejects non-finite animation time without changing palette definitions',()=>{
 for(const value of [NaN,Infinity,-Infinity,'1',null])assert.throws(()=>time.getPalette('day',value),/finite number/);
 assert.deepEqual(time.PALETTES.day.sky,original.day.sky);
});
console.log('Three.js world-time palette tests complete.');
