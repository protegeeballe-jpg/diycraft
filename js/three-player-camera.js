/* Pure first-person and third-person camera pose calculations. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreePlayerCamera=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function pose(player,mode='first'){
  if(!player||typeof player!=='object'||![player.x,player.y,player.z,player.yaw,player.pitch].every(Number.isFinite))
   throw new TypeError('A finite player pose is required.');
  if(mode==='first')return {pos:{x:player.x,y:player.y+1.58,z:player.z},yaw:player.yaw,pitch:player.pitch};
  if(mode!=='third')throw new TypeError('Camera mode must be first or third.');
  const sy=Math.sin(player.yaw),cy=Math.cos(player.yaw);
  const target={x:player.x+sy*6,y:player.y+2.1,z:player.z-cy*6};
  const pos={x:player.x-sy*5.6,y:player.y+2.8,z:player.z+cy*5.6};
  const dx=target.x-pos.x,dy=target.y-pos.y,dz=target.z-pos.z;
  return {pos,yaw:Math.atan2(dx,-dz),pitch:Math.atan2(dy,Math.hypot(dx,dz))};
 }
 return Object.freeze({pose});
});
