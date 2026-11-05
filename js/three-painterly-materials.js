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

 function drawTilePattern(context,pattern,random,scale){
  const c=context;
  c.save();c.scale(scale,scale);
  const ink='rgba(66,72,56,.48)',soft='rgba(255,249,226,.36)',shade='rgba(53,61,52,.20)',accent='rgba(255,255,255,.30)';
  c.lineWidth=2.4;c.lineJoin='round';c.lineCap='round';
  const line=(x1,y1,x2,y2,color=ink,width=2.4)=>{
   c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
  };
  const poly=(points,fill,stroke=ink)=>{
   c.beginPath();points.forEach((point,index)=>index?c.lineTo(point[0],point[1]):c.moveTo(point[0],point[1]));
   c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}
  };
  const star=(x,y,outer,inner,points=5)=>{
   const vertices=[];for(let i=0;i<points*2;i++){const angle=-Math.PI/2+i*Math.PI/points,r=i%2?inner:outer;vertices.push([x+Math.cos(angle)*r,y+Math.sin(angle)*r]);}
   poly(vertices,soft,ink);
  };
  switch(pattern){
   case 'grid':
    for(let p=0;p<=256;p+=64){line(p,0,p,256);line(0,p,256,p);}
    break;
   case 'brick':
    for(let y=0,row=0;y<=256;y+=42,row++){
     line(0,y,256,y,ink,2.8);
     const offset=row%2?32:0;
     for(let x=offset;x<=256;x+=64)line(x,y,x,y+42,ink,2.4);
     for(let x=offset+3;x<256;x+=64)line(x+2,y+3,x+59,y+3,soft,1.3);
    }
    break;
   case 'checker':
    for(let y=0,row=0;y<256;y+=32,row++)for(let x=0,col=0;x<256;x+=32,col++)
     if((row+col)%2===0){c.fillStyle=shade;c.fillRect(x,y,32,32);c.strokeStyle=soft;c.strokeRect(x+2,y+2,28,28);}
    for(let p=0;p<=256;p+=32){line(p,0,p,256,ink,1.2);line(0,p,256,p,ink,1.2);}
    break;
   case 'diagonal':
    for(let p=-256;p<=512;p+=27)line(p,0,p+256,256,ink,2.6);
    for(let p=-256;p<=512;p+=54)line(p+7,0,p+263,256,soft,1.4);
    break;
   case 'diamond':
    for(let x=-256;x<=512;x+=48){line(x,0,x+256,256);line(x,256,x+256,0);}
    for(let x=24;x<256;x+=96)for(let y=24;y<256;y+=96){
     c.fillStyle=soft;c.beginPath();c.arc(x,y,3.5,0,Math.PI*2);c.fill();
    }
    break;
   case 'hexagon':{
    const radius=22,w=Math.sqrt(3)*radius,h=1.5*radius;
    for(let row=-1;row<8;row++)for(let col=-1;col<8;col++){
     const cx=col*w+(row%2)*w/2,cy=row*h;
     const pts=[];for(let k=0;k<6;k++){const angle=(60*k-30)*Math.PI/180;pts.push([cx+radius*Math.cos(angle),cy+radius*Math.sin(angle)]);}
     poly(pts,null,ink);
    }
    break;
   }
   case 'herringbone':
    // Repeating interlocked short planks with alternating direction.
    for(let row=-1;row<9;row++)for(let col=-1;col<9;col++){
     const x=col*36+(row%2)*18,y=row*32;
     if((row+col)%2===0){
      c.fillStyle=soft;c.fillRect(x+2,y+2,31,13);c.strokeStyle=ink;c.strokeRect(x+2,y+2,31,13);
      line(x+5,y+5,x+27,y+5,accent,1.4);
     }else{
      c.fillStyle=shade;c.fillRect(x+3,y+3,13,27);c.strokeStyle=ink;c.strokeRect(x+3,y+3,13,27);
      line(x+6,y+7,x+6,y+25,soft,1.3);
     }
    }
    break;
   case 'basket':
    for(let y=0,row=0;y<256;y+=32,row++)for(let x=0,col=0;x<256;x+=32,col++){
     const horizontal=(row+col)%2===0;
     c.fillStyle=horizontal?soft:shade;c.fillRect(x+1,y+1,30,30);
     c.strokeStyle=ink;c.strokeRect(x+1,y+1,30,30);
     if(horizontal){line(x+5,y+10,x+27,y+10,accent,2);line(x+5,y+21,x+27,y+21,ink,1);}
     else{line(x+10,y+5,x+10,y+27,accent,2);line(x+21,y+5,x+21,y+27,ink,1);}
    }
    break;
   case 'mosaic':
    for(let y=-4;y<256;y+=32)for(let x=-4;x<256;x+=32){
     const ox=random()*7,oy=random()*7,cut=5+random()*7;
     const tone=random()>.5?soft:shade;
     poly([[x+ox,y+oy],[x+29+ox,y+2+oy],[x+31+ox,y+cut+oy],[x+24+ox,y+29+oy],[x+3+ox,y+27+oy]],tone,ink);
    }
    break;
   case 'terrazzo':
    for(let i=0;i<115;i++){
     const x=random()*256,y=random()*256,r=2+random()*7,a=random()*Math.PI;
     c.save();c.translate(x,y);c.rotate(a);
     c.fillStyle=i%3===0?soft:shade;c.beginPath();c.ellipse(0,0,r*1.5,r*.72,0,0,Math.PI*2);c.fill();
     c.strokeStyle=ink;c.lineWidth=1.1;c.stroke();c.restore();
    }
    break;
   case 'waves':
    for(let y=14;y<280;y+=29){
     c.beginPath();for(let x=-4;x<=264;x+=3){const py=y+Math.sin(x/15+y/21)*7+Math.sin(x/37)*2;x===-4?c.moveTo(x,py):c.lineTo(x,py);}
     c.strokeStyle=ink;c.lineWidth=2.2;c.stroke();
     c.beginPath();for(let x=-4;x<=264;x+=3){const py=y+4+Math.sin(x/15+y/21)*7+Math.sin(x/37)*2;x===-4?c.moveTo(x,py):c.lineTo(x,py);}
     c.strokeStyle=soft;c.lineWidth=1.3;c.stroke();
    }
    break;
   case 'dots':
    for(let y=18;y<256;y+=40)for(let x=18;x<256;x+=40){
     c.fillStyle=shade;c.beginPath();c.arc(x+2,y+2,8,0,Math.PI*2);c.fill();
     c.fillStyle=soft;c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fill();
     c.strokeStyle=ink;c.lineWidth=1.3;c.stroke();
    }
    break;
   case 'floral':
    for(let y=26;y<280;y+=70)for(let x=26;x<280;x+=70){
     for(let k=0;k<8;k++){const a=k*Math.PI/4;c.fillStyle=k%2?soft:shade;c.beginPath();c.ellipse(x+Math.cos(a)*11,y+Math.sin(a)*11,9,4,a,0,Math.PI*2);c.fill();c.strokeStyle=ink;c.lineWidth=1;c.stroke();}
     c.fillStyle='rgba(233,190,91,.75)';c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fill();c.strokeStyle=ink;c.stroke();
     c.strokeStyle=soft;c.lineWidth=1.5;c.beginPath();c.arc(x,y,18,0,Math.PI*2);c.stroke();
    }
    break;
   case 'stars':
    for(let y=24;y<280;y+=64)for(let x=24;x<280;x+=64){star(x,y,18,7,5);c.fillStyle=soft;c.fillRect(x-1,y-22,2,44);c.fillRect(x-22,y-1,44,2);}
    break;
   case 'sunburst':
    for(let y=32;y<280;y+=64)for(let x=32;x<280;x+=64){
     for(let k=0;k<16;k++){const a=k*Math.PI/8;line(x+Math.cos(a)*8,y+Math.sin(a)*8,x+Math.cos(a)*27,y+Math.sin(a)*27,k%2?soft:ink,k%2?1.4:2.2);}
     c.fillStyle=soft;c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fill();c.strokeStyle=ink;c.stroke();
    }
    break;
   case 'scallop':
    for(let y=0,row=0;y<320;y+=32,row++)for(let x=-32+(row%2)*16;x<288;x+=32){
     c.beginPath();c.arc(x,y,17,Math.PI,Math.PI*2);c.strokeStyle=ink;c.lineWidth=2.3;c.stroke();
     c.beginPath();c.arc(x,y-2,13,Math.PI,Math.PI*2);c.strokeStyle=soft;c.lineWidth=1.6;c.stroke();
    }
    break;
   case 'parquet':
    for(let row=0;row<8;row++)for(let col=0;col<5;col++){
     const x=col*64-32,y=row*34;
     const flip=(row+col)%2;
     const pts=flip?[[x,y+2],[x+60,y+2],[x+30,y+32]]:[[x+2,y+2],[x+62,y+2],[x+32,y+32]];
     poly(pts,flip?shade:soft,ink);
     line(x+32,y+7,x+32,y+27,accent,1.3);
    }
    break;
   case 'pebble':
    for(let y=-8;y<280;y+=38)for(let x=-8;x<280;x+=42){
     const ox=(random()-.5)*9,oy=(random()-.5)*8,rx=13+random()*5,ry=10+random()*5;
     c.fillStyle=random()>.5?soft:shade;c.beginPath();c.ellipse(x+ox,y+oy,rx,ry,random()*.5,0,Math.PI*2);c.fill();
     c.strokeStyle=ink;c.lineWidth=2;c.stroke();
     c.strokeStyle=accent;c.lineWidth=1.2;c.beginPath();c.arc(x+ox-2,y+oy-2,rx*.58,Math.PI*1.05,Math.PI*1.75);c.stroke();
    }
    break;
   case 'cross':
    for(let y=18;y<280;y+=48)for(let x=18;x<280;x+=48){
     c.fillStyle=soft;c.fillRect(x-4,y-15,8,30);c.fillRect(x-15,y-4,30,8);
     c.strokeStyle=ink;c.lineWidth=1.8;c.strokeRect(x-4,y-15,8,30);c.strokeRect(x-15,y-4,30,8);
     c.fillStyle=shade;c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();
    }
    break;
   case 'spiral':
    for(let y=34;y<280;y+=72)for(let x=34;x<280;x+=72){
     c.beginPath();for(let t=0;t<=Math.PI*5.2;t+=.12){const radius=1.5+t*2.25,px=x+Math.cos(t)*radius,py=y+Math.sin(t)*radius;t===0?c.moveTo(px,py):c.lineTo(px,py);}
     c.strokeStyle=ink;c.lineWidth=2.1;c.stroke();
     c.fillStyle=soft;c.beginPath();c.arc(x,y,3.5,0,Math.PI*2);c.fill();
    }
    break;
   default:
    for(let p=0;p<=256;p+=64){line(p,0,p,256);line(0,p,256,p);}
  }
  c.restore();
 }

 function drawSolidTexture(context,kind,random,scale){
  const c=context;c.save();c.scale(scale,scale);c.lineCap='round';c.lineJoin='round';
  const ink='rgba(52,63,49,.42)',soft='rgba(255,250,228,.42)',shade='rgba(43,52,43,.20)';
  const line=(x1,y1,x2,y2,color=ink,width=2)=>{
   c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
  };
  if(kind==='stone'){
   // Angular mineral seams, small inclusions and fractured stone faces.
   for(let i=0;i<11;i++){
    const x=random()*256,y=random()*256,reach=24+random()*42;
    c.beginPath();c.moveTo(x,y);
    for(let j=1;j<5;j++)c.lineTo(x+(random()-.5)*reach+j*reach*.13,y+j*reach*.18+(random()-.5)*15);
    c.strokeStyle=ink;c.lineWidth=2.2+random()*1.2;c.stroke();
    c.strokeStyle=soft;c.lineWidth=.9;c.stroke();
   }
   for(let i=0;i<48;i++){
    const x=random()*256,y=random()*256,r=1.2+random()*3.5;c.fillStyle=i%2?soft:shade;
    c.beginPath();c.ellipse(x,y,r*1.4,r,random(),0,Math.PI*2);c.fill();
   }
   for(let i=0;i<5;i++){const x=random()*256,y=random()*256;c.strokeStyle=soft;c.lineWidth=2;c.beginPath();c.arc(x,y,9+random()*12,.2,2.8);c.stroke();}
  }else if(kind==='grass'){
   // Distinct blades and small clumps rather than generic surface hatching.
   for(let i=0;i<17;i++){
    const x=random()*256,y=random()*256,h=16+random()*38,w=4+random()*8;
    c.fillStyle=i%3?soft:shade;c.beginPath();c.moveTo(x-w,y);c.quadraticCurveTo(x-w*.2,y-h*.6,x+(random()-.5)*w,y-h);c.quadraticCurveTo(x+w*.5,y-h*.45,x+w,y);c.closePath();c.fill();
    line(x,y,x+(random()-.5)*w,y-h*.82,ink,1.1);
   }
   for(let i=0;i<12;i++){const x=random()*256,y=random()*256;c.strokeStyle=soft;c.lineWidth=2;c.beginPath();c.arc(x,y,4+random()*7,Math.PI*1.05,Math.PI*1.95);c.stroke();}
  }else if(kind==='leaves'){
   for(let y=18;y<280;y+=48)for(let x=18;x<280;x+=48){
    for(let k=0;k<3;k++){
     const cx=x+(random()-.5)*22,cy=y+(random()-.5)*22,a=(k-1)*.8;
     c.save();c.translate(cx,cy);c.rotate(a);
     c.fillStyle=k%2?soft:shade;c.beginPath();c.ellipse(0,0,17,7,0,0,Math.PI*2);c.fill();
     c.strokeStyle=ink;c.lineWidth=1.5;c.stroke();line(-13,0,13,0,soft,1.7);
     for(let n=-1;n<=1;n+=2){line(n*3,0,n*9,-3,ink,1);line(n*3,0,n*9,3,ink,1);}
     c.restore();
    }
   }
  }else if(kind==='wood'){
   for(let y=-10;y<280;y+=28){
    c.beginPath();c.moveTo(0,y);
    for(let x=0;x<=256;x+=12)c.lineTo(x,y+Math.sin(x/29+y/17)*3+Math.sin(x/9)*1.2);
    c.strokeStyle=ink;c.lineWidth=2;c.stroke();
    c.strokeStyle=soft;c.lineWidth=1;c.stroke();
   }
   for(const [x,y] of [[56,67],[188,174],[115,230]]){
    c.strokeStyle=ink;c.lineWidth=2;c.beginPath();c.ellipse(x,y,13,6,.2,0,Math.PI*2);c.stroke();
    c.strokeStyle=soft;c.beginPath();c.ellipse(x,y,7,3,.2,0,Math.PI*2);c.stroke();
   }
  }else if(kind==='brick'){
   for(let row=0,y=0;y<272;row++,y+=42){
    const offset=row%2?32:0;
    line(0,y,256,y,ink,3);
    for(let x=offset;x<288;x+=64){
     line(x,y,x,y+42,ink,2.4);
     c.fillStyle=soft;c.fillRect(x+4,y+4,53,3);
     line(x+5,y+38,x+55,y+38,shade,1.4);
    }
   }
  }else if(kind==='dirt'){
   for(let i=0;i<74;i++){
    const x=random()*256,y=random()*256,r=1.8+random()*6;
    c.fillStyle=i%3?shade:soft;c.beginPath();c.ellipse(x,y,r*1.45,r*.75,random(),0,Math.PI*2);c.fill();
    if(i%4===0){c.strokeStyle=ink;c.lineWidth=1;c.stroke();}
   }
   for(let i=0;i<8;i++){
    const x=random()*256,y=random()*256;c.beginPath();c.moveTo(x,y);
    for(let j=0;j<4;j++)c.lineTo(x+j*9,y+Math.sin(j*.9+i)*4);
    c.strokeStyle=shade;c.lineWidth=2;c.stroke();
   }
  }else if(kind==='sand'){
   for(let y=8;y<280;y+=25){
    c.beginPath();for(let x=0;x<=256;x+=4){const py=y+Math.sin(x/19+y/22)*4+Math.sin(x/43)*2;x?c.lineTo(x,py):c.moveTo(x,py);}
    c.strokeStyle=soft;c.lineWidth=2.8;c.stroke();
    c.beginPath();for(let x=0;x<=256;x+=4){const py=y+4+Math.sin(x/19+y/22)*4+Math.sin(x/43)*2;x?c.lineTo(x,py):c.moveTo(x,py);}
    c.strokeStyle=shade;c.lineWidth=1.2;c.stroke();
   }
  }else if(kind==='snow'){
   for(let i=0;i<17;i++){
    const x=random()*256,y=random()*256,r=5+random()*9;
    for(let k=0;k<6;k++){const a=k*Math.PI/3;line(x-Math.cos(a)*r,y-Math.sin(a)*r,x+Math.cos(a)*r,y+Math.sin(a)*r,k%2?soft:ink,1.5);}
    c.fillStyle=soft;c.beginPath();c.arc(x,y,2.4,0,Math.PI*2);c.fill();
   }
  }else if(kind==='glass'){
   c.save();c.rotate(-Math.PI/5);
   for(let x=-160;x<360;x+=54){
    c.fillStyle='rgba(255,255,255,.18)';c.fillRect(x,45,13,360);
    c.fillStyle='rgba(101,160,183,.17)';c.fillRect(x+14,45,5,360);
   }
   c.restore();
   for(let i=0;i<12;i++){const x=random()*256,y=random()*256;line(x,y,x+18,y-10,'rgba(255,255,255,.60)',2.2);}
  }else if(kind==='flower'){
   for(let y=26;y<280;y+=64)for(let x=26;x<280;x+=64){
    for(let k=0;k<6;k++){const a=k*Math.PI/3;c.fillStyle=k%2?soft:shade;c.beginPath();c.ellipse(x+Math.cos(a)*9,y+Math.sin(a)*9,8,4,a,0,Math.PI*2);c.fill();}
    c.fillStyle='rgba(234,193,107,.78)';c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();
   }
  }else if(kind==='custom'){
   for(let i=0;i<88;i++){
    const x=random()*256,y=random()*256,r=1+random()*4;
    c.fillStyle=i%3?soft:shade;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
   }
  }
  c.restore();
 }

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
  // Surface motifs are drawn after pencil shading so distinct designs remain legible at game scale.
  if(kind.startsWith('tile-'))drawTilePattern(c,kind.slice(5),random,scale);
  else if(['stone','grass','leaves','wood','brick','dirt','sand','snow','glass','flower','custom'].includes(kind))
   drawSolidTexture(c,kind,random,scale);
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
