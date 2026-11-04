'use strict';
const assert=require('node:assert/strict');
const coloring=require('../js/three-neighbor-coloring.js');

function test(name,fn){
 try{fn();console.log('PASS '+name);}
 catch(error){console.error('FAIL '+name+'\n'+(error.stack||error));process.exitCode=1;}
}
function rgb(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16),255];}
function setPixel(pixels,width,x,y,color){
 const at=(y*width+x)*4;pixels.set(color,at);
}
test('retains the six original neighbor coloring sheets and their cooperative color plans',()=>{
 assert.deepEqual(coloring.PAGES.map(page=>page.id),['cottage','butterfly','kitty','flower','rainbow','sheep']);
 assert.deepEqual(coloring.PAGES.map(page=>page.name),['Cozy cottage','Garden butterfly','Happy kitty','Big happy flower','Rainbow day','Fluffy sheep']);
 for(const page of coloring.PAGES){
  assert.ok(page.svg.startsWith('<svg xmlns='));
  assert.ok(coloring.svgData(page.svg).startsWith('data:image/svg+xml;charset=utf-8,'));
  assert.ok(coloring.NEIGHBOR_COLOR_PLANS[page.id].length>=2);
 }
 assert.equal(coloring.NEIGHBOR_COLOR_PLANS.cottage[0].color,'#f5cb54');
 assert.equal(coloring.NEIGHBOR_COLOR_PLANS.sheep[0].label,'Pip’s fluffy coat');
});
test('flood fill colors only the connected white region and respects closed line boundaries',()=>{
 const width=6,height=4,pixels=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)
  setPixel(pixels,width,x,y,x===3?rgb('#263c32'):rgb('#ffffff'));
 const result=coloring.fillPixels(width,height,pixels,1,2,'#f44336');
 assert.equal(result.count,12,'The fill must reach all twelve cells on the starting side of the black divider.');
 for(let y=0;y<height;y++){
  for(let x=0;x<width;x++){
   const at=(y*width+x)*4;
   if(x<3)assert.deepEqual(Array.from(result.data.slice(at,at+4)),rgb('#f44336'));
   else if(x===3)assert.deepEqual(Array.from(result.data.slice(at,at+4)),rgb('#263c32'));
   else assert.deepEqual(Array.from(result.data.slice(at,at+4)),rgb('#ffffff'));
  }
 }
 assert.deepEqual(Array.from(pixels),Array.from(new Uint8ClampedArray(width*height*4).map((_,i)=>{
  const cell=Math.floor(i/4),x=cell%width,y=Math.floor(cell/width);
  return x===3?([0x26,0x3c,0x32,0xff][i%4]):0xff;
 })), 'The helper must not mutate the original canvas image buffer.');
});
test('matches the original white-only threshold used for the neighbor coloring brush',()=>{
 const gray=new Uint8ClampedArray([200,200,200,255]);
 assert.equal(coloring.fillPixels(1,1,gray,0,0,'#ff0000',true).count,0,'Neighbor fills only near-white areas.');
 assert.equal(coloring.fillPixels(1,1,gray,0,0,'#ff0000',false).count,1,'Player bucket can fill areas above the original 115 luminance threshold.');
 const black=new Uint8ClampedArray([0,0,0,255]);
 assert.equal(coloring.fillPixels(1,1,black,0,0,'#ff0000',false).count,0);
});
test('handles same-color fills and validates dimensions, pixels, coordinates and color input',()=>{
 const red=new Uint8ClampedArray([255,0,0,255]);
 assert.equal(coloring.fillPixels(1,1,red,0,0,'#ff0000').count,0);
 assert.throws(()=>coloring.fillPixels(0,1,red,0,0,'#ff0000'),/dimensions/);
 assert.throws(()=>coloring.fillPixels(1,1,new Uint8ClampedArray(3),0,0,'#ff0000'),/RGBA/);
 assert.throws(()=>coloring.fillPixels(1,1,red,NaN,0,'#ff0000'),/finite/);
 assert.throws(()=>coloring.fillPixels(1,1,red,0,0,'red'),/six-digit/);
 assert.equal(coloring.MAX_UNDO,8);
});
console.log('Three.js neighbor coloring tests complete.');
