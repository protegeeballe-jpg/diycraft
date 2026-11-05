/* Actual device-file saves for DIYCraft.
   The selected .diycraft file contains the world. IndexedDB stores only its file handle. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftDeviceWorldFile=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const MAGIC=Uint8Array.from([68,73,89,67,82,65,70,84]),HEADER=24,VERSION=1;
 const MAX_FILE=24*1024*1024,MAX_WORLD=32*1024*1024;
 const CODEC_RAW=0,CODEC_GZIP=1,DB='diycraft-device-files-v1',STORE='handles',KEY='primary';
 const encoder=new TextEncoder();
 function crc32(bytes){
  let c=0xffffffff;
  for(let i=0;i<bytes.length;i++){c^=bytes[i];for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}
  return (c^0xffffffff)>>>0;
 }
 async function collect(stream,limit){
  const reader=stream.getReader(),parts=[];let length=0;
  try{
   while(true){
    const item=await reader.read();if(item.done)break;
    length+=item.value.byteLength;
    if(length>limit){try{await reader.cancel();}catch(error){}throw new RangeError('Expanded DIYCraft world exceeds the 32 MB safety limit.');}
    parts.push(item.value);
   }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;
  for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
  return bytes;
 }
 function envelope(raw,payload,codec){
  if(raw.byteLength>MAX_WORLD)throw new RangeError('World data exceeds the 32 MB safety limit.');
  if(payload.byteLength+HEADER>MAX_FILE)throw new RangeError('The .diycraft file exceeds the 24 MB safety limit.');
  const out=new Uint8Array(HEADER+payload.byteLength);out.set(MAGIC);
  out[8]=VERSION;out[9]=codec;
  const view=new DataView(out.buffer);
  view.setUint32(12,raw.byteLength,true);view.setUint32(16,payload.byteLength,true);view.setUint32(20,crc32(raw),true);
  out.set(payload,HEADER);return out;
 }
 async function encode(world){
  const json=typeof world==='string'?world:JSON.stringify(world);
  if(typeof json!=='string'||!json)throw new TypeError('No valid world data was supplied.');
  const raw=encoder.encode(json);
  if(raw.byteLength>MAX_WORLD)throw new RangeError('World data exceeds the 32 MB safety limit.');
  if(typeof root.CompressionStream==='function'&&typeof root.DecompressionStream==='function'){
   try{
    const stream=new Blob([raw]).stream().pipeThrough(new root.CompressionStream('gzip'));
    const zipped=await collect(stream,MAX_FILE-HEADER);
    if(zipped.byteLength>0&&zipped.byteLength<raw.byteLength)
     return Object.freeze({bytes:envelope(raw,zipped,CODEC_GZIP),format:'gzip',rawBytes:raw.byteLength});
   }catch(error){/* Retain the original data if compression is unsupported or ineffective. */}
  }
  return Object.freeze({bytes:envelope(raw,raw,CODEC_RAW),format:'raw',rawBytes:raw.byteLength});
 }
 function bytesOf(value){
  if(value instanceof Uint8Array)return value;
  if(value instanceof ArrayBuffer)return new Uint8Array(value);
  if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength);
  throw new TypeError('Choose a valid .diycraft file.');
 }
 function isDiycraftFile(value){
  try{const bytes=bytesOf(value);return bytes.length>=8&&MAGIC.every((b,i)=>bytes[i]===b);}
  catch(error){return false;}
 }
 async function decode(value){
  const bytes=typeof Blob!=='undefined'&&value instanceof Blob?new Uint8Array(await value.arrayBuffer()):bytesOf(value);
  if(bytes.byteLength<HEADER||bytes.byteLength>MAX_FILE)throw new RangeError('The .diycraft file is incomplete or larger than 24 MB.');
  if(!isDiycraftFile(bytes))throw new TypeError('This is not a recognized DIYCraft world file.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes[8]!==VERSION)throw new Error('This .diycraft file uses an unsupported save version.');
  const codec=bytes[9],rawLength=view.getUint32(12,true),payloadLength=view.getUint32(16,true),checksum=view.getUint32(20,true);
  if((codec!==CODEC_RAW&&codec!==CODEC_GZIP)||rawLength>MAX_WORLD||payloadLength!==bytes.byteLength-HEADER||payloadLength===0)
   throw new RangeError('The .diycraft header is invalid or exceeds the safety limits.');
  const payload=bytes.subarray(HEADER);let raw;
  if(codec===CODEC_RAW){
   if(payload.byteLength!==rawLength)throw new Error('The uncompressed world length is invalid.');
   raw=payload;
  }else{
   if(typeof root.DecompressionStream!=='function')throw new Error('This browser cannot decompress this .diycraft file.');
   try{raw=await collect(new Blob([payload]).stream().pipeThrough(new root.DecompressionStream('gzip')),MAX_WORLD);}
   catch(error){throw new Error('The .diycraft compressed payload is corrupt or invalid.');}
   if(raw.byteLength!==rawLength)throw new Error('The expanded world length does not match the file header.');
  }
  if(crc32(raw)!==checksum)throw new Error('The .diycraft file failed its integrity check. The file has not been changed.');
  return new TextDecoder('utf-8',{fatal:true}).decode(raw);
 }
 function openDb(){
  if(!root.indexedDB)return Promise.reject(new Error('This browser cannot remember a device-file link. You can still open or download .diycraft files manually.'));
  return new Promise((resolve,reject)=>{
   const request=root.indexedDB.open(DB,1);
   request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||new Error('Could not access the device-file link.'));
   request.onblocked=()=>reject(new Error('The device-file link is busy in another DIYCraft tab.'));
  });
 }
 async function dbRequest(mode,action){
  const db=await openDb();
  try{
   return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let request;
    try{request=action(store);}catch(error){reject(error);return;}
    tx.oncomplete=()=>resolve(request&&request.result);
    tx.onerror=()=>reject(tx.error||new Error('Could not update the device-file link.'));
    tx.onabort=()=>reject(tx.error||new Error('The device-file link update was cancelled.'));
   });
  }finally{db.close();}
 }
 function getRememberedHandle(){return dbRequest('readonly',store=>store.get(KEY));}
 async function rememberHandle(handle){await dbRequest('readwrite',store=>store.put(handle,KEY));return handle;}
 function permission(handle,mode='readwrite',request=false){
  if(!handle||typeof handle.queryPermission!=='function')return Promise.resolve(false);
  return (async()=>{
   try{
    const options={mode};
    let state=await handle.queryPermission(options);
    if(state!=='granted'&&request&&typeof handle.requestPermission==='function')state=await handle.requestPermission(options);
    return state==='granted';
   }catch(error){return false;}
  })();
 }
 async function readHandle(handle,mode='readwrite'){
  if(!await permission(handle,mode,false))throw new Error('File access needs permission. Tap Reconnect world file to grant access.');
  const file=await handle.getFile();
  if(!file.size)return '';
  if(file.size>MAX_FILE)throw new RangeError('The selected .diycraft file exceeds 24 MB.');
  return decode(file);
 }
 async function writeHandle(handle,world){
  if(!await permission(handle,'readwrite',false))throw new Error('File permission expired. Tap Reconnect world file to grant access.');
  const encoded=await encode(world),writable=await handle.createWritable({keepExistingData:false});
  try{await writable.write(encoded.bytes);await writable.close();}
  catch(error){try{await writable.abort();}catch(abortError){}throw error;}
  return Object.freeze({saved:true,fileName:handle.name,bytes:encoded.bytes.byteLength,rawBytes:encoded.rawBytes,format:encoded.format});
 }
 async function chooseSaveHandle(){
  if(typeof root.showSaveFilePicker!=='function')throw new Error('Direct device-file saving is unavailable here. Use Download .diycraft instead.');
  return root.showSaveFilePicker({suggestedName:'MyWorld.diycraft',
   types:[{description:'DIYCraft world',accept:{'application/vnd.diycraft.world':['.diycraft']}}],excludeAcceptAllOption:true});
 }
 async function chooseOpenHandle(){
  if(typeof root.showOpenFilePicker!=='function')throw new Error('Use the Open .diycraft file picker instead.');
  const handles=await root.showOpenFilePicker({multiple:false,
   types:[{description:'DIYCraft world',accept:{'application/vnd.diycraft.world':['.diycraft']}}],excludeAcceptAllOption:true});
  if(!handles||!handles[0])throw new Error('No world file was selected.');
  return handles[0];
 }
 async function loadRemembered(){
  let handle;
  try{handle=await getRememberedHandle();}catch(error){return {status:'unavailable',error:String(error.message||error)};}
  if(!handle)return {status:'missing'};
  if(!await permission(handle,'readwrite',false))return {status:'permission-required',handle,fileName:handle.name};
  try{
   const worldText=await readHandle(handle,'readwrite');
   return {status:worldText?'loaded':'empty',handle,fileName:handle.name,worldText};
  }catch(error){return {status:'invalid',handle,fileName:handle.name,error:String(error.message||error)};}
 }
 async function openFile(file){
  if(!file||file.size>MAX_FILE)throw new RangeError('Choose a .diycraft file no larger than 24 MB.');
  return decode(file);
 }
 async function download(world,name){
  const encoded=await encode(world);
  const blob=new Blob([encoded.bytes],{type:'application/vnd.diycraft.world'});
  const url=root.URL.createObjectURL(blob),anchor=root.document.createElement('a');
  const safe=String(name||'MyWorld').replace(/[^a-z0-9_-]+/gi,'_').slice(0,30)||'MyWorld';
  anchor.href=url;anchor.download=safe+'.diycraft';anchor.style.display='none';root.document.body.append(anchor);anchor.click();anchor.remove();
  root.setTimeout(()=>root.URL.revokeObjectURL(url),1500);
  return {fileName:safe+'.diycraft',bytes:encoded.bytes.byteLength,format:encoded.format};
 }
 return Object.freeze({MAGIC,MAX_FILE,MAX_WORLD,encode,decode,isDiycraftFile,getRememberedHandle,rememberHandle,
  permission,readHandle,writeHandle,chooseSaveHandle,chooseOpenHandle,loadRemembered,openFile,download});
});