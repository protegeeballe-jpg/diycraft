/* Keep the perspective camera and WebGL drawing buffer matched to the canvas's real CSS size.
   This prevents perspective distortion on portrait phones, wide laptops and tablets. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeViewport=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function measure(canvas,windowRef){
  const rect=canvas&&typeof canvas.getBoundingClientRect==='function'?canvas.getBoundingClientRect():null;
  const width=Math.max(1,Math.round((rect&&rect.width)||canvas?.clientWidth||windowRef?.innerWidth||1));
  const height=Math.max(1,Math.round((rect&&rect.height)||canvas?.clientHeight||windowRef?.innerHeight||1));
  return {width,height,aspect:width/height};
 }
 function create(canvas,camera,renderer,windowRef,options={}){
  if(!canvas||!camera||!renderer||!windowRef)throw new TypeError('Canvas, camera, renderer and window are required for viewport sizing.');
  const maxPixelRatio=Number.isFinite(options.maxPixelRatio)&&options.maxPixelRatio>0?options.maxPixelRatio:2;
  let current={width:0,height:0,aspect:0,pixelRatio:0},observer=null;
  const viewport=windowRef.visualViewport||null;
  function resize(){
   const size=measure(canvas,windowRef);
   const deviceRatio=Number(windowRef.devicePixelRatio)||1;
   const pixelRatio=Math.max(1,Math.min(deviceRatio,maxPixelRatio));
   if(Math.abs(camera.aspect-size.aspect)>1e-7){
    camera.aspect=size.aspect;
    camera.updateProjectionMatrix();
   }
   if(size.width!==current.width||size.height!==current.height||pixelRatio!==current.pixelRatio){
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(size.width,size.height,false);
   }
   current={...size,pixelRatio};
   return {...current};
  }
  const onResize=()=>resize();
  windowRef.addEventListener('resize',onResize,{passive:true});
  windowRef.addEventListener('orientationchange',onResize,{passive:true});
  if(viewport&&typeof viewport.addEventListener==='function')viewport.addEventListener('resize',onResize,{passive:true});
  const Observer=windowRef.ResizeObserver;
  if(typeof Observer==='function'){
   observer=new Observer(onResize);
   observer.observe(canvas);
  }
  resize();
  return Object.freeze({
   resize,
   getSize:()=>({...current}),
   dispose(){
    if(observer)observer.disconnect();
    windowRef.removeEventListener('resize',onResize);
    windowRef.removeEventListener('orientationchange',onResize);
    if(viewport&&typeof viewport.removeEventListener==='function')viewport.removeEventListener('resize',onResize);
   }
  });
 }
 return Object.freeze({measure,create});
});
