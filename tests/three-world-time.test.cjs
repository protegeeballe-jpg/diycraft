'use strict';
const assert=require('node:assert/strict');
globalThis.DIYCraftThreeWorldProtection=require('../js/three-world-protection.js');
const time=require('../js/three-world-time.js');
function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\\n'+(error.stack||error));process.exitCode=1;}
}
const original={
 day:{sky:['#759fb4','#b9c9b3','#8ca574'],ground:'#66894f',sun:'#e9d19a'},
 sunset:{sky:['#80536b','#b97461','#a77c62'],ground:'#76684d',sun:'#dfa96c',overlay:'rgba(83,48,43,.10)'},
 night:{sky:['#101a30','#202e47','#3d4d59'],ground:'#39483d',overlay:'rgba(4,8,18,.28)'}
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
