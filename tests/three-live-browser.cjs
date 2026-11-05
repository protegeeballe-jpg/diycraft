'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');

(async()=>{
 const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1'],{stdio:'ignore'});
 const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:1,serviceWorkers:'allow',acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__?.frames>=5,null,{timeout:45000});
  await page.waitForFunction(()=>!!localStorage.getItem('diycraft_peaceful_voxel_v1'),null,{timeout:20000});
  const initial=await page.evaluate(async()=>{
   const stored=localStorage.getItem('diycraft_peaceful_voxel_v1');
   const raw=await window.DIYCraftThreeWorldStorage.decode(stored);
   const world=JSON.parse(raw),diagnostics=window.__DIYCRAFT_THREE_EDIT__;
   return {
    revision:window.THREE?.REVISION,world,storageSource:diagnostics?.storageSource,
    storageReadFailed:diagnostics?.storageReadFailed,
    canvas:{width:document.getElementById('three-world')?.width,height:document.getElementById('three-world')?.height},
    hasCanvas2DWorld:!!document.getElementById('game'),
    hasWebGL:!!(document.getElementById('three-world')?.getContext('webgl2')||document.getElementById('three-world')?.getContext('webgl')),
    saveControls:!!document.getElementById('save-now'),
    runtimeScripts:[...document.scripts].map(script=>script.getAttribute('src')).filter(Boolean)
   };
  });
  assert.equal(initial.revision,'128','The live world must use the pinned local Three.js r128 build.');
  assert.equal(initial.storageSource,'starter','A clean profile must load the canonical starter-world source.');
  assert.equal(initial.storageReadFailed,false);
  assert.equal(initial.world.version,1);
  assert.ok(Array.isArray(initial.world.blocks)&&initial.world.blocks.length>0);
  assert.equal(initial.hasCanvas2DWorld,false,'The Canvas 2D world canvas must no longer be the game renderer.');
  assert.equal(initial.hasWebGL,true,'The live page must have a WebGL context.');
  assert.equal(initial.saveControls,true);
  assert.ok(initial.canvas.width>200&&initial.canvas.height>200);
  assert.ok(initial.runtimeScripts.includes('./three-world-live.js'));
  assert.ok(!initial.runtimeScripts.some(source=>source.includes('diycraft.js')||source.includes('three-world-edit-preview.js')));
  assert.equal(initial.storageReadFailed,false);

  // Exercise a real build action and wait for the version-1 device save.
  await page.locator('#block-type').selectOption('grass');
  await page.locator('#add').click();
  await page.waitForFunction(async()=>{
   const stored=localStorage.getItem('diycraft_peaceful_voxel_v1');
   if(!stored)return false;
   const world=JSON.parse(await window.DIYCraftThreeWorldStorage.decode(stored));
   return world.blocks.length>232;
  },null,{timeout:15000});
  const afterBuild=await page.evaluate(async()=>{
   const world=JSON.parse(await window.DIYCraftThreeWorldStorage.decode(localStorage.getItem('diycraft_peaceful_voxel_v1')));
   return {blocks:world.blocks.length,version:world.version};
  });
  assert.ok(afterBuild.blocks>initial.world.blocks.length,'A build action must persist the changed blocks.');

  // Verify the save button does a direct, successful save.
  await page.locator('#save-now').click();
  await page.waitForFunction(()=>document.getElementById('backup-feedback').textContent.includes('Saved successfully'),null,{timeout:10000});

  // Confirm that position changes in Play Mode are persisted to the same player record.
  await page.locator('#play-mode').click();
  const beforeMove=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getPlayerState().player.z);
  await page.keyboard.down('w');
  await page.waitForTimeout(650);
  await page.keyboard.up('w');
  await page.waitForFunction(async(before)=>{
   const stored=localStorage.getItem('diycraft_peaceful_voxel_v1');if(!stored)return false;
   const world=JSON.parse(await window.DIYCraftThreeWorldStorage.decode(stored));
   return Math.abs(world.player.z-before)>.12;
  },beforeMove,{timeout:12000});
  await page.locator('#play-mode').click();

  // Animal placement is part of the actual UI and does not change the build mode.
  const savedAnimalCount=await page.evaluate(async()=>{
   const world=JSON.parse(await window.DIYCraftThreeWorldStorage.decode(localStorage.getItem('diycraft_peaceful_voxel_v1')));
   return (world.animals||[]).length;
  });
  await page.locator('#animal-species').selectOption('cat');
  await page.locator('#animal-place').click();
  const canvas=page.locator('#three-world'),bounds=await canvas.boundingBox();
  let placed=false;
  for(const [fx,fy] of [[.88,.84],[.12,.84],[.88,.34],[.12,.34],[.5,.88],[.94,.55],[.06,.55]]){
   await canvas.click({position:{x:bounds.width*fx,y:bounds.height*fy}});
   await page.waitForTimeout(120);
   if(!(await page.locator('#animal-care').isVisible().catch(()=>false))&&
      !(await page.locator('#neighbor-coloring').isVisible().catch(()=>false))){ }
   else{
    if(await page.locator('#animal-care').isVisible().catch(()=>false))await page.locator('#animal-care-close').click();
    if(await page.locator('#neighbor-coloring').isVisible().catch(()=>false))await page.locator('#neighbor-color-close').click();
   }
   const count=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__?.getAnimalStats?.().animals?.length||0);
   if(count>savedAnimalCount){placed=true;break;}
  }
  assert.equal(placed,true,'The Place an animal mode must add a saved animal through the world interface.');
  await page.waitForFunction(async(expected)=>{
   const stored=localStorage.getItem('diycraft_peaceful_voxel_v1');if(!stored)return false;
   const world=JSON.parse(await window.DIYCraftThreeWorldStorage.decode(stored));
   return (world.animals||[]).length>expected;
  },savedAnimalCount,{timeout:12000});

  // Downloaded backup must be original version-1 JSON, not renderer-only data.
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#backup-download').click()]);
  const downloadPath=await download.path();
  assert.ok(downloadPath,'Backup download must produce a file.');
  const backup=JSON.parse(fs.readFileSync(downloadPath,'utf8'));
  assert.equal(backup.version,1);
  assert.ok(Array.isArray(backup.blocks));
  assert.ok(!Object.prototype.hasOwnProperty.call(backup,'source'));
  assert.ok(!Object.prototype.hasOwnProperty.call(backup,'counts'));

  // Invalid restore must leave the existing saved world unchanged.
  const beforeInvalid=await page.evaluate(()=>localStorage.getItem('diycraft_peaceful_voxel_v1'));
  await page.locator('#backup-restore').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"blocks":')});
  await page.waitForFunction(()=>document.getElementById('backup-feedback').textContent.includes('Backup not restored'),null,{timeout:10000});
  const afterInvalid=await page.evaluate(()=>localStorage.getItem('diycraft_peaceful_voxel_v1'));
  assert.equal(afterInvalid,beforeInvalid,'A malformed backup must not overwrite the current device save.');

  // The offline worker must cache every production script, then serve the game after disconnect.
  await page.waitForFunction(()=>!!navigator.serviceWorker?.controller,null,{timeout:20000}).catch(async()=>{
   await page.reload({waitUntil:'networkidle',timeout:60000});
   await page.waitForFunction(()=>!!navigator.serviceWorker?.controller,null,{timeout:20000});
  });
  const cacheCheck=await page.evaluate(async()=>{
   const names=await caches.keys();
   const name=names.find(value=>value==='diycraft-shell-v58');
   if(!name)return {name:null,assets:[]};
   const cache=await caches.open(name),requests=await cache.keys();
   return {name,assets:requests.map(request=>new URL(request.url).pathname)};
  });
  assert.equal(cacheCheck.name,'diycraft-shell-v58','The updated offline worker must install the Three.js shell cache.');
  for(const asset of ['/diycraft/three-world-live.js','/diycraft/js/three.js','/diycraft/js/three-world-storage.js','/diycraft/js/three-world-starter.js']){
   assert.ok(cacheCheck.assets.some(path=>path.endsWith(asset.replace('/diycraft','')))||cacheCheck.assets.some(path=>path.endsWith(asset)),
    'Offline cache is missing '+asset);
  }
  await page.screenshot({path:'three-live-main.png',fullPage:false});
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__?.frames>=3,null,{timeout:30000});
  const offlineStatus=await page.evaluate(()=>({
   revision:window.THREE?.REVISION,
   source:window.__DIYCRAFT_THREE_EDIT__?.storageSource,
   blocks:window.__DIYCRAFT_THREE_EDIT__?.blockCount
  }));
  assert.equal(offlineStatus.revision,'128','Offline startup must still use Three.js.');
  assert.ok(offlineStatus.blocks>0,'Offline startup must render the real saved world.');
  await context.setOffline(false);
  if(errors.length)throw new Error('Browser console/page errors:\n'+errors.join('\n\n'));
  console.log('Three.js live browser integration passed: '+JSON.stringify({
   initialBlocks:initial.world.blocks.length,afterBuild:afterBuild.blocks,
   playerStartZ:beforeMove,animals:savedAnimalCount,cacheFiles:cacheCheck.assets.length,offlineStatus
  }));
  await context.close();
 }finally{
  await browser.close();server.kill('SIGTERM');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
