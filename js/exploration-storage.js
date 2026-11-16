/* IndexedDB persistence for The Exploration. Separate namespace; never touches DIYCraft saves. */
(function(root,factory){
 'use strict';
 const state=root&&root.TheExplorationState;
 const api=factory(state);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.TheExplorationStorage=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(state){
 'use strict';
 if(!state)throw new Error('Load exploration-state.js before exploration-storage.js.');
 const DATABASE_NAME='the-exploration-local-v1',DATABASE_VERSION=1,STORE_NAME='saves',PRIMARY_KEY='primary';
 const RECORD_FORMAT='the-exploration-save',BACKUP_FORMAT='the-exploration-backup';
 function asMessage(error){return String(error&&error.message||error||'Unknown storage error').slice(0,240);}
 function makeError(message){return new Error(message);}
 function isRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
 function serializeBackup(save,clock){
  const clean=state.validateSave(save);
  return JSON.stringify({format:BACKUP_FORMAT,formatVersion:1,exportedAt:clock(),save:clean});
 }
 function createStore(options){
  const settings=options||{};
  const indexedDBApi=owns(settings,'indexedDB')?settings.indexedDB:(typeof globalThis!=='undefined'?globalThis.indexedDB:null);
  const clock=typeof settings.clock==='function'?settings.clock:()=>Date.now();
  let recoveryRequired=false;
  function owns(value,key){return Object.prototype.hasOwnProperty.call(value,key);}
  function openDatabase(){
   return new Promise((resolve,reject)=>{
    if(!indexedDBApi||typeof indexedDBApi.open!=='function')return reject(makeError('IndexedDB is unavailable in this browser.'));
    let request;
    try{request=indexedDBApi.open(DATABASE_NAME,DATABASE_VERSION);}catch(error){reject(error);return;}
    let settled=false;
    request.onupgradeneeded=()=>{
     try{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME);
     }catch(error){try{request.transaction.abort();}catch(abortError){}if(!settled){settled=true;reject(error);}}
    };
    request.onsuccess=()=>{
     const db=request.result;
     if(settled){try{db.close();}catch(error){}return;}
     settled=true;
     db.onversionchange=()=>{try{db.close();}catch(error){}};
     resolve(db);
    };
    request.onerror=()=>{if(!settled){settled=true;reject(request.error||makeError('Could not open the local save database.'));}};
    request.onblocked=()=>{if(!settled){settled=true;reject(makeError('The local save database is busy in another tab. Close the other game tab and try again.'));}};
   });
  }
  async function readRecord(){
   const db=await openDatabase();
   return new Promise((resolve,reject)=>{
    let transaction;
    try{transaction=db.transaction(STORE_NAME,'readonly');}catch(error){db.close();reject(error);return;}
    let value,requestError=null;
    const request=transaction.objectStore(STORE_NAME).get(PRIMARY_KEY);
    request.onsuccess=()=>{value=request.result;};
    request.onerror=()=>{requestError=request.error||makeError('Could not read the local save.');};
    transaction.oncomplete=()=>{db.close();if(requestError)reject(requestError);else resolve(value);};
    transaction.onabort=()=>{db.close();reject(requestError||transaction.error||makeError('The local save read was interrupted.'));};
    transaction.onerror=()=>{};
   });
  }
  function validateRecord(record){
   if(!isRecord(record)||record.format!==RECORD_FORMAT||record.formatVersion!==1)
    throw makeError('The stored save format is unsupported.');
   return state.validateSave(record.save);
  }
  async function writeRecord(nextRecord,allowRecoveryReplace){
   const db=await openDatabase();
   return new Promise((resolve,reject)=>{
    let transaction,settled=false,pendingError=null,writeResult=null;
    const finishError=error=>{if(settled)return;settled=true;db.close();reject(error);};
    try{transaction=db.transaction(STORE_NAME,'readwrite');}
    catch(error){db.close();reject(error);return;}
    const store=transaction.objectStore(STORE_NAME);
    const request=store.get(PRIMARY_KEY);
    request.onsuccess=()=>{
     if(settled)return;
     try{
      const current=request.result;
      if(current!==undefined&&!allowRecoveryReplace){
       let currentSave;
       try{currentSave=validateRecord(current);}
       catch(error){recoveryRequired=true;throw makeError('An unreadable save is protected. Export its recovery copy or import a valid backup before replacing it.');}
       const nextSave=nextRecord.save;
       const comparableNext={...nextSave,updatedAt:0};
       const comparableCurrent={...currentSave,updatedAt:0};
       if(nextSave.revision<currentSave.revision)
        throw makeError('A newer save already exists. Reload the latest saved world before saving again.');
       if(nextSave.revision===currentSave.revision&&JSON.stringify(comparableNext)!==JSON.stringify(comparableCurrent))
        throw makeError('This save conflicts with another change made at the same revision. Reload before saving.');
      }
      const put=store.put(nextRecord,PRIMARY_KEY);
      put.onerror=()=>{pendingError=put.error||makeError('The local save could not be written.');};
      writeResult={saved:true,revision:nextRecord.save.revision};
     }catch(error){pendingError=error;try{transaction.abort();}catch(abortError){finishError(error);}}
    };
    request.onerror=()=>{pendingError=request.error||makeError('Could not verify the current local save.');try{transaction.abort();}catch(error){finishError(pendingError);}};
    transaction.oncomplete=()=>{
     if(settled)return;settled=true;db.close();
     if(pendingError)reject(pendingError);else resolve(writeResult);
    };
    transaction.onabort=()=>finishError(pendingError||transaction.error||makeError('The local save transaction was interrupted.'));
    transaction.onerror=()=>{};
   });
  }
  function makeRecord(save){return {format:RECORD_FORMAT,formatVersion:1,save:state.validateSave(save)};}
  async function load(){
   try{
    const record=await readRecord();
    if(record===undefined){recoveryRequired=false;return Object.freeze({status:'new',save:state.createStarterSave(),protected:false,error:''});}
    try{
     const save=validateRecord(record);recoveryRequired=false;
     return Object.freeze({status:'saved',save,protected:false,error:''});
    }catch(error){recoveryRequired=true;return Object.freeze({status:'recovery-required',save:null,protected:true,error:asMessage(error)});}
   }catch(error){recoveryRequired=true;return Object.freeze({status:'unavailable',save:null,protected:true,error:asMessage(error)});}
  }
  async function save(save){
   if(recoveryRequired)return Object.freeze({saved:false,protected:true,reason:'The existing save is protected until a valid backup is restored.'});
   try{
    const clean=state.validateSave(save);
    const timestamp=clock();
    if(!Number.isSafeInteger(timestamp)||timestamp<0)throw makeError('The device clock returned an invalid timestamp.');
    clean.updatedAt=timestamp;
    const result=await writeRecord(makeRecord(clean),false);
    recoveryRequired=false;
    return Object.freeze({saved:true,protected:false,revision:result.revision,reason:''});
   }catch(error){
    const reason=asMessage(error);
    if(/unreadable save|unsupported|invalid/i.test(reason))recoveryRequired=true;
    return Object.freeze({saved:false,protected:recoveryRequired,reason});
   }
  }
  async function exportBackup(){
   const loaded=await load();
   if(loaded.status!=='saved'&&loaded.status!=='new')throw makeError(loaded.error||'There is no valid save to export.');
   return serializeBackup(loaded.save,clock);
  }
  async function exportRawRecovery(){
   const record=await readRecord();
   if(record===undefined)return '';
   return JSON.stringify({format:'the-exploration-recovery-copy',formatVersion:1,record});
  }
  async function importBackup(text){
   let backup;
   try{
    if(typeof text!=='string'||text.length>8*1024*1024)throw new RangeError('Backup must be text no larger than 8 MB.');
    backup=JSON.parse(text);
    if(!isRecord(backup)||backup.format!==BACKUP_FORMAT||backup.formatVersion!==1)
     throw makeError('Choose a supported The Exploration backup file.');
    const clean=state.validateSave(backup.save);
    const timestamp=clock();
    if(!Number.isSafeInteger(timestamp)||timestamp<0)throw makeError('The device clock returned an invalid timestamp.');
    clean.updatedAt=timestamp;
    const result=await writeRecord(makeRecord(clean),true);
    recoveryRequired=false;
    return Object.freeze({restored:true,revision:result.revision,error:''});
   }catch(error){return Object.freeze({restored:false,revision:null,error:asMessage(error)});}
  }
  return Object.freeze({load,save,exportBackup,exportRawRecovery,importBackup});
 }
 return Object.freeze({DATABASE_NAME,DATABASE_VERSION,STORE_NAME,PRIMARY_KEY,createStore});
});