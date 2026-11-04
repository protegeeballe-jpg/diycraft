/* Production-aligned door layout helper shared by Three.js previews. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeDoorModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const WIDTH=.84,HEIGHT=1.96,THICKNESS=.12;
 const HEX=/^#[0-9a-f]{6}$/i;
 function create(block){
  if(!block||!Number.isInteger(block.x)||!Number.isInteger(block.y)||!Number.isInteger(block.z))
   throw new TypeError('A door block with whole-number coordinates is required.');
  const orientation=block.orientation==='ew'?'ew':'ns';
  const style=['classic','window','garden'].includes(block.style)?block.style:'classic';
  const swing=block.swing===-1?-1:1;
  const pivot=orientation==='ew'
   ?Object.freeze({x:block.x+.5,y:block.y,z:block.z+.08})
   :Object.freeze({x:block.x+.08,y:block.y,z:block.z+.5});
  return Object.freeze({
   key:typeof block.key==='string'?block.key:'',
   style,orientation,swing,
   color:typeof block.color==='string'&&HEX.test(block.color)?block.color:'#a97545',
   pivot,
   baseAngle:orientation==='ew'?-Math.PI/2:0,
   width:WIDTH,height:HEIGHT,thickness:THICKNESS,
   localCenter:Object.freeze({x:WIDTH/2,y:HEIGHT/2,z:-THICKNESS/2}),
   textureKind:'door-'+style,
   angle(openAngle){return this.baseAngle+(Number.isFinite(openAngle)?openAngle:0)*this.swing;}
  });
 }
 return Object.freeze({create,dimensions:Object.freeze({width:WIDTH,height:HEIGHT,thickness:THICKNESS})});
});
