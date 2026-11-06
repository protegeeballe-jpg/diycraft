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
  day:Object.freeze({sky:Object.freeze(['#759fb4','#b9c9b3','#8ca574']),ground:'#66894f',sun:'#e9d19a'}),
  sunset:Object.freeze({sky:Object.freeze(['#80536b','#b97461','#a77c62']),ground:'#76684d',sun:'#dfa96c',overlay:'rgba(83,48,43,.10)'}),
  night:Object.freeze({sky:Object.freeze(['#101a30','#202e47','#3d4d59']),ground:'#39483d',overlay:'rgba(4,8,18,.28)'})
 });
 function getPalette(timeMode,timeSeconds){
  if(!Number.isFinite(timeSeconds))throw new TypeError('Time-of-day clock must be a finite number of seconds.');
  if(!protection||typeof protection.modeAt!=='function')throw new Error('The production-parity time-mode helper is unavailable.');
  const mode=protection.modeAt(timeSeconds,timeMode);
  return Object.freeze({...PALETTES[mode],mode,sky:PALETTES[mode].sky});
 }
 return Object.freeze({PALETTES,getPalette});
});
