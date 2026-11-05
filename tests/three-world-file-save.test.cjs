'use strict';
const assert=require('node:assert/strict');
const file=require('../js/three-world-file-save.js');
async function main(){
 const world={version:1,name:'My Peaceful World',player:{x:1.25,y:0,z:-2.5,yaw:0,pitch:0},
  blocks:Array.from({length:420},(_,i)=>({x:i%30,y:0,z:Math.floor(i/30),type:i%2?'grass':'stone'})),
  animals:[{id:'pip',species:'sheep',x:2,z:3}],artworks:[{name:'Flowers',data:'data:image/png;base64,AAAAAA=='}]};
 const encoded=await file.encode(world);
 assert.ok(encoded.bytes instanceof Uint8Array);assert.ok(encoded.bytes.byteLength<=file.MAX_FILE);
 assert.equal(file.isDiycraftFile(encoded.bytes),true);
 assert.deepEqual(JSON.parse(await file.decode(encoded.bytes)),world);
 assert.ok(['raw','gzip'].includes(encoded.format));
 console.log('PASS compressed .diycraft round-trip ('+encoded.format+', '+encoded.bytes.byteLength+' bytes)');
 const corrupt=encoded.bytes.slice();corrupt[corrupt.length-1]^=0xff;
 await assert.rejects(()=>file.decode(corrupt),/integrity check|expanded world length/i);
 console.log('PASS corrupt file rejected before restore');
 const badMagic=encoded.bytes.slice();badMagic[0]=0;
 await assert.rejects(()=>file.decode(badMagic),/not a recognized/i);
 const badVersion=encoded.bytes.slice();badVersion[8]=99;
 await assert.rejects(()=>file.decode(badVersion),/unsupported save version/i);
 await assert.rejects(()=>file.decode(encoded.bytes.slice(0,-1)),/header is invalid|integrity check|length/i);
 const oversized=encoded.bytes.slice();new DataView(oversized.buffer).setUint32(12,file.MAX_WORLD+1,true);
 await assert.rejects(()=>file.decode(oversized),/safety limits/i);
 console.log('PASS invalid signatures, versions, truncation and expanded-size limits rejected');
}
main().catch(error=>{console.error(error);process.exitCode=1;});