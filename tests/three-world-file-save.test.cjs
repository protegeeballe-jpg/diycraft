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
 await assert.rejects(()=>file.decode(corrupt),/integrity check|expanded world length|compressed payload is corrupt/i);
 console.log('PASS corrupt file rejected before restore');
 const badMagic=encoded.bytes.slice();badMagic[0]=0;
 await assert.rejects(()=>file.decode(badMagic),/not a recognized/i);
 const badVersion=encoded.bytes.slice();badVersion[8]=99;
 await assert.rejects(()=>file.decode(badVersion),/unsupported save version/i);
 await assert.rejects(()=>file.decode(encoded.bytes.slice(0,-1)),/header is invalid|integrity check|length/i);
 const oversized=encoded.bytes.slice();new DataView(oversized.buffer).setUint32(12,file.MAX_WORLD+1,true);
 await assert.rejects(()=>file.decode(oversized),/safety limits/i);
 console.log('PASS invalid signatures, versions, truncation and expanded-size limits rejected');

 // Exercise the actual IndexedDB handle adapter and file-writer contract.
 const handleStore=new Map();
 global.indexedDB={
  open(){
   const request={};
   const database={
    objectStoreNames:{contains:()=>true},
    transaction(){
     const tx={
      objectStore(){
       return {
        get(key){const req={result:handleStore.get(key)};queueMicrotask(()=>tx.oncomplete?.());return req;},
        put(value,key){const req={result:key};handleStore.set(key,value);queueMicrotask(()=>tx.oncomplete?.());return req;},
        delete(key){const req={result:undefined};handleStore.delete(key);queueMicrotask(()=>tx.oncomplete?.());return req;}
       };
      },
      abort(){}
     };
     return tx;
    },
    close(){}
   };
   queueMicrotask(()=>{request.result=database;request.onsuccess?.();});
   return request;
  }
 };
 let storedBytes=new Uint8Array(0),permissionState='granted',failNextWrite=false,writeCount=0;
 const handle={
  kind:'file',name:'MyWorld.diycraft',
  async queryPermission({mode}){return permissionState;},
  async requestPermission({mode}){permissionState='granted';return 'granted';},
  async getFile(){return new File([storedBytes],'MyWorld.diycraft',{type:'application/vnd.diycraft.world'});},
  async createWritable(){
   let staged=null;
   return {
    async write(bytes){if(failNextWrite){failNextWrite=false;throw new Error('simulated disk write failure');}staged=new Uint8Array(bytes);},
    async close(){if(!staged)throw new Error('no staged write');storedBytes=staged;writeCount++;},
    async abort(){staged=null;}
   };
  }
 };
 await file.rememberHandle(handle);
 assert.equal(await file.getRememberedHandle(),handle,'The selected file handle must be remembered.');
 console.log('PASS device file handle is remembered');
 const firstWorld={version:1,name:'File save test',blocks:[],player:{x:1,y:0,z:2,yaw:0,pitch:0}};
 const firstWrite=await file.writeHandle(handle,firstWorld);
 assert.equal(firstWrite.saved,true);
 assert.deepEqual(JSON.parse(await file.readHandle(handle)),firstWorld);
 assert.equal(writeCount,1);
 console.log('PASS actual file write and reopen round-trip');
 permissionState='prompt';
 const pendingAccess=await file.loadRemembered();
 assert.equal(pendingAccess.status,'permission-required','Permission revocation must not be mistaken for a missing file.');
 assert.equal(await file.permission(handle,'readwrite',true),true,'Reconnect must request permission after a user gesture.');
 const reopened=await file.loadRemembered();
 assert.equal(reopened.status,'loaded');
 assert.deepEqual(JSON.parse(reopened.worldText),firstWorld);
 console.log('PASS permission renewal reopens the latest saved world');
 const beforeFailedWrite=storedBytes.slice();
 failNextWrite=true;
 await assert.rejects(()=>file.writeHandle(handle,{...firstWorld,name:'Must not replace prior file'}),/simulated disk write failure/);
 assert.deepEqual(storedBytes,beforeFailedWrite,'A failed staged write must not replace the existing file.');
 assert.deepEqual(JSON.parse(await file.readHandle(handle)),firstWorld);
 console.log('PASS failed device write preserves the previous file contents');
 await file.forgetHandle();
 assert.equal(await file.getRememberedHandle(),undefined);
 assert.equal((await file.loadRemembered()).status,'missing');
 console.log('PASS cleared handle metadata can be relinked without deleting the device file');
 await file.rememberHandle(handle);
 assert.equal((await file.loadRemembered()).status,'loaded');
 console.log('PASS existing device file is recoverable after handle metadata is cleared');

}
main().catch(error=>{console.error(error);process.exitCode=1;});