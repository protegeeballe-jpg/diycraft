/* Capability-based Three.js quality and frame-pacing profile.
   Pure configuration: no browser globals, storage, or renderer side effects. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreePerformanceProfile=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const PROFILES=Object.freeze({
  low:Object.freeze({tier:'low',maxPixelRatio:1,antialias:false,shadows:false,fpsCap:30,textureSize:128,pencilScale:.72,maxAnisotropy:2}),
  balanced:Object.freeze({tier:'balanced',maxPixelRatio:1.2,antialias:false,shadows:false,fpsCap:45,textureSize:192,pencilScale:.88,maxAnisotropy:4}),
  high:Object.freeze({tier:'high',maxPixelRatio:1.5,antialias:true,shadows:true,fpsCap:60,textureSize:256,pencilScale:1,maxAnisotropy:8})
 });
 function positive(value){return typeof value==='number'&&Number.isFinite(value)&&value>0?value:null;}
 function select(capabilities){
  const c=capabilities&&typeof capabilities==='object'?capabilities:{};
  const cores=positive(c.hardwareConcurrency),memory=positive(c.deviceMemory),texture=positive(c.maxTextureSize);
  const mobile=!!c.mobile,saveData=!!c.saveData,lowTexture=texture!==null&&texture<=2048;
  if(saveData||lowTexture||(memory!==null&&memory<=3)||(mobile&&cores!==null&&cores<=4))return PROFILES.low;
  if(mobile||(cores!==null&&cores<=6)||(memory!==null&&memory<=6))return PROFILES.balanced;
  return PROFILES.high;
 }
 function createFrameGate(fpsCap){
  if(!positive(fpsCap)||fpsCap>240)throw new TypeError('Frame cap must be a positive value no greater than 240.');
  const interval=1000/fpsCap;
  let last=-Infinity;
  return Object.freeze({
   shouldRender(now){
    if(!Number.isFinite(now))return false;
    if(now-last+1e-6<interval)return false;
    last=now;return true;
   },
   reset(){last=-Infinity;},
   get intervalMs(){return interval;}
  });
 }
 function browserCapabilities(navigatorLike,matchMediaResult,maxTextureSize,saveData){
  const n=navigatorLike&&typeof navigatorLike==='object'?navigatorLike:{};
  return {
   hardwareConcurrency:n.hardwareConcurrency,
   deviceMemory:n.deviceMemory,
   mobile:!!(n.userAgentData&&n.userAgentData.mobile)||!!matchMediaResult||
    (typeof n.maxTouchPoints==='number'&&n.maxTouchPoints>0&&!!n.userAgent&&/Android|iPhone|iPad|iPod|Mobile/i.test(n.userAgent)),
   saveData:!!saveData||!!(n.connection&&n.connection.saveData),
   maxTextureSize
  };
 }
 return Object.freeze({select,createFrameGate,browserCapabilities,profiles:PROFILES});
});
