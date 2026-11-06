'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const deviceFileFormat=require('../js/three-world-file-save.js');

async function showSettingsPanel(page){
 if(!(await page.locator('#settings-panel').isVisible()))await page.locator('#settings-toggle').click();
 await page.locator('#device-file-connect').waitFor({state:'visible'});
}
const harness="(()=>{\n const marker='diycraft-test-file-handle-present';\n function toBytes(base64){\n  const binary=atob(base64),out=new Uint8Array(binary.length);\n  for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);\n  return out;\n }\n function toBase64(bytes){\n  let binary='';\n  for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));\n  return btoa(binary);\n }\n const handle={\n  kind:'file',name:'MyWorld.diycraft',\n  async queryPermission(options){return options.mode==='read'?'granted':await window.__diyPermissionGet();},\n  async requestPermission(){return window.__diyPermissionRequest();},\n  async getFile(){\n   const encoded=await window.__diyFileRead();\n   return new File([encoded?toBytes(encoded):new Uint8Array(0)],this.name,{type:'application/vnd.diycraft.world'});\n  },\n  async createWritable(){\n   let staged=null;\n   return {\n    async write(value){\n     if(value instanceof Uint8Array)staged=new Uint8Array(value);\n     else if(value instanceof ArrayBuffer)staged=new Uint8Array(value);\n     else if(value instanceof Blob)staged=new Uint8Array(await value.arrayBuffer());\n     else throw new TypeError('Unexpected file payload.');\n    },\n    async close(){\n     if(!staged)throw new Error('No staged bytes.');\n     await window.__diyFileWrite(toBase64(staged));\n    },\n    async abort(){staged=null;}\n   };\n  }\n };\n const database={\n  objectStoreNames:{contains(){return true;}},\n  transaction(){\n   const tx={\n    objectStore(){\n     return {\n      get(){\n       const request={result:sessionStorage.getItem(marker)==='1'?handle:undefined};\n       setTimeout(()=>tx.oncomplete?.(),0);\n       return request;\n      },\n      put(){\n       const request={result:'primary'};\n       sessionStorage.setItem(marker,'1');\n       setTimeout(()=>tx.oncomplete?.(),0);\n       return request;\n      },\n      delete(){\n       const request={result:undefined};\n       sessionStorage.removeItem(marker);\n       setTimeout(()=>tx.oncomplete?.(),0);\n       return request;\n      }\n     };\n    },\n    abort(){}\n   };\n   return tx;\n  },\n  close(){}\n };\n Object.defineProperty(window,'indexedDB',{configurable:true,value:{\n  open(){\n   const request={};\n   setTimeout(()=>{request.result=database;request.onsuccess?.();},0);\n   return request;\n  }\n }});\n Object.defineProperty(window,'showSaveFilePicker',{configurable:true,value:async()=>handle});\n Object.defineProperty(window,'showOpenFilePicker',{configurable:true,value:async()=>[handle]});\n window.__diyFileTestHandle=handle;\n})();";
(async()=>{
 const fileStore={bytes:Buffer.alloc(0),permission:'granted',writes:0,failNextWrite:false};
 const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
 const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,serviceWorkers:'allow',acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  await page.exposeFunction('__diyFileRead',async()=>fileStore.bytes.toString('base64'));
  await page.exposeFunction('__diyFileWrite',async(encoded)=>{
   if(fileStore.failNextWrite){fileStore.failNextWrite=false;throw new Error('simulated temporary file write failure');}
   fileStore.bytes=Buffer.from(encoded,'base64');fileStore.writes++;
   return {bytes:fileStore.bytes.length,writes:fileStore.writes};
  });
  await page.exposeFunction('__diyFailNextFileWrite',async()=>{fileStore.failNextWrite=true;});
  await page.exposeFunction('__diyPermissionGet',async()=>fileStore.permission);
  await page.exposeFunction('__diyPermissionRequest',async()=>{fileStore.permission='granted';return 'granted';});
  await context.addInitScript(harness);
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('requestfailed',request=>errors.push('REQUEST FAILED '+request.url()+' '+request.failure()?.errorText));
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'networkidle',timeout:60000});
  try{await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__?.frames>=5,null,{timeout:45000});}
  catch(error){
   const diagnostic=await page.evaluate(()=>({
    pageTitle:document.title,
    status:document.getElementById('status')?.textContent,
    backupFeedback:document.getElementById('backup-feedback')?.textContent,
    deviceFeedback:document.getElementById('device-file-feedback')?.textContent,
    runtimeLoaded:!!window.__DIYCRAFT_THREE_EDIT__,
    fileApiLoaded:!!window.DIYCraftDeviceWorldFile,
    indexedDBType:typeof indexedDB
   })).catch(()=>({evaluation:'failed'}));
   throw new Error('Device-file browser startup timed out. '+JSON.stringify(diagnostic)+' Browser errors: '+errors.join('\\n')+' Original: '+error.message);
  }
  await page.waitForFunction(()=>!!localStorage.getItem('diycraft_peaceful_voxel_v1'),null,{timeout:20000});

  // Save controls live inside the settings panel; open it before interacting.
  await showSettingsPanel(page);
  // Choose device file and create the initial .diycraft file.
  await page.locator('#device-file-connect').click();
  await page.waitForFunction(()=>document.getElementById('device-file-feedback').textContent.includes('Created MyWorld.diycraft'),null,{timeout:15000});
  assert.ok(fileStore.bytes.length>24,'The selected device file must contain a valid file envelope.');
  const firstWorld=JSON.parse(await deviceFileFormat.decode(new Uint8Array(fileStore.bytes)));
  const firstCount=firstWorld.blocks.length;
  const linkedState=await page.evaluate(()=>({
   state:window.__DIYCRAFT_THREE_EDIT__?.deviceFileState,
   hasHandle:window.__DIYCRAFT_THREE_EDIT__?.hasDeviceFileHandle,
   remembered:window.__DIYCRAFT_THREE_EDIT__?.deviceFileRemembered
  }));
  console.log('device-file link state:',JSON.stringify(linkedState));
  assert.equal(linkedState.state,'connected','The selected device file must be active after creation.');
  assert.equal(linkedState.hasHandle,true,'The selected device handle must be retained in the live game.');
  console.log('PASS choose device file and create MyWorld.diycraft');

  // Make a real world edit and verify automatic file saving (without clicking Save now).
  if(!(await page.locator('#settings-panel').isVisible()))await page.locator('#settings-toggle').click();
  await page.locator('#hud-choices-block-type [data-value="grass"]').click();
  await page.locator('#add').evaluate(button=>button.click());
  await page.waitForFunction(async expected=>{
   const encoded=await window.__diyFileRead();if(!encoded)return false;
   const binary=atob(encoded),bytes=new Uint8Array(binary.length);
   for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
   const world=JSON.parse(await window.DIYCraftDeviceWorldFile.decode(bytes));
   return world.blocks.length>=expected;
  },firstCount+1,{timeout:15000});
  const afterBuild=JSON.parse(await deviceFileFormat.decode(new Uint8Array(fileStore.bytes)));
  const liveAfterBuild=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.blockCount);
  console.log('device-file build verification:',JSON.stringify({
   firstCount,expected:firstCount+1,liveAfterBuild,fileCount:afterBuild.blocks.length,
   writes:fileStore.writes,feedback:await page.locator('#device-file-feedback').textContent(),
   runtime:await page.evaluate(()=>({state:window.__DIYCRAFT_THREE_EDIT__?.deviceFileState,hasHandle:window.__DIYCRAFT_THREE_EDIT__?.hasDeviceFileHandle,pending:window.__DIYCRAFT_THREE_EDIT__?.hasPendingDeviceFileSave,writeBusy:window.__DIYCRAFT_THREE_EDIT__?.deviceFileWriteBusy}))
  }));
  assert.ok(afterBuild.blocks.length>=firstCount+1,'Edits must reach the selected device file automatically.');
  assert.equal(liveAfterBuild,afterBuild.blocks.length,'The saved device file must match the current live world after autosave settles.');
  console.log('PASS automatic device-file autosave after building');

  // A transient write failure must preserve the older file and allow retrying current in-memory edits.
  const beforeFailureCount=afterBuild.blocks.length;
  await page.evaluate(()=>window.__diyFailNextFileWrite());
  await page.locator('#add').evaluate(button=>button.click());
  await page.waitForFunction(()=>document.getElementById('device-file-feedback').textContent.includes('Device-file save paused:'),null,{timeout:15000});
  assert.equal(JSON.parse(await deviceFileFormat.decode(new Uint8Array(fileStore.bytes))).blocks.length,beforeFailureCount,
   'A failed staged write must not replace the previously saved device file.');
  assert.equal(await page.locator('#device-file-connect').textContent(),'Retry device save');
  await page.locator('#device-file-connect').click();
  await page.waitForFunction(()=>document.getElementById('device-file-feedback').textContent.includes('Retry successful.'),null,{timeout:15000});
  const afterRetry=JSON.parse(await deviceFileFormat.decode(new Uint8Array(fileStore.bytes)));
  assert.ok(afterRetry.blocks.length>=beforeFailureCount+1,'Retry must write the newest in-memory world, not reload the older file.');
  console.log('PASS failed device write is recoverable without losing newer in-memory edits');

  // Permission revoked during an active session: reconnect must save the newest in-memory world.
  const beforePermissionLoss=afterRetry.blocks.length;
  fileStore.permission='prompt';
  await page.locator('#add').evaluate(button=>button.click());
  await page.waitForFunction(()=>document.getElementById('device-file-feedback').textContent.includes('Device-file save paused:'),null,{timeout:15000});
  assert.equal(await page.locator('#device-file-connect').textContent(),'Reconnect world file');
  await page.locator('#device-file-connect').click();
  await page.waitForFunction(()=>document.getElementById('device-file-feedback').textContent.includes('latest in-session edits were saved if permission had expired'),null,{timeout:15000});
  const afterPermissionReconnect=JSON.parse(await deviceFileFormat.decode(new Uint8Array(fileStore.bytes)));
  assert.ok(afterPermissionReconnect.blocks.length>=beforePermissionLoss+1,
   'Permission renewal during an active session must write the newest in-memory world, not restore stale file contents.');
  console.log('PASS active-session permission renewal preserves unsaved in-memory edits');

  // Download and inspect a portable .diycraft backup.
  const [download]=await Promise.all([
   page.waitForEvent('download'),
   page.locator('#device-file-download').click()
  ]);
  const downloadedPath=await download.path();
  assert.ok(downloadedPath,'Download .diycraft must produce a file.');
  const portableBytes=fs.readFileSync(downloadedPath);
  const portableWorld=JSON.parse(await deviceFileFormat.decode(new Uint8Array(portableBytes)));
  assert.equal(portableWorld.blocks.length,afterBuild.blocks.length);
  console.log('PASS portable .diycraft download and integrity');

  // Manual open must restore the world and detach the previous automatic-save target.
  await page.evaluate(()=>{window.showOpenFilePicker=undefined;});
  await page.locator('#device-file-open').click();
  await page.locator('#device-file-fallback').setInputFiles(downloadedPath);
  await page.waitForFunction(async()=>{
   const remembered=await window.DIYCraftDeviceWorldFile.loadRemembered();
   return remembered.status==='missing'&&document.getElementById('device-file-feedback').textContent.includes('Choose device file');
  },null,{timeout:15000});
  const importedCount=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.blockCount);
  assert.equal(importedCount,portableWorld.blocks.length);
  console.log('PASS portable file open restores world without retaining a different save target');

  // Reselect the existing file and reconnect automatic saving.
  await page.locator('#device-file-connect').click();
  await page.waitForFunction(()=>document.getElementById('device-file-feedback').textContent.includes('Opened and linked MyWorld.diycraft'),null,{timeout:15000});
  assert.ok(fileStore.bytes.length>24);
  console.log('PASS existing device file can be selected and linked again');

  // Simulate permission revocation after browser restart.
  fileStore.permission='prompt';
  await page.reload({waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.getElementById('device-file-connect').textContent==='Reconnect world file',null,{timeout:15000});
  await showSettingsPanel(page);
  await page.locator('#device-file-connect').click();
  await page.waitForFunction(()=>document.getElementById('device-file-feedback').textContent.includes('Reconnected MyWorld.diycraft'),null,{timeout:15000});
  assert.equal(fileStore.permission,'granted');
  const reopenedCount=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.blockCount);
  assert.equal(reopenedCount,portableWorld.blocks.length);
  console.log('PASS permission renewal and reopening latest device world');

  // Simulate browser-managed data being cleared; external file bytes remain outside browser storage.
  await page.evaluate(()=>{
   localStorage.clear();
   sessionStorage.removeItem('diycraft-test-file-handle-present');
  });
  await page.reload({waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>document.getElementById('device-file-connect').textContent==='Choose device file',null,{timeout:15000});
  await showSettingsPanel(page);
  assert.ok(fileStore.bytes.length>24,'Browser data clearing must not delete the external device-file bytes.');
  // Reopen the portable copy and relink the external file.
  await page.evaluate(()=>{window.showOpenFilePicker=undefined;});
  await page.locator('#device-file-open').click();
  await page.locator('#device-file-fallback').setInputFiles(downloadedPath);
  await page.waitForFunction(()=>document.getElementById('device-file-feedback').textContent.includes('Choose device file'),null,{timeout:15000});
  const recovered=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.blockCount);
  assert.equal(recovered,portableWorld.blocks.length);
  await page.locator('#device-file-connect').click();
  await page.waitForFunction(()=>document.getElementById('device-file-feedback').textContent.includes('Opened and linked MyWorld.diycraft'),null,{timeout:15000});
  console.log('PASS browser-data clear: portable file restores and can be relinked');

  assert.deepEqual(errors,[],'Device-file flows must not produce uncaught browser exceptions.');
  console.log('DIYCraft device-file browser integration tests complete.');
 }finally{
  await browser.close();
  server.kill();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});