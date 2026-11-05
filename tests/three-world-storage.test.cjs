'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const adapter=require('../js/three-world-adapter.js');
const storageApi=require('../js/three-world-storage.js');
function freshWorld(){
 const source=fs.readFileSync('diycraft.js','utf8'),start=source.indexOf('function freshWorld(){');
 const marker='\n}\n\nfunction validHex',end=source.indexOf(marker,start);
 assert.ok(start>=0&&end>start,'The actual DIYCraft freshWorld() must be available for save migration tests.');
 return new Function('emptySlots','return ('+source.slice(start,end+2)+');')(()=>Array.from({length:60},()=>null))();
}
function makeStorage(initial=null){
 const values=new Map();if(initial!==null)values.set(storageApi.STORE_KEY,initial);
 return {getItem(key){return values.has(key)?values.get(key):null;},setItem(key,value){values.set(key,String(value));},inspect(){return values.get(storageApi.STORE_KEY)||null;}};
}
(async()=>{
 const fresh=freshWorld();fresh.name='Painterly home';
 fresh.animals=[{id:'saved-pet-1',species:'cat',name:'Mittens',x:4.5,z:-2.5,facing:.4,phase:1.2,body:'#c5c0b6',accent:'#d0b6a0'}];
 fresh.animalCare={'saved-pet-1':7,sheep:3};fresh.artworks=[{name:'Garden',data:'data:image/png;base64,iVBORw0KGgo='}];
 const snapshot=adapter.createSnapshot(fresh),empty=makeStorage();
 const initial=await storageApi.load(empty,adapter,fresh);
 assert.equal(initial.source,'starter');assert.equal(initial.storageReadFailed,false);assert.equal(initial.snapshot.name,'Painterly home');
 const existing=makeStorage(JSON.stringify(fresh)),before=JSON.stringify(fresh);
 const loaded=await storageApi.load(existing,adapter,freshWorld());
 assert.equal(loaded.source,'device');assert.equal(loaded.snapshot.name,'Painterly home');
 assert.equal(loaded.snapshot.animals[0].id,'saved-pet-1');assert.equal(JSON.stringify(fresh),before);
 const saved=await storageApi.save(empty,adapter,snapshot);assert.equal(saved.saved,true);
 const decoded=JSON.parse(await storageApi.decode(empty.inspect()));
 assert.equal(decoded.name,'Painterly home');assert.equal(decoded.animals[0].id,'saved-pet-1');
 assert.equal(decoded.animalCare['saved-pet-1'],7);
 assert.ok(!('source' in decoded));assert.ok(!('counts' in decoded));assert.ok(!('savedFields' in decoded));
 const reloaded=await storageApi.load(empty,adapter,freshWorld());
 assert.equal(reloaded.source,'device');assert.equal(reloaded.snapshot.counts.animals,1);assert.equal(reloaded.snapshot.artworks.length,1);
 if(typeof CompressionStream==='function'&&typeof DecompressionStream==='function'){
  const compressed=await storageApi.encode(fresh);assert.equal(compressed.format,'gzip');
  const compressedLoad=await storageApi.load(makeStorage(compressed.value),adapter,freshWorld());
  assert.equal(compressedLoad.source,'device');assert.equal(compressedLoad.snapshot.name,'Painterly home');
 }
 const corruptValue='DIYCraft:gzip:v1:not-valid-base64',corruptStorage=makeStorage(corruptValue);
 const damaged=await storageApi.load(corruptStorage,adapter,freshWorld());
 assert.equal(damaged.source,'recovery-required');assert.equal(damaged.storageReadFailed,true);assert.equal(corruptStorage.inspect(),corruptValue);
 const blocked=await storageApi.save(corruptStorage,adapter,snapshot,{storageReadFailed:damaged.storageReadFailed});
 assert.equal(blocked.saved,false);assert.equal(blocked.protected,true);assert.equal(corruptStorage.inspect(),corruptValue);
 const restoreStorage=makeStorage(corruptValue),restored=await storageApi.restore(restoreStorage,adapter,JSON.stringify(fresh));
 assert.equal(restored.restored,true);assert.equal(restored.snapshot.name,'Painterly home');
 assert.equal((await storageApi.load(restoreStorage,adapter,freshWorld())).source,'device');
 const corruptBefore=restoreStorage.inspect(),failedRestore=await storageApi.restore(restoreStorage,adapter,'{"blocks":');
 assert.equal(failedRestore.restored,false);assert.equal(restoreStorage.inspect(),corruptBefore);
 const quota={getItem(){return null;},setItem(){throw new Error('quota exceeded');}};
 const failedSave=await storageApi.save(quota,adapter,snapshot);assert.equal(failedSave.saved,false);assert.match(failedSave.reason,/quota exceeded/);
 const denied={getItem(){throw new Error('storage denied');}};
 const unavailable=await storageApi.load(denied,adapter,freshWorld());
 assert.equal(unavailable.source,'unavailable');assert.equal(unavailable.storageReadFailed,true);
 const pagehideStorage=makeStorage();
 const syncSaved=storageApi.saveSync(pagehideStorage,adapter,snapshot);
 assert.equal(syncSaved.saved,true);
 assert.equal(syncSaved.format,'json');
 assert.equal(JSON.parse(pagehideStorage.inspect()).name,'Painterly home');
 const syncBlocked=storageApi.saveSync(corruptStorage,adapter,snapshot,{storageReadFailed:true});
 assert.equal(syncBlocked.saved,false);assert.equal(syncBlocked.protected,true);
 console.log('Three.js world storage bridge tests complete.');
})().catch(error=>{console.error(error);process.exitCode=1;});
