'use strict';
const assert=require('node:assert/strict');
const viewport=require('../js/three-viewport.js');

function makeHarness(width,height,devicePixelRatio=2,maxPixelRatio=1.5){
 let rect={width,height},projectionUpdates=0,sizeCalls=[],ratioCalls=[];
 const listeners=new Map(),visualListeners=new Map();
 let observerCallback=null,observerDisconnected=false,observed=null;
 const canvas={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>({...rect})};
 const camera={aspect:1,updateProjectionMatrix(){projectionUpdates++;}};
 const renderer={setPixelRatio(value){ratioCalls.push(value);},setSize(w,h,updateStyle){sizeCalls.push({width:w,height:h,updateStyle});}};
 const visualViewport={
  addEventListener(name,fn){visualListeners.set(name,fn);},
  removeEventListener(name,fn){if(visualListeners.get(name)===fn)visualListeners.delete(name);}
 };
 class MockResizeObserver{
  constructor(fn){observerCallback=fn;}
  observe(element){observed=element;}
  disconnect(){observerDisconnected=true;}
 }
 const windowRef={
  innerWidth:width,innerHeight:height,devicePixelRatio,
  visualViewport,ResizeObserver:MockResizeObserver,
  addEventListener(name,fn){listeners.set(name,fn);},
  removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);}
 };
 const controller=viewport.create(canvas,camera,renderer,windowRef,{maxPixelRatio});
 return {
  canvas,camera,renderer,controller,listeners,visualListeners,
  get projectionUpdates(){return projectionUpdates;},
  get sizeCalls(){return sizeCalls;},
  get ratioCalls(){return ratioCalls;},
  get observed(){return observed;},
  get observerDisconnected(){return observerDisconnected;},
  resizeRect(w,h){rect={width:w,height:h};canvas.clientWidth=w;canvas.clientHeight=h;},
  fireObserver(){observerCallback();},
  fireWindow(name){listeners.get(name)?.();},
  fireVisual(name){visualListeners.get(name)?.();}
 };
}

const devices=[
 {name:'portrait phone',width:390,height:844,dpr:3,expectedRatio:1.5},
 {name:'landscape phone',width:844,height:390,dpr:3,expectedRatio:1.5},
 {name:'laptop',width:1366,height:768,dpr:1,expectedRatio:1},
 {name:'tablet',width:1024,height:768,dpr:2,expectedRatio:1.5}
];
for(const device of devices){
 const h=makeHarness(device.width,device.height,device.dpr,1.5);
 const expected=device.width/device.height;
 assert.ok(Math.abs(h.camera.aspect-expected)<1e-10,device.name+' must initialize with its own canvas aspect ratio.');
 assert.equal(h.projectionUpdates,1,device.name+' must update the projection matrix during initial sizing.');
 assert.deepEqual(h.sizeCalls[0],{width:device.width,height:device.height,updateStyle:false},
  device.name+' must size the WebGL buffer to the canvas CSS dimensions.');
 assert.equal(h.ratioCalls[0],device.expectedRatio,device.name+' must respect the device pixel-ratio cap.');
 assert.equal(h.observed,h.canvas,'A ResizeObserver must watch the actual canvas element.');
 h.controller.dispose();
 assert.equal(h.observerDisconnected,true,device.name+' must disconnect its resize observer on disposal.');
 assert.equal(h.listeners.size,0,device.name+' must remove global resize listeners on disposal.');
 assert.equal(h.visualListeners.size,0,device.name+' must remove visual-viewport listeners on disposal.');
}

const h=makeHarness(390,844,2,2);
h.resizeRect(844,390);
h.fireObserver();
assert.ok(Math.abs(h.camera.aspect-844/390)<1e-10,'Canvas ResizeObserver must correct the camera when the phone rotates.');
assert.deepEqual(h.sizeCalls.at(-1),{width:844,height:390,updateStyle:false});
const updateCount=h.sizeCalls.length;
h.fireWindow('resize');
assert.equal(h.sizeCalls.length,updateCount,'Duplicate resize notifications must not resize the renderer again.');
h.resizeRect(1366,768);
h.fireWindow('orientationchange');
assert.ok(Math.abs(h.camera.aspect-1366/768)<1e-10,'Orientation/window events must update the camera to a laptop-shaped viewport.');
h.resizeRect(1024,768);
h.fireVisual('resize');
assert.ok(Math.abs(h.camera.aspect-1024/768)<1e-10,'Visual viewport changes must update the projection matrix.');

const fallback=viewport.measure({clientWidth:0,clientHeight:0},{innerWidth:1280,innerHeight:720});
assert.deepEqual(fallback,{width:1280,height:720,aspect:1280/720},'Measurement must safely fall back to the viewport while canvas layout is unavailable.');
console.log('Three.js viewport sizing tests passed for portrait phone, landscape phone, laptop, tablet, rotation, visual-viewport changes, and pixel-ratio limits.');


// Browser zoom and compact HUD accessibility regression checks.
// The live and offline entry pages must both keep pinch zoom available on the
// world canvas without changing the dedicated pointer handling on drawing tools.
const fs = require('node:fs');
for (const entry of ['index.html', 'offline/index.html']) {
  const html = fs.readFileSync(entry, 'utf8');
  const viewportTag = html.match(/<meta\\s+name="viewport"\\s+content="([^"]+)"/i);
  assert.ok(viewportTag, entry + ' must declare a viewport meta tag.');
  assert.doesNotMatch(
    viewportTag[1],
    /(?:^|,)\\s*(?:maximum-scale|user-scalable)\\s*=/i,
    entry + ' must not disable browser zoom.'
  );
  assert.match(
    html,
    /#three-world\\{[^}]*touch-action:pinch-zoom[^}]*\\}/,
    entry + ' must allow pinch zoom on the world canvas while retaining custom single-pointer game gestures.'
  );

  // Verify the visual change stays limited to icon glyphs, not tap-target size.
  assert.match(html, /#top-controls #settings-toggle\\{[^}]*font-size:15px/);
  assert.match(html, /\\.hud-icon-button\\{[^}]*font-size:15px/);
  assert.match(html, /\\.hud-tool\\{[^}]*font-size:15px/);
  assert.match(html, /#player-controls \\.dpad button\\{font-size:15px/);
  assert.match(html, /\\.settings-section>summary \\.settings-icon\\{[^}]*font-size:14px/);
  assert.match(html, /\\.inventory-slot \\.inventory-icon\\{font-size:17px/);
  assert.match(html, /\\.character-preset \\.look-icon\\{font-size:18px/);
  assert.match(html, /\\.hud-icon-button\\{width:34px;height:34px;min-width:34px;font-size:14px\\}/);
  assert.match(html, /#top-controls #settings-toggle\\{width:34px;height:34px;min-width:34px;font-size:14px\\}/);

  // These surfaces intentionally capture finger drawing/held-button gestures.
  assert.match(html, /#art-canvas\\{[^}]*touch-action:none/);
}
console.log('Browser zoom and compact HUD accessibility regression tests passed for live and offline entry pages.');
