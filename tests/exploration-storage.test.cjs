'use strict';
const assert=require('node:assert/strict');
const state=require('../js/exploration-state.js');
const storage=require('../js/exploration-storage.js');

function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
class FakeRequest{constructor(){this.result=undefined;this.error=null;this.onsuccess=null;this.onerror=null;}}
class FakeTransaction{
 constructor(database,storeName,mode){
  this.database=database;this.storeName=storeName;this.mode=mode;this.pending=0;this.aborted=false;this.finished=false;
  const original=database.state.stores.get(storeName);
  this.working=mode==='readwrite'?new Map(original):original;
  this.error=null;this.oncomplete=null;this.onabort=null;this.onerror=null;
 }
 objectStore(name){
  assert.equal(name,this.storeName);
  return {
   get:key=>this.request(()=>clone(this.working.get(key))),
   put:(value,key)=>{
    if(this.mode!=='readwrite')throw new Error('Readonly transaction cannot write.');
    return this.request(()=>{this.working.set(key,clone(value));return key;});
   }
  };
 }
 request(operation){
  const request=new FakeRequest();this.pending++;
  queueMicrotask(()=>{
   if(this.aborted)return;
   try{request.result=operation();if(typeof request.onsuccess==='function')request.onsuccess();}
   catch(error){request.error=error;this.error=error;if(typeof request.onerror==='function')request.onerror();this.abort();return;}
   this.pending--;this.maybeComplete();
  });
  return request;
 }
 maybeComplete(){
  if(this.aborted||this.finished||this.pending!==0)return;
  this.finished=true;
  if(this.mode==='readwrite')this.database.state.stores.set(this.storeName,this.working);
  queueMicrotask(()=>{if(typeof this.oncomplete==='function')this.oncomplete();});
 }
 abort(){
  if(this.aborted||this.finished)return;
  this.aborted=true;this.error=this.error||new Error('Transaction aborted.');
  queueMicrotask(()=>{if(typeof this.onabort==='function')this.onabort();});
 }
}
class FakeDatabase{
 constructor(state){this.state=state;this.objectStoreNames={contains:name=>this.state.stores.has(name)};this.onversionchange=null;}
 createObjectStore(name){if(this.state.stores.has(name))throw new Error('Store already exists.');this.state.stores.set(name,new Map());return {};}
 transaction(name,mode){if(!this.state.stores.has(name))throw new Error('Missing object store: '+name);return new FakeTransaction(this,name,mode);}
 close(){}
}
class FakeIndexedDB{
 constructor(){this.databases=new Map();}
 open(name,version){
  const request=new FakeRequest();
  queueMicrotask(()=>{
   let database=this.databases.get(name);
   const isNew=!database;
   if(!database){database={version,stores:new Map()};this.databases.set(name,database);}
   request.result=new FakeDatabase(database);
   if(isNew&&typeof request.onupgradeneeded==='function')request.onupgradeneeded();
   if(typeof request.onsuccess==='function')request.onsuccess();
  });
  return request;
 }
 seed(name,storeName,key,value){
  let database=this.databases.get(name);
  if(!database){database={version:1,stores:new Map()};this.databases.set(name,database);}
  if(!database.stores.has(storeName))database.stores.set(storeName,new Map());
  database.stores.get(storeName).set(key,clone(value));
 }
 record(name,storeName,key){return clone(this.databases.get(name).stores.get(storeName).get(key));}
}

(async()=>{
 const indexedDB=new FakeIndexedDB();let clock=1000;
 const store=storage.createStore({indexedDB,clock:()=>clock++});
 const first=await store.load();
 assert.equal(first.status,'new');
 assert.equal(first.protected,false);
 assert.equal(first.save.player.vitality,10);

 const stocked=state.addItems(first.save,'apple',2).save;
 const hurt=state.applyDamage(stocked,2).save;
 const saved=await store.save(hurt);
 assert.equal(saved.saved,true);
 assert.equal(saved.revision,2);
 const loaded=await store.load();
 assert.equal(loaded.status,'saved');
 assert.equal(loaded.save.player.vitality,8);
 assert.equal(loaded.save.player.backpack.apple,2);
 assert.equal(loaded.save.updatedAt,1000);

 const sameSnapshot=await store.save(hurt);
 assert.equal(sameSnapshot.saved,true,'Repeated persistence of the same revision and same data must be idempotent.');
 const stale=await store.save(first.save);
 assert.equal(stale.saved,false,'A stale snapshot must not overwrite a newer revision.');
 assert.match(stale.reason,/newer save/);
 assert.equal((await store.load()).save.revision,2);

 const backup=await store.exportBackup();
 const parsedBackup=JSON.parse(backup);
 assert.equal(parsedBackup.format,'the-exploration-backup');
 assert.equal(parsedBackup.save.player.vitality,8);
 assert.notEqual(storage.DATABASE_NAME,'diycraft_peaceful_voxel_v1');

 const badBackup=await store.importBackup('{"format":"wrong"}');
 assert.equal(badBackup.restored,false);
 assert.equal((await store.load()).save.player.vitality,8,'An invalid backup must not alter the current save.');

 const corruptIdb=new FakeIndexedDB();
 corruptIdb.seed(storage.DATABASE_NAME,storage.STORE_NAME,storage.PRIMARY_KEY,{
  format:'the-exploration-save',formatVersion:1,save:{schema:'the-exploration',schemaVersion:999}
 });
 const recoveryStore=storage.createStore({indexedDB:corruptIdb,clock:()=>5000});
 const recovery=await recoveryStore.load();
 assert.equal(recovery.status,'recovery-required');
 assert.equal(recovery.protected,true);
 const blocked=await recoveryStore.save(state.createStarterSave());
 assert.equal(blocked.saved,false);
 assert.equal(blocked.protected,true);
 assert.equal(corruptIdb.record(storage.DATABASE_NAME,storage.STORE_NAME,storage.PRIMARY_KEY).save.schemaVersion,999,
  'An unsupported save must be preserved instead of silently replaced.');
 const raw=await recoveryStore.exportRawRecovery();
 assert.match(raw,/999/);
 const restored=await recoveryStore.importBackup(backup);
 assert.equal(restored.restored,true);
 assert.equal((await recoveryStore.load()).save.player.vitality,8);

 const unavailable=storage.createStore({indexedDB:null});
 const unavailableResult=await unavailable.load();
 assert.equal(unavailableResult.status,'unavailable');
 assert.equal(unavailableResult.protected,true);
 console.log('The Exploration IndexedDB isolation, atomic-save, revision and recovery tests passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});