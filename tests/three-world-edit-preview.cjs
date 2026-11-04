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
 const world=freshWorld(),before=JSON.stringify(world),snapshot=adapter.createSnapshot(world);
 assert.equal(snapshot.counts.blocks,world.blocks.length);
 await fs.promises.mkdir('preview-three',{recursive:true});
 await fs.promises.writeFile('preview-three/starter-world.json',before,'utf8');
 const server=spawn('python3',['-m','http.server','4176','--bind','127.0.0.1'],{stdio:'ignore'});
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.stack||e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:4176/three-world-edit-preview.html',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>window.__DIYCRAFT_THREE_EDIT__?.frames>5,null,{timeout:30000});
  let state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
  assert.equal(state.blockCount,world.blocks.length);
  assert.equal(state.sourceUnchanged,true);
  assert.equal(state.storageKeys,0);
  assert.equal(state.renderedMeshes,world.blocks.length);
  const keys=snapshot.blocks.map(b=>b.key);
  let selected=false;
  for(const key of keys){
   await page.evaluate(k=>window.__DIYCRAFT_THREE_EDIT__.pickBlock(k),key);
   await page.waitForTimeout(30);
   state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
   if(state.selectedKey){selected=true;break;}
  }
  assert.ok(selected,'A real projected block click should select a scene object.');
  const selectedBefore=state.selectedKey;
  const selectedBlockBefore=await page.evaluate(()=>{const s=window.__DIYCRAFT_THREE_EDIT__.getState();return s.world.blocks.find(b=>b.key===s.selectedKey);});
  assert.ok(state.lastPlacement&&state.lastPlacement.key===selectedBefore,'Raycast selection must retain the clicked face normal.');
  await page.locator('#block-type').selectOption('stone');
  await page.locator('#add').click();
  let worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.blocks.length,world.blocks.length+1);
  const addedStone=worldState.world.blocks.at(-1);
  assert.equal(addedStone.type,'stone');
  const faceDistance=Math.abs(addedStone.x-selectedBlockBefore.x)+Math.abs(addedStone.y-selectedBlockBefore.y)+Math.abs(addedStone.z-selectedBlockBefore.z);
  assert.equal(faceDistance,1,'New blocks must be placed in the cell adjacent to the clicked 3D face.');
  await page.locator('#remove').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.blocks.length,world.blocks.length);
  assert.equal(worldState.world.blocks.some(b=>b.key===addedStone.key),false);
  await page.locator('#block-type').selectOption('door');
  await page.locator('#add').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  const door=worldState.world.blocks.at(-1);
  assert.equal(door.type,'door');
  await page.locator('#door').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.blocks.find(b=>b.key===door.key).open,true);
  await page.locator('#block-type').selectOption('tile');
  await page.locator('#add').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  const tile=worldState.world.blocks.at(-1);
  assert.equal(tile.type,'tile');
  await page.locator('#pattern').selectOption('waves');
  await page.locator('#apply-pattern').click();
  worldState=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__.getState());
  assert.equal(worldState.world.blocks.find(b=>b.key===tile.key).tilePattern,'waves');
  state=await page.evaluate(()=>window.__DIYCRAFT_THREE_EDIT__);
  assert.equal(state.sourceUnchanged,true,'Sandbox operations must not mutate the renderer snapshot.');
  assert.equal(state.storageKeys,0,'Sandbox must not access browser storage.');
  assert.equal(JSON.stringify(world),before,'Production starter-world fixture must remain unchanged.');
  if(errors.length)throw new Error('Browser errors:\n'+errors.join('\n\n'));
  await page.screenshot({path:'preview-three/three-edit-sandbox.png'});
  console.log('Interactive Three.js sandbox passed: '+JSON.stringify({selectedBefore,blocks:worldState.world.blocks.length,revision:worldState.revision,storageKeys:state.storageKeys,sourceUnchanged:state.sourceUnchanged}));
  await context.close();
 }finally{await browser.close();server.kill('SIGTERM');}
})().catch(error=>{console.error(error);process.exitCode=1;});
