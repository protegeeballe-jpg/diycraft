'use strict';
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

(async()=>{
  await fs.promises.mkdir('preview-three', {recursive:true});
  const server=spawn('python3',['-m','http.server','4174','--bind','127.0.0.1'],{stdio:'ignore'});
  const browser=await chromium.launch({headless:true,args:[
    '--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
  ]});
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.stack||e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto('http://127.0.0.1:4174/three-painterly-preview.html',{waitUntil:'networkidle',timeout:60000});
    await page.waitForFunction(()=>window.__THREE_PREVIEW_STATUS__?.frameCount>4,null,{timeout:30000});
    await page.waitForTimeout(800);
    const state=await page.evaluate(()=>({
      status:window.__THREE_PREVIEW_STATUS__,
      canvas:{width:document.querySelector('#three-world').width,height:document.querySelector('#three-world').height},
      webgl:!!document.querySelector('#three-world').getContext('webgl2')||!!document.querySelector('#three-world').getContext('webgl')
    }));
    if(!state.webgl)throw new Error('Three.js preview did not create a WebGL context.');
    if(state.status.revision!=='128')throw new Error('Unexpected Three.js revision: '+state.status.revision);
    if(state.status.frameCount<5||state.status.objectCount<40||state.status.textureCount<8||state.status.drawCalls<20){
      throw new Error('The painterly 3D scene is incomplete: '+JSON.stringify(state));
    }
    if(errors.length)throw new Error('Browser errors: '+errors.join('\n'));
    await page.screenshot({path:'preview-three/three-painterly-world.png'});
    console.log('Three.js painterly preview passed: '+JSON.stringify(state));
  }finally{
    await browser.close();server.kill('SIGTERM');
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
