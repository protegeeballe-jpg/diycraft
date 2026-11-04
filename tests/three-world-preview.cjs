'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const adapter=require('../js/three-world-adapter.js');

function extractFreshWorld(){
 const source=fs.readFileSync('diycraft.js','utf8');
 const start=source.indexOf('function freshWorld(){');
 const marker='\n}\n\nfunction validHex';
 const end=source.indexOf(marker,start);
 if(start<0||end<0)throw new Error('Could not locate the current production freshWorld() function.');
 const functionSource=source.slice(start,end+2);
 const makeFactory=new Function('emptySlots','return ('+functionSource+');');
 const freshWorld=makeFactory(()=>Array.from({length:60},()=>null));
 return freshWorld();
}
(async()=>{
 const world=extractFreshWorld();
 const original=JSON.stringify(world);
 const snapshot=adapter.createSnapshot(world);
 assert.ok(snapshot.blocks.length>0,'The real starter world must have blocks.');
 assert.equal(snapshot.counts.blocks,world.blocks.length,'Every starter block must map into the renderer snapshot.');
 assert.equal(snapshot.player.x,world.player.x);
 assert.equal(snapshot.player.z,world.player.z);
 assert.equal(JSON.stringify(world),original,'Adapter must not mutate the starter world.');
 await fs.promises.mkdir('preview-three',{recursive:true});
 await fs.promises.writeFile(path.join('preview-three','starter-world.json'),original,'utf8');
 const server=spawn('python3',['-m','http.server','4175','--bind','127.0.0.1'],{stdio:'ignore'});
 const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  await page.addInitScript(()=>{try{Object.defineProperty(navigator,'deviceMemory',{configurable:true,value:2});Object.defineProperty(navigator,'hardwareConcurrency',{configurable:true,value:4});}catch(_){}});
  page.on('pageerror',error=>errors.push(error.stack||error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://127.0.0.1:4175/three-world-preview.html',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_WORLD__?.frames>8,null,{timeout:30000});
  await page.waitForTimeout(700);
  const state=await page.evaluate(()=>({
   status:window.__DIYCRAFT_THREE_WORLD__,
   revision:window.THREE?.REVISION,
   canvas:{width:document.getElementById('three-world')?.width,height:document.getElementById('three-world')?.height},
   storageKeys:localStorage.length
  }));
  assert.equal(state.revision,'128','The repository Three.js r128 build must be used.');
  assert.equal(state.status.source,'diycraft-world-v1');
  assert.equal(state.status.sourceBlocks,world.blocks.length);
  assert.equal(state.status.renderedBlocks+state.status.renderedPlants+state.status.renderedDoors,world.blocks.length,
   'Every original starter block must be represented by a 3D render object.');
  assert.equal(state.status.sourceUnchanged,true,'Rendering must not alter the original world data.');
  assert.ok(state.status.instanceGroups>0,'Solid blocks should use instanced meshes.');
  assert.ok(state.status.materialCount>=3,'Painterly materials must be generated and reused.');
  assert.ok(state.status.drawCalls>10,'A substantial WebGL scene must be drawn.');
  assert.equal(state.status.performanceProfile.tier,'low','The real starter world must be tested on the low-end profile.');
  assert.ok(state.status.drawCalls<=45,'The real starter world must fit the low-end draw-call budget.');
  assert.ok(state.status.geometryCount<100,'The starter world must stay within the low-end geometry budget.');
  assert.ok(state.status.frames>8,'The animation loop must advance.');
  assert.equal(state.storageKeys,0,'The renderer must not write browser storage.');
  assert.ok(state.canvas.width>100&&state.canvas.height>100);
  if(errors.length)throw new Error('Browser errors:\n'+errors.join('\n\n'));
  await page.screenshot({path:'preview-three/three-actual-starter-world.png'});
  console.log('Three.js actual starter-world render passed: '+JSON.stringify(state));
  await context.close();
 }finally{
  await browser.close();server.kill('SIGTERM');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
