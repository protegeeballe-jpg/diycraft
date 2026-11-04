/* Original DIYCraft neighbor coloring activity, isolated for the Three.js sandbox.
   The six vector sheets, cooperative neighbor color plans and flood-fill rules
   are extracted from the Canvas 2D source. This module never touches world/storage. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeNeighborColoring=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const MAX_UNDO=8,WIDTH=640,HEIGHT=460,TOLERANCE=62;
 const PNG_DATA=/^data:image\\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
 const SOURCE_COLOR_PAGES=[
 {id:'cottage',name:'Cozy cottage',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><circle cx="520" cy="82" r="42" fill="white" stroke="#263c32" stroke-width="7"/><path d="M500 82h40M520 62v40M492 54l56 56M548 54l-56 56" stroke="#263c32" stroke-width="5" stroke-linecap="round"/><path d="M105 220L320 65l215 155" fill="white" stroke="#263c32" stroke-width="10" stroke-linejoin="round"/><path d="M145 204v205h350V204Z" fill="white" stroke="#263c32" stroke-width="9"/><rect x="270" y="285" width="105" height="124" rx="5" fill="white" stroke="#263c32" stroke-width="8"/><circle cx="355" cy="348" r="6" fill="#263c32"/><rect x="180" y="250" width="70" height="68" fill="white" stroke="#263c32" stroke-width="8"/><path d="M215 250v68M180 284h70" stroke="#263c32" stroke-width="6"/><rect x="405" y="250" width="65" height="68" fill="white" stroke="#263c32" stroke-width="8"/><path d="M437 250v68M405 284h65" stroke="#263c32" stroke-width="6"/><path d="M90 410h460M100 380q25-28 50 0q25-28 50 0M450 380q25-28 50 0q25-28 50 0" fill="none" stroke="#263c32" stroke-width="7" stroke-linecap="round"/><path d="M92 350q-25-25-5-45q25-12 34 10q9-23 32-10q20 24-6 45l-27 22zM520 350q-25-25-5-45q25-12 34 10q9-23 32-10q20 24-6 45l-27 22z" fill="white" stroke="#263c32" stroke-width="6"/></svg>`},
 {id:'butterfly',name:'Garden butterfly',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><path d="M318 220C220 50 90 80 100 210c5 70 85 100 190 60C190 390 260 405 318 270C376 405 450 390 350 270c105 40 185 10 190-60C550 80 420 50 322 220Z" fill="white" stroke="#263c32" stroke-width="9" stroke-linejoin="round"/><ellipse cx="320" cy="252" rx="24" ry="88" fill="white" stroke="#263c32" stroke-width="8"/><path d="M306 173q-45-65-66-35M334 173q45-65 66-35" fill="none" stroke="#263c32" stroke-width="7" stroke-linecap="round"/><circle cx="195" cy="190" r="28" fill="white" stroke="#263c32" stroke-width="7"/><circle cx="445" cy="190" r="28" fill="white" stroke="#263c32" stroke-width="7"/><circle cx="235" cy="305" r="25" fill="white" stroke="#263c32" stroke-width="7"/><circle cx="405" cy="305" r="25" fill="white" stroke="#263c32" stroke-width="7"/><path d="M60 400h520M95 400q10-45 25-60q20 30 10 60M520 400q-10-45-25-60q-20 30-10 60" fill="none" stroke="#263c32" stroke-width="7" stroke-linecap="round"/><path d="M160 100q25-25 50 0q-25 25-50 0M430 100q25-25 50 0q-25 25-50 0" fill="white" stroke="#263c32" stroke-width="6"/></svg>`},
 {id:'kitty',name:'Happy kitty',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><path d="M170 190L145 75l115 65q60-25 120 0L495 75l-25 115q25 70-5 140q-45 90-138 90t-138-90q-30-70-19-140Z" fill="white" stroke="#263c32" stroke-width="10" stroke-linejoin="round"/><path d="M195 168l-20-65 67 39M445 142l67-39-20 65" fill="none" stroke="#263c32" stroke-width="7"/><ellipse cx="245" cy="245" rx="18" ry="25" fill="white" stroke="#263c32" stroke-width="7"/><ellipse cx="395" cy="245" rx="18" ry="25" fill="white" stroke="#263c32" stroke-width="7"/><path d="M306 292q14-15 28 0q-14 20-28 0M320 310q-24 38-52 8M320 310q24 38 52 8" fill="white" stroke="#263c32" stroke-width="7" stroke-linecap="round"/><path d="M210 300l-95-15M210 325l-100 20M430 300l95-15M430 325l100 20" stroke="#263c32" stroke-width="6" stroke-linecap="round"/><path d="M215 385q-20 45 20 45h170q40 0 20-45" fill="white" stroke="#263c32" stroke-width="8"/><path d="M190 410q-60 0-55-55q5-38 45-35" fill="none" stroke="#263c32" stroke-width="12" stroke-linecap="round"/></svg>`},
 {id:'flower',name:'Big happy flower',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><path d="M320 255v170M320 350q-90-70-125 0q65 65 125 0M320 385q90-70 125 0q-65 65-125 0" fill="white" stroke="#263c32" stroke-width="9" stroke-linejoin="round"/><g fill="white" stroke="#263c32" stroke-width="8"><ellipse cx="320" cy="112" rx="42" ry="68"/><ellipse cx="320" cy="250" rx="42" ry="68"/><ellipse cx="250" cy="180" rx="68" ry="42"/><ellipse cx="390" cy="180" rx="68" ry="42"/><ellipse cx="270" cy="130" rx="42" ry="64" transform="rotate(-45 270 130)"/><ellipse cx="370" cy="130" rx="42" ry="64" transform="rotate(45 370 130)"/><ellipse cx="270" cy="230" rx="42" ry="64" transform="rotate(45 270 230)"/><ellipse cx="370" cy="230" rx="42" ry="64" transform="rotate(-45 370 230)"/><circle cx="320" cy="180" r="57"/></g><path d="M90 425h460M130 420q0-55 35-75q35 25 35 75M440 420q0-55 35-75q35 25 35 75" fill="none" stroke="#263c32" stroke-width="7" stroke-linecap="round"/></svg>`},
 {id:'rainbow',name:'Rainbow day',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><path d="M95 365a225 225 0 0 1 450 0h-42a183 183 0 0 0-366 0z" fill="white" stroke="#263c32" stroke-width="8" stroke-linejoin="round"/><path d="M137 365a183 183 0 0 1 366 0h-42a141 141 0 0 0-282 0z" fill="white" stroke="#263c32" stroke-width="7"/><path d="M179 365a141 141 0 0 1 282 0h-42a99 99 0 0 0-198 0z" fill="white" stroke="#263c32" stroke-width="7"/><path d="M221 365a99 99 0 0 1 198 0h-42a57 57 0 0 0-114 0z" fill="white" stroke="#263c32" stroke-width="7"/><path d="M80 365q-50-5-44-55q6-44 55-40q25-45 69-20q38 25 16 70q-13 28-45 28zM465 348q-45-40-12-82q32-39 72-7q41-4 54 37q12 42-28 59z" fill="white" stroke="#263c32" stroke-width="8"/><circle cx="320" cy="75" r="37" fill="white" stroke="#263c32" stroke-width="8"/><path d="M320 15v-12M320 135v-15M260 75h-16M396 75h-16M278 33l-12-12M362 117l-12-12M362 33l12-12" stroke="#263c32" stroke-width="7" stroke-linecap="round"/></svg>`},
 {id:'sheep',name:'Fluffy sheep',svg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 460"><rect width="640" height="460" fill="#fffdf8"/><g fill="white" stroke="#263c32" stroke-width="8"><circle cx="210" cy="220" r="70"/><circle cx="280" cy="165" r="72"/><circle cx="360" cy="165" r="72"/><circle cx="430" cy="225" r="70"/><circle cx="370" cy="285" r="72"/><circle cx="270" cy="290" r="72"/><circle cx="320" cy="225" r="85"/><path d="M400 205q75-5 80 60q-5 62-80 62q-22-5-28-22v-78q9-18 28-22z"/></g><circle cx="430" cy="245" r="7" fill="#263c32"/><circle cx="470" cy="245" r="7" fill="#263c32"/><path d="M440 278q15 13 30 0M210 320v75M260 335v60M390 335v60M440 320v75M145 395h340" fill="none" stroke="#263c32" stroke-width="9" stroke-linecap="round"/><path d="M105 395q10-40 35-55q25 15 30 55M500 395q10-40 35-55q25 15 30 55" fill="white" stroke="#263c32" stroke-width="7"/></svg>`}
];
 const SOURCE_NEIGHBOR_COLOR_PLANS={
 cottage:[{x:520,y:60,color:'#f5cb54',label:'the sunny sky'},{x:320,y:238,color:'#efc9a1',label:'the cottage walls'},{x:320,y:330,color:'#8fba83',label:'the front door'}],
 butterfly:[{x:195,y:190,color:'#f2a6bd',label:'a butterfly wing'},{x:445,y:190,color:'#9cc5ed',label:'the other wing'}],
 kitty:[{x:245,y:245,color:'#f4b96b',label:'one kitty eye'},{x:395,y:245,color:'#8fc4df',label:'the other kitty eye'}],
 flower:[{x:320,y:112,color:'#f4b6cb',label:'a flower petal'},{x:250,y:180,color:'#f5d268',label:'another petal'},{x:390,y:180,color:'#a5c98c',label:'a garden petal'}],
 rainbow:[{x:320,y:160,color:'#e99b9b',label:'the outer rainbow'},{x:320,y:205,color:'#f0c46a',label:'the next rainbow band'},{x:320,y:245,color:'#8bb9d9',label:'a lower rainbow band'}],
 sheep:[{x:210,y:220,color:'#c5d9ec',label:'Pip’s fluffy coat'},{x:280,y:165,color:'#f4d58a',label:'a woolly patch'},{x:360,y:165,color:'#eeb9cd',label:'another woolly patch'}]
};
 const PAGES=Object.freeze(SOURCE_COLOR_PAGES.map(page=>Object.freeze({...page})));
 const NEIGHBOR_COLOR_PLANS=Object.freeze(Object.fromEntries(Object.entries(SOURCE_NEIGHBOR_COLOR_PLANS).map(([id,actions])=>[
  id,Object.freeze(actions.map(action=>Object.freeze({...action})))
 ])));
 const PAGE_IDS=new Set(PAGES.map(page=>page.id));
 function svgData(svg){
  if(typeof svg!=='string'||!svg.startsWith('<svg '))throw new TypeError('A valid coloring SVG is required.');
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace('<svg ','<svg width="640" height="460" '));
 }
 function fillPixels(width,height,pixels,x,y,color,onlyWhite=false){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>1000000)
   throw new RangeError('Coloring canvas dimensions are outside the safe limit.');
  if(!(pixels instanceof Uint8ClampedArray)||pixels.length!==width*height*4)
   throw new TypeError('Coloring pixels must be a complete RGBA buffer.');
  if(!Number.isFinite(x)||!Number.isFinite(y))throw new TypeError('Coloring coordinates must be finite.');
  if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color))
   throw new TypeError('Choose a valid six-digit coloring color.');
  const px=Math.max(0,Math.min(width-1,Math.round(x)));
  const py=Math.max(0,Math.min(height-1,Math.round(y)));
  const start=(py*width+px)*4,target=[pixels[start],pixels[start+1],pixels[start+2]];
  const luminance=(target[0]+target[1]+target[2])/3;
  if(luminance<115||(onlyWhite&&luminance<225))return {count:0,data:pixels};
  const fill=[parseInt(color.slice(1,3),16),parseInt(color.slice(3,5),16),parseInt(color.slice(5,7),16)];
  if(target.every((value,index)=>Math.abs(value-fill[index])<3))return {count:0,data:pixels};
  const original=new Uint8ClampedArray(pixels),data=new Uint8ClampedArray(pixels);
  const seen=new Uint8Array(width*height),stack=new Int32Array(width*height);
  let top=0,count=0;const first=py*width+px;stack[top++]=first;seen[first]=1;
  const toleranceSquared=TOLERANCE*TOLERANCE;
  while(top){
   const point=stack[--top],index=point*4;
   const dr=original[index]-target[0],dg=original[index+1]-target[1],db=original[index+2]-target[2];
   if(dr*dr+dg*dg+db*db>toleranceSquared)continue;
   data[index]=fill[0];data[index+1]=fill[1];data[index+2]=fill[2];data[index+3]=255;count++;
   const xx=point%width,yy=(point/width)|0;
   if(xx>0&&!seen[point-1]){seen[point-1]=1;stack[top++]=point-1;}
   if(xx<width-1&&!seen[point+1]){seen[point+1]=1;stack[top++]=point+1;}
   if(yy>0&&!seen[point-width]){seen[point-width]=1;stack[top++]=point-width;}
   if(yy<height-1&&!seen[point+width]){seen[point+width]=1;stack[top++]=point+width;}
  }
  return {count,data};
 }
 return Object.freeze({PAGES,NEIGHBOR_COLOR_PLANS,PAGE_IDS,MAX_UNDO,WIDTH,HEIGHT,PNG_DATA,svgData,fillPixels});
});
