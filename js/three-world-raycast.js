/* Raycast hit resolver for the Three.js editing sandbox.
   It translates scene intersections to stable sandbox block keys only. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeRaycast=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function resolve(intersections){
  if(!Array.isArray(intersections))return null;
  for(const hit of intersections){
   if(!hit||!hit.object)continue;
   const data=hit.object.userData||{};
   if(Array.isArray(data.blockKeys)&&Number.isInteger(hit.instanceId)){
    const key=data.blockKeys[hit.instanceId];
    if(typeof key==='string'&&key)return key;
   }
   if(typeof data.blockKey==='string'&&data.blockKey)return data.blockKey;
   let parent=hit.object.parent;
   while(parent){
    const parentData=parent.userData||{};
    if(typeof parentData.blockKey==='string'&&parentData.blockKey)return parentData.blockKey;
    parent=parent.parent;
   }
  }
  return null;
 }
 return Object.freeze({resolve});
});
