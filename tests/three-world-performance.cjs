'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const adapter=require('../js/three-world-adapter.js');

function freshWorld(){
 const source=fs.readFileSync('diycraft.js','utf8');
 const start=source.indexOf('function freshWorld(){');
 const marker='\n}\n\nfunction validHex';
 const end=source.indexOf(marker,start);
 if(start<0||end<0)throw new Error('Could not locate production freshWorld().');
 return new Function('emptySlots','return ('+source.slice(start,end+2)+');')(()=>Array.from({length:60},()=>null))();
}
(async()=>{
 const world=freshWorld(),occupied=new Set(world.blocks.map(b=>b.x+','+b.y+','+b.z));
 const species=['sheep','cat','dog','cow','horse','bird','giraffe'];
 world.animals=Array.from({length:18},(_,index)=>({
  id:'stress-pet-'+index,species:species[index%species.length],
  x:(index%6)*1.5-4,z:Math.floor(index/6)*1.8-2,
  facing:index*.11,phase:index*.63
 }));
 const types=['grass','dirt','stone','wood'];let added=0;
 for(let z=-24;z<24&&added<1800;z++)for(let x=-24;x<24&&added<1800;x++){
  const key=x+',0,'+z;if(occupied.has(key))continue;
  world.blocks.push({x,y:0,z,type:types[(x-z+400)%types.length]});occupied.add(key);added++;
 }
 assert.equal(added,1800,'Synthetic stress fixture must add the planned solid blocks.');
 const before=JSON.stringify(world),snapshot=adapter.createSnapshot(world);
 assert.equal(snapshot.counts.blocks,world.blocks.length);
 await fs.promises.mkdir('preview-three',{recursive:true});
 await fs.promises.writeFile('preview-three/starter-world.json',before,'utf8');
 const server=spawn('python3',['-m','http.server','4177','--bind','127.0.0.1'],{stdio:'ignore'});
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  await page.addInitScript(()=>{try{Object.defineProperty(navigator,'deviceMemory',{configurable:true,value:2});Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:4});}catch(_){}});
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:4177/three-world-preview.html',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_WORLD__?.frames>3,null,{timeout:30000});
  await page.waitForTimeout(500);
  const state=await page.evaluate(()=>({
   world:window.__DIYCRAFT_THREE_WORLD__,
   canvas:{width:document.getElementById('three-world')?.width,height:document.getElementById('three-world')?.height},
   storageKeys:localStorage.length
  }));
  assert.equal(state.world.performanceProfile.tier,'low');
  assert.equal(state.world.performanceProfile.fpsCap,30);
  assert.equal(state.world.sourceBlocks,world.blocks.length);
  assert.equal(state.world.snapshotCounts.animals,18);
  assert.equal(state.world.renderedAnimals,12,'The read-only low-end profile must cap drawn animals, not erase saved animals.');
  assert.equal(state.world.animalBatchCount,7,'Identical animal appearances must batch together.');
  assert.equal(state.world.performanceProfile.maxVisibleAnimals,12);
  assert.equal(state.world.renderedBlocks+state.world.renderedPlants+state.world.renderedDoors,world.blocks.length,
   'Every block must be represented even in the large world.');
  assert.ok(state.world.instanceGroups>0&&state.world.instanceGroups<120,
   'Spatial/material batching must keep GPU object groups bounded.');
  assert.ok(state.world.drawCalls>0&&state.world.drawCalls<=90,
   'Frustum culling and spatial batches must keep draw calls bounded on a low-end phone profile.');
  assert.ok(state.world.geometryCount<100,'Shared geometry must keep GPU geometry count bounded.');
  assert.ok(state.world.textureCount<50,'Painterly textures must stay cached and bounded.');
  assert.ok(state.canvas.width<=390&&state.canvas.height<=844,
   'The low-end mobile profile must not render at the phone’s full 3x device pixel ratio.');
  assert.equal(state.world.sourceUnchanged,true);
  assert.equal(state.storageKeys,0);
  if(errors.length)throw new Error('Mobile stress-test browser errors:\n'+errors.join('\n\n'));
  console.log('Low-end mobile stress test passed: '+JSON.stringify({
   sourceBlocks:state.world.sourceBlocks,instanceGroups:state.world.instanceGroups,
   drawCalls:state.world.drawCalls,geometryCount:state.world.geometryCount,
   textureCount:state.world.textureCount,profile:state.world.performanceProfile,
   canvas:state.canvas,storageKeys:state.storageKeys
  }));
  const editPage=await context.newPage();
  editPage.on('pageerror',e=>errors.push(e.stack||e.message));
  editPage.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await editPage.goto('http://127.0.0.1:4177/three-world-edit-preview.html',{waitUntil:'networkidle',timeout:60000});
  await editPage.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__?.frames>3,null,{timeout:30000});
  await editPage.waitForTimeout(500);
  const editState=await editPage.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
  assert.equal(editState.performanceProfile.tier,'low');
  assert.equal(editState.blockCount,world.blocks.length);
  assert.equal(editState.animalCount,18,'The editable renderer must retain every animal in its cloned world data.');
  assert.equal(editState.renderedAnimalCount,12,'The editable low-end profile must cap visible animals at twelve.');
  assert.ok(editState.animalBatchCount<=7,'The editor must instance identical animal appearances.');
  assert.equal(editState.renderedBlocks,world.blocks.length,'The editable renderer must retain every large-world block.');
  assert.ok(editState.instanceBatches>0&&editState.instanceBatches<120,
   'The editable renderer must batch large worlds by spatial chunk and material.');
  assert.ok(editState.renderObjects<160,'The editable renderer must not create one render object per block.');
  assert.ok(editState.drawCalls>0&&editState.drawCalls<=110,
   'The editable sandbox must stay within its low-end draw-call budget.');
  assert.ok(editState.geometryCount<100,'The editable sandbox must keep GPU geometry counts bounded.');
  assert.ok(editState.textureCount<50,'The editable sandbox must reuse and bound painterly textures.');
  assert.ok(editState.canvasSize.width<=390&&editState.canvasSize.height<=844,
   'The editable renderer must clamp its output canvas to the phone viewport at 3x device scale.');
  assert.equal(editState.storageKeys,0,'The editable sandbox must never write browser storage.');
  assert.equal(editState.sourceUnchanged,true,'The editable sandbox must leave its source snapshot unchanged.');
  if(errors.length)throw new Error('Low-end mobile stress-test browser errors:\n'+errors.join('\n\n'));
  console.log('Low-end mobile editable-world stress test passed: '+JSON.stringify({
   sourceBlocks:editState.blockCount,instanceBatches:editState.instanceBatches,
   renderObjects:editState.renderObjects,drawCalls:editState.drawCalls,
   geometryCount:editState.geometryCount,textureCount:editState.textureCount,
   canvas:editState.canvasSize,profile:editState.performanceProfile,
   storageKeys:editState.storageKeys,sourceUnchanged:editState.sourceUnchanged
  }));
  await context.close();
 }finally{await browser.close();server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exitCode=1;});
