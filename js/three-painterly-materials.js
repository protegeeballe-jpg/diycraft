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
  const random=seeded(seed),size=Math.max(64,Math.min(256,Math.round(quality.textureSize||256))),scale=size/256,pencilScale=Math.max(.4,Math.min(1,quality.pencilScale||1)),base=rgb(hex),canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  const c=canvas.getContext('2d');
  c.fillStyle='rgb('+base.join(',')+')';c.fillRect(0,0,size,size);
  const washCount=Math.max(8,Math.round((kind==='paper'?24:32)*scale));
  for(let i=0;i<washCount;i++){
   const x=random()*size,y=random()*size,rx=10+random()*34,ry=7+random()*27;
   const tint=i%3===0?[255,246,224]:i%3===1?base.map(v=>mix(v,255,.17)):base.map(v=>mix(v,0,.12));
   const alpha=.045+random()*.08;
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
  // Visible colored-pencil hatching with varying stroke length, pressure and direction.
  c.lineCap='round';c.lineJoin='round';
  const pencilCount=Math.max(180,Math.round((kind==='paper'?1050:840)*pencilScale));
  for(let i=0;i<pencilCount;i++){
   const x=random()*size,y=random()*size,len=3+random()*(kind==='grass'?21:18);
   const angle=(random()-.5)*.9+(kind==='grass'?.28:0);
   const dx=Math.cos(angle)*len,dy=Math.sin(angle)*len;
   const light=i%5===0;
   const tint=light?base.map(v=>mix(v,255,.5)):base.map(v=>mix(v,Math.max(0,v-48),.48));
   const alpha=(light?.13:.105)+random()*.095;
   c.strokeStyle='rgba('+tint.join(',')+','+alpha+')';
   c.lineWidth=.8+random()*1.8;
   c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dx*.48,y+dy*.48+(random()-.5)*2,x+dx,y+dy);c.stroke();
  }
  // Fine paper tooth: sparse flecks and fibers.
  for(let i=0;i<Math.max(250,Math.round(1250*pencilScale));i++){
   const x=random()*size,y=random()*size,v=random()>.48?255:48,a=.025+random()*.075;
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
