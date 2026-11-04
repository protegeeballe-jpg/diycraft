/* Original DIYCraft time-of-day palettes for the isolated Three.js renderer.
   Mode transitions are delegated to the production-parity protection helper. */
(function(root,factory){
 'use strict';
 const api=factory(root&&root.DIYCraftThreeWorldProtection);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeWorldTime=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(protection){
 'use strict';
 const PALETTES=Object.freeze({
  day:Object.freeze({sky:Object.freeze(['#8fc6e2','#d8e9d2','#b3d39a']),ground:'#80bd65',sun:'#fff2bc'}),
  sunset:Object.freeze({sky:Object.freeze(['#a66e82','#e7a07e','#d7a77f']),ground:'#9a8967',sun:'#ffcb83',overlay:'rgba(255,123,79,.07)'}),
  night:Object.freeze({sky:Object.freeze(['#14213d','#263858','#52606e']),ground:'#465848',overlay:'rgba(8,14,37,.24)'})
 });
 function getPalette(timeMode,timeSeconds){
  if(!Number.isFinite(timeSeconds))throw new TypeError('Time-of-day clock must be a finite number of seconds.');
  if(!protection||typeof protection.modeAt!=='function')throw new Error('The production-parity time-mode helper is unavailable.');
  const mode=protection.modeAt(timeSeconds,timeMode);
  return Object.freeze({...PALETTES[mode],mode,sky:PALETTES[mode].sky});
 }
 return Object.freeze({PALETTES,getPalette});
});
