/* Shared procedural watercolor + colored-pencil material generator for DIYCraft.
   Textures are created locally on canvas and reused by Three.js materials. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftPainterlyMaterials=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function seeded(seed){
  let x=(seed>>>0)||1;
  return function(){x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
 }
 function hash(value){
  let h=2166136261;
  for(let i=0;i<String(value).length;i++)h=Math.imul(h^String(value).charCodeAt(i),16777619);
  return h>>>0;
 }
 function rgb(hex){
  const n=parseInt(String(hex).slice(1),16);
  return [(n>>16)&255,(n>>8)&255,n&255];
 }
 function mix(a,b,t){return Math.round(a+(b-a)*t);}
 function generateCanvas(hex,seed,kind,quality={}){
  const random=seeded(seed),size=Math.max(64,Math.min(256,Math.round(quality.textureSize||256))),scale=size/256,pencilScale=Math.max(.75,Math.min(1.35,Number.isFinite(quality.pencilScale)?quality.pencilScale:1)),watercolorStrength=Math.max(.8,Math.min(1.6,Number.isFinite(quality.watercolorStrength)?quality.watercolorStrength:1.2)),pencilStrength=Math.max(.8,Math.min(1.6,Number.isFinite(quality.pencilStrength)?quality.pencilStrength:1.18)),base=rgb(hex),canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const c=canvas.getContext('2d');
  c.fillStyle='rgb('+base.join(',')+')';c.fillRect(0,0,size,size);
  const washCount=Math.max(10,Math.round((kind==='paper'?30:42)*scale*watercolorStrength));
  for(let i=0;i<washCount;i++){
   const x=random()*size,y=random()*size,rx=12+random()*44,ry=9+random()*35;
   const tint=i%3===0?[255,244,218]:i%3===1?base.map(v=>mix(v,255,.23)):base.map(v=>mix(v,0,.18));
   const alpha=Math.min(.24,(.055+random()*.10)*watercolorStrength);
   const gradient=c.createRadialGradient(x,y,1,x,y,Math.max(rx,ry)*1.4);
   gradient.addColorStop(0,'rgba('+tint.join(',')+','+(alpha*1.8)+')');
   gradient.addColorStop(.55,'rgba('+tint.join(',')+','+alpha+')');
   gradient.addColorStop(1,'rgba('+tint.join(',')+',0)');
   c.fillStyle=gradient;c.beginPath();c.ellipse(x,y,rx,ry,random()*Math.PI,0,Math.PI*2);c.fill();
  }
  // Motifs for decorative surfaces sit below the pencil shading, never replacing it.
  if(kind.startsWith('tile-')){
   const pattern=kind.slice(5);
   c.save();c.strokeStyle='rgba(78,84,66,.23)';c.fillStyle='rgba(255,248,225,.20)';c.lineWidth=2;
   if(pattern==='waves'){
    for(let y=16;y<size;y+=34){c.beginPath();for(let x=0;x<=size;x+=5){const py=y+Math.sin(x/17)*6;x?c.lineTo(x,py):c.moveTo(x,py);}c.stroke();}
   }else if(pattern==='dots'||pattern==='terrazzo'||pattern==='pebble'){
    for(let i=0;i<90;i++){const x=random()*size,y=random()*size,r=2+random()*5;c.beginPath();c.ellipse(x,y,r,r*.65,random()*Math.PI,0,Math.PI*2);c.fill();}
   }else if(pattern==='floral'||pattern==='stars'||pattern==='sunburst'){
    for(let y=28;y<size;y+=64)for(let x=28;x<size;x+=64){
     for(let k=0;k<8;k++){const a=k*Math.PI/4;c.beginPath();c.ellipse(x+Math.cos(a)*10,y+Math.sin(a)*10,7,3,a,0,Math.PI*2);c.stroke();}
     c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();
    }
   }else{
    const step=pattern==='hexagon'?32:48;
    for(let p=-size;p<size*2;p+=step){c.beginPath();c.moveTo(p,0);c.lineTo(p+size,size);c.stroke();}
    if(pattern==='brick'||pattern==='grid'||pattern==='checker'||pattern==='basket'){
     for(let y=0;y<size;y+=step){c.beginPath();c.moveTo(0,y);c.lineTo(size,y);c.stroke();}
     if(pattern==='grid'||pattern==='checker'||pattern==='basket')for(let x=0;x<size;x+=step){c.beginPath();c.moveTo(x,0);c.lineTo(x,size);c.stroke();}
    }
   }
   c.restore();
  }
  if(kind.startsWith('door-')){
   const style=kind.slice(5),sx=size/256;
   const px=x=>x/.84*size,py=y=>(1.96-y)/1.96*size;
   const rect=(x,y,w,h,fill)=>{
    const left=px(x),right=px(x+w),top=py(y+h),bottom=py(y);
    c.fillStyle=fill;c.fillRect(left,top,right-left,bottom-top);
   };
   const line=(x1,y1,x2,y2,color,width)=>{
    c.strokeStyle=color;c.lineWidth=Math.max(.8,width*sx);c.beginPath();c.moveTo(px(x1),py(y1));c.lineTo(px(x2),py(y2));c.stroke();
   };
   const panel=(x,y,w,h)=>{
    rect(x,y,w,h,'rgba(75,48,31,.78)');
    rect(x+.035,y+.035,w-.07,h-.07,'rgba(219,170,112,.64)');
    rect(x+.055,y+.055,w-.11,h-.11,'rgba(137,84,48,.35)');
   };
   c.save();c.lineJoin='round';c.lineCap='round';
   // Two inset panels are mirrored on both sides of the physical door by the box UVs.
   if(style==='window'){
    panel(.15,.18,.54,.58);
    rect(.15,1.10,.54,.56,'rgba(91,59,39,.94)');
    rect(.18,1.14,.48,.48,'rgba(134,195,210,.94)');
    // Gentle watercolor reflections across the upper glass pane.
    const glass= c.createLinearGradient(px(.18),py(1.62),px(.66),py(1.14));
    glass.addColorStop(0,'rgba(241,250,239,.44)');glass.addColorStop(.48,'rgba(158,219,227,.08)');glass.addColorStop(1,'rgba(89,156,183,.35)');
    rect(.18,1.14,.48,.48,glass);
    line(.405,1.14,.405,1.62,'rgba(246,235,205,.95)',.045);
    line(.18,1.38,.66,1.38,'rgba(246,235,205,.95)',.045);
    line(.18,1.10,.66,1.10,'rgba(91,59,39,.95)',.035);
    line(.18,1.66,.66,1.66,'rgba(91,59,39,.95)',.035);
   }else{
    panel(.13,.18,.58,.66);
    panel(.13,1.08,.58,.66);
    if(style==='garden'){
     const cx=.43,cy=1.43,petal='#e78baa',light='#f2c4d5';
     for(let i=0;i<8;i++){
      const a=i*Math.PI/4,x=cx+Math.cos(a)*.095,y=cy+Math.sin(a)*.095;
      c.fillStyle=i%2?light:petal;c.beginPath();c.ellipse(px(x),py(y),size*.034,size*.018,-a,0,Math.PI*2);c.fill();
     }
     c.fillStyle='#f3d36c';c.beginPath();c.arc(px(cx),py(cy),size*.017,0,Math.PI*2);c.fill();
     c.strokeStyle='rgba(255,243,213,.85)';c.lineWidth=Math.max(.65,sx*.9);
     c.beginPath();c.arc(px(cx),py(cy),size*.09,0,Math.PI*2);c.stroke();
    }
   }
   // A small brass handle and two hinge accents remain legible on each style.
   c.fillStyle='rgba(239,199,104,.96)';c.beginPath();c.arc(px(.70),py(.88),Math.max(1.8,size*.012),0,Math.PI*2);c.fill();
   c.fillStyle='rgba(255,235,172,.66)';c.beginPath();c.arc(px(.695),py(.89),Math.max(1,size*.004),0,Math.PI*2);c.fill();
   for(const y of [.28,1.55])rect(.018,y,.034,.12,'rgba(83,56,39,.74)');
   c.restore();
  }
  // Visible colored-pencil hatching with varying stroke length, pressure and direction.
  c.lineCap='round';c.lineJoin='round';
  const pencilCount=Math.max(220,Math.round((kind==='paper'?1420:1120)*pencilScale*pencilStrength));
  for(let i=0;i<pencilCount;i++){
   const x=random()*size,y=random()*size,len=5+random()*(kind==='grass'?24:20);
   const angle=(random()-.5)*.9+(kind==='grass'?.28:0);
   const dx=Math.cos(angle)*len,dy=Math.sin(angle)*len;
   const light=i%5===0;
   const tint=light?base.map(v=>mix(v,255,.62)):base.map(v=>mix(v,Math.max(0,v-62),.60));
   const alpha=Math.min(.34,((light?.17:.14)+random()*.11)*pencilStrength);
   c.strokeStyle='rgba('+tint.join(',')+','+alpha+')';
   c.lineWidth=.95+random()*1.8;
   c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dx*.48,y+dy*.48+(random()-.5)*2,x+dx,y+dy);c.stroke();
  }
  // A lighter cross-hatch pass adds layered colored-pencil pressure without a screen filter.
  const crossHatchCount=Math.round(pencilCount*.24);
  for(let i=0;i<crossHatchCount;i++){
   const x=random()*size,y=random()*size,len=3+random()*(kind==='grass'?17:14);
   const angle=(random()-.5)*.86+(kind==='grass'?1.04:.88);
   const dx=Math.cos(angle)*len,dy=Math.sin(angle)*len;
   const tint=i%4===0?base.map(v=>mix(v,255,.48)):base.map(v=>mix(v,Math.max(0,v-58),.52));
   const alpha=Math.min(.25,(.075+random()*.075)*pencilStrength);
   c.strokeStyle='rgba('+tint.join(',')+','+alpha+')';
   c.lineWidth=.7+random()*1.15;
   c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dx*.48,y+dy*.48+(random()-.5)*1.6,x+dx,y+dy);c.stroke();
  }
  // Fine paper tooth: visible flecks and fibers, bounded by the texture size.
  for(let i=0;i<Math.max(300,Math.round(1450*pencilScale));i++){
   const x=random()*size,y=random()*size,v=random()>.48?255:48,a=.035+random()*.085;
   c.fillStyle='rgba('+v+','+v+','+v+','+a+')';c.fillRect(x,y,.45+random()*1.1,.35+random()*.8);
  }
  return canvas;
 }
 function create(THREE,renderer,quality={}){
  if(!THREE||!renderer)throw new TypeError('Three.js and a renderer are required.');
  const cache=new Map(),textures=new Set();
  function get(hex,kind='surface',options={}){
   const safe=/^#[0-9a-f]{6}$/i.test(hex||'')?hex:'#9ca6a1';
   const key=safe+'|'+kind+'|'+(options.glass?'glass':'solid');
   if(cache.has(key))return cache.get(key);
   const map=new THREE.CanvasTexture(generateCanvas(safe,hash(key),kind,quality));
   map.wrapS=map.wrapT=THREE.RepeatWrapping;
   map.anisotropy=Math.min(quality.maxAnisotropy||8,renderer.capabilities.getMaxAnisotropy());
   map.encoding=THREE.sRGBEncoding;
   textures.add(map);
   const material=new THREE.MeshStandardMaterial({
    map,color:0xffffff,roughness:options.roughness??.94,
    metalness:0,transparent:!!options.glass,opacity:options.glass?.58:1,
    depthWrite:!options.glass
   });
   cache.set(key,material);return material;
  }
  return Object.freeze({
   get,
   get materialCount(){return cache.size;},
   get textureCount(){return textures.size;},
   dispose(){for(const material of cache.values())material.dispose();for(const texture of textures)texture.dispose();cache.clear();textures.clear();}
  });
 }
 return Object.freeze({create,generateCanvas});
});
