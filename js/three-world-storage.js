/* Version-1 DIYCraft local save bridge for the Three.js renderer.
   Reads and writes the original JSON schema through the validated world adapter.
   This is the only Three.js runtime module permitted to write game storage. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeWorldStorage=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const STORE_KEY='diycraft_peaceful_voxel_v1',GZIP_PREFIX='DIYCraft:gzip:v1:';
 const MAX_COMPRESSED_BYTES=24*1024*1024,MAX_UNCOMPRESSED_BYTES=32*1024*1024,MAX_BACKUP_BYTES=24*1024*1024;
 function requireAdapter(adapter){
  if(!adapter||typeof adapter.createSnapshot!=='function'||typeof adapter.toSavedWorld!=='function')
   throw new TypeError('The validated DIYCraft world adapter is required.');
 }
 function byteLength(value){return new TextEncoder().encode(value).byteLength;}
 function bytesToBase64(bytes){
  let binary='';
  for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
  return btoa(binary);
 }
 function base64ToBytes(value){
  if(typeof value!=='string'||!value||value.length>Math.ceil(MAX_COMPRESSED_BYTES*4/3)+4||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
   throw new TypeError('The saved-world compression payload is invalid or too large.');
  const binary=atob(value),bytes=new Uint8Array(binary.length);
  if(bytes.byteLength>MAX_COMPRESSED_BYTES)throw new RangeError('Compressed world exceeds the 24 MB safety limit.');
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
 }
 async function readBoundedStream(stream,limit){
  const reader=stream.getReader(),chunks=[];let total=0;
  try{
   while(true){
    const part=await reader.read();if(part.done)break;
    total+=part.value.byteLength;
    if(total>limit){try{await reader.cancel();}catch(error){}throw new RangeError('Expanded world exceeds the configured safety limit.');}
    chunks.push(part.value);
   }
  }finally{reader.releaseLock();}
  const output=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.byteLength;}
  return output;
 }
 async function decode(value){
  if(typeof value!=='string'||!value)throw new TypeError('The saved DIYCraft world is empty or invalid.');
  if(value.startsWith(GZIP_PREFIX)){
   if(typeof DecompressionStream!=='function')throw new Error('This browser cannot decompress the existing DIYCraft save.');
   const compressed=base64ToBytes(value.slice(GZIP_PREFIX.length));
   const expanded=await readBoundedStream(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')),MAX_UNCOMPRESSED_BYTES);
   return new TextDecoder('utf-8',{fatal:true}).decode(expanded);
  }
  if(byteLength(value)>MAX_UNCOMPRESSED_BYTES)throw new RangeError('Saved world exceeds the 32 MB safety limit.');
  return value;
 }
 async function encode(savedWorld){
  const json=JSON.stringify(savedWorld);
  if(typeof json!=='string')throw new TypeError('The DIYCraft world could not be serialized.');
  const rawBytes=byteLength(json);
  if(rawBytes>MAX_UNCOMPRESSED_BYTES)throw new RangeError('Saved world exceeds the 32 MB safety limit.');
  if(typeof CompressionStream!=='function'||typeof DecompressionStream!=='function')return Object.freeze({value:json,format:'json',bytes:rawBytes});
  try{
   const compressed=await readBoundedStream(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')),MAX_COMPRESSED_BYTES);
   if(compressed.byteLength>0&&compressed.byteLength<rawBytes)
    return Object.freeze({value:GZIP_PREFIX+bytesToBase64(compressed),format:'gzip',bytes:compressed.byteLength});
  }catch(error){
   // Compression is optional; use the original JSON whenever it is safer or smaller.
  }
  return Object.freeze({value:json,format:'json',bytes:rawBytes});
 }
 function parseWorld(raw,adapter){
  requireAdapter(adapter);
  const parsed=JSON.parse(raw);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Array.isArray(parsed.blocks)||
     !parsed.player||typeof parsed.player!=='object'||Array.isArray(parsed.player))
   throw new TypeError('Choose a valid version-1 DIYCraft world.');
  const snapshot=adapter.createSnapshot(parsed);
  return {snapshot,savedWorld:adapter.toSavedWorld(snapshot)};
 }
 function fallbackResult(fallbackWorld,adapter,source,error){
  return Object.freeze({snapshot:adapter.createSnapshot(fallbackWorld),source,
   storageReadFailed:source==='recovery-required'||source==='unavailable',
   error:error?String(error.message||error).slice(0,240):''});
 }
 async function load(storage,adapter,fallbackWorld){
  requireAdapter(adapter);let stored;
  try{
   if(!storage||typeof storage.getItem!=='function')throw new TypeError('Browser storage is unavailable.');
   stored=storage.getItem(STORE_KEY);
  }catch(error){return fallbackResult(fallbackWorld,adapter,'unavailable',error);}
  if(stored===null||stored===undefined||stored==='')return fallbackResult(fallbackWorld,adapter,'starter',null);
  try{
   const parsed=parseWorld(await decode(stored),adapter);
   return Object.freeze({snapshot:parsed.snapshot,source:'device',storageReadFailed:false,error:''});
  }catch(error){
   // Never delete or replace an unreadable existing save during startup.
   return fallbackResult(fallbackWorld,adapter,'recovery-required',error);
  }
 }
 async function save(storage,adapter,snapshot,options={}){
  requireAdapter(adapter);
  if(options.storageReadFailed)return Object.freeze({saved:false,protected:true,reason:'The existing saved world is protected until a valid backup is restored.'});
  try{
   if(!storage||typeof storage.setItem!=='function')throw new TypeError('Browser storage is unavailable.');
   const encoded=await encode(adapter.toSavedWorld(snapshot));
   // A newer queued save or page-exit flush can supersede this asynchronous compression.
   // Check immediately before the only write so an older snapshot can never win a race.
   if(typeof options.isCurrent==='function'&&!options.isCurrent())
    return Object.freeze({saved:false,protected:false,superseded:true,reason:'A newer world snapshot replaced this save.'});
   storage.setItem(STORE_KEY,encoded.value);
   return Object.freeze({saved:true,protected:false,superseded:false,format:encoded.format,bytes:encoded.bytes});
  }catch(error){return Object.freeze({saved:false,protected:false,reason:String(error.message||error).slice(0,240)});}
 }
 function saveSync(storage,adapter,snapshot,options={}){
  requireAdapter(adapter);
  if(options.storageReadFailed)return Object.freeze({saved:false,protected:true,reason:'The existing saved world is protected until a valid backup is restored.'});
  try{
   if(!storage||typeof storage.setItem!=='function')throw new TypeError('Browser storage is unavailable.');
   const json=JSON.stringify(adapter.toSavedWorld(snapshot));
   if(typeof json!=='string')throw new TypeError('The DIYCraft world could not be serialized.');
   const bytes=byteLength(json);
   if(bytes>MAX_UNCOMPRESSED_BYTES)throw new RangeError('Saved world exceeds the 32 MB safety limit.');
   storage.setItem(STORE_KEY,json);
   return Object.freeze({saved:true,protected:false,format:'json',bytes});
  }catch(error){return Object.freeze({saved:false,protected:false,reason:String(error.message||error).slice(0,240)});}
 }
 async function restore(storage,adapter,backupText){
  requireAdapter(adapter);
  try{
   if(typeof backupText!=='string'||byteLength(backupText)>MAX_UNCOMPRESSED_BYTES)throw new RangeError('Expanded backup must be text no larger than 32 MB.');
   const parsed=parseWorld(await decode(backupText),adapter),encoded=await encode(parsed.savedWorld);
   if(!storage||typeof storage.setItem!=='function')throw new TypeError('Browser storage is unavailable.');
   // Validate and serialize fully before replacing the existing key.
   storage.setItem(STORE_KEY,encoded.value);
   return Object.freeze({restored:true,snapshot:parsed.snapshot,format:encoded.format,error:''});
  }catch(error){return Object.freeze({restored:false,snapshot:null,format:'',error:String(error.message||error).slice(0,240)});}
 }
 return Object.freeze({STORE_KEY,GZIP_PREFIX,MAX_COMPRESSED_BYTES,MAX_UNCOMPRESSED_BYTES,MAX_BACKUP_BYTES,decode,encode,load,save,saveSync,restore});
});
