/* Pure door motion helpers shared by the isolated Three.js preview and tests.
   The timing and easing match DIYCraft's production Canvas 2D door animation. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeDoorMotion=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DURATION_MS=260,OPEN_ANGLE=1.32;
 function create(from,to,start,duration=DURATION_MS){
  if(!Number.isFinite(from)||!Number.isFinite(to)||!Number.isFinite(start)||
     !Number.isFinite(duration)||duration<=0)throw new TypeError('Door motion values must be finite and duration must be positive.');
  return Object.freeze({from,to,start,duration});
 }
 function angleAt(motion,now){
  if(!motion||!Number.isFinite(now)||!Number.isFinite(motion.from)||!Number.isFinite(motion.to)||
     !Number.isFinite(motion.start)||!Number.isFinite(motion.duration)||motion.duration<=0)
   throw new TypeError('A valid door motion and timestamp are required.');
  const t=Math.max(0,Math.min(1,(now-motion.start)/motion.duration));
  const eased=t*t*(3-2*t);
  return motion.from+(motion.to-motion.from)*eased;
 }
 return Object.freeze({create,angleAt,DURATION_MS,OPEN_ANGLE});
});
