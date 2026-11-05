/* Shared low-draw-call plant geometry for both Three.js world previews.
   Flower and grass silhouettes are one indexed mesh per plant. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreePlantGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function createGeometry(THREE,block){
  if(!THREE||!block||!['flower','tall_grass'].includes(block.type))
   throw new TypeError('A flower or tall-grass block and Three.js are required.');
  const positions=[],colors=[],uvs=[],indices=[];
  const shape={plantType:block.type,petalCount:0,leafCount:0,raisedPetalRidges:false,raisedLeafVeins:false,petalYRange:null};
  let petalMinY=Infinity,petalMaxY=-Infinity;
  function vertex(point,color,uv){
   positions.push(point[0],point[1],point[2]);const c=new THREE.Color(color);
   colors.push(c.r,c.g,c.b);uvs.push(uv[0],uv[1]);
  }
  function triangle(points,color){
   const first=positions.length/3;
   vertex(points[0],color,[.5,.5]);vertex(points[1],color,[1,0]);vertex(points[2],color,[0,1]);
   indices.push(first,first+1,first+2);
  }
  function quad(points,color){
   const first=positions.length/3;
   vertex(points[0],color,[0,0]);vertex(points[1],color,[1,0]);vertex(points[2],color,[1,1]);vertex(points[3],color,[0,1]);
   indices.push(first,first+1,first+2,first,first+2,first+3);
  }
  function raisedPetal(angle,color){
   const ca=Math.cos(angle),sa=Math.sin(angle),tx=-sa,tz=ca;
   const point=(r,t,y)=>[ca*r+tx*t,y,sa*r+tz*t];
   const base=point(.035,0,.865),left=point(.17,.070,.905),right=point(.17,-.070,.905);
   const ridge=point(.185,0,1.035),tip=point(.315,0,.975);
   const vertices=[base,left,right,ridge,tip];
   vertices.forEach(v=>{petalMinY=Math.min(petalMinY,v[1]);petalMaxY=Math.max(petalMaxY,v[1]);});
   // Four folded facets make a small cupped petal with a raised pencil-like midrib.
   triangle([base,left,ridge],color);
   triangle([base,ridge,right],color);
   triangle([left,tip,ridge],color);
   triangle([tip,right,ridge],color);
  }
  function leaf(origin,tip,width,color){
   const dx=tip[0]-origin[0],dz=tip[2]-origin[2],length=Math.hypot(dx,dz)||1;
   const tx=-dz/length,tz=dx/length;
   const middle=[(origin[0]+tip[0])*.52,(origin[1]+tip[1])*.52+.035,(origin[2]+tip[2])*.52];
   const left=[middle[0]+tx*width,middle[1]-.025,middle[2]+tz*width];
   const right=[middle[0]-tx*width,middle[1]-.025,middle[2]-tz*width];
   // The two halves meet on a raised center vein instead of one paper-thin plane.
   triangle([origin,left,middle],color);
   triangle([origin,middle,right],shade(color,.86));
   triangle([middle,left,tip],shade(color,1.06));
   triangle([middle,tip,right],color);
  }
  function shade(hex,factor){
   const n=parseInt(String(hex).slice(1),16);
   const channels=[(n>>16)&255,(n>>8)&255,n&255].map(c=>Math.max(0,Math.min(255,Math.round(c*factor))));
   return '#'+channels.map(c=>c.toString(16).padStart(2,'0')).join('');
  }
  if(block.type==='flower'){
   const petal=block.color||'#e9a4c1',stem='#47834d',leafColor='#8eac6c',gold='#edc76b';
   // A crossed, gently tapered stalk remains legible from every camera direction.
   quad([[-.032,0,-.018],[.032,0,-.018],[.025,.78,.018],[-.025,.78,.018]],stem);
   quad([[-.018,0,-.032],[-.018,0,.032],[.018,.78,.025],[.018,.78,-.025]],shade(stem,1.10));
   leaf([0,.27,0],[-.31,.52,.045],.075,leafColor);
   leaf([0,.38,0],[.27,.61,-.045],.070,shade(leafColor,1.08));
   // Eight individual-looking folded petals are still part of one merged plant mesh.
   for(let i=0;i<8;i++)raisedPetal(i*Math.PI/4,i%2?shade(petal,.93):petal);
   // A small raised golden center gives the blossom a clear focal point.
   for(let i=0;i<12;i++){
    const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
    triangle([[0,.985,0],[Math.cos(a)*.085,.955,Math.sin(a)*.085],
     [Math.cos(b)*.085,.955,Math.sin(b)*.085]],i%3===0?'#f7d77d':gold);
   }
   shape.petalCount=8;shape.leafCount=2;shape.raisedPetalRidges=true;shape.raisedLeafVeins=true;
   shape.petalYRange={min:petalMinY,max:petalMaxY};
  }else{
   const grassColors=['#4e9850','#5eaa58','#78b568','#a4c374'];
   for(let i=0;i<7;i++){
    const angle=i*2.399,r=.04+(i%3)*.025,ca=Math.cos(angle),sa=Math.sin(angle);
    const wx=-sa*.065,wz=ca*.065,bx=ca*r,bz=sa*r,tx=ca*(r+.16),tz=sa*(r+.16),height=.66+(i%3)*.07;
    const baseA=[bx+wx,0,bz+wz],baseB=[bx-wx,0,bz-wz],tip=[tx,height,tz];
    const ridge=[(baseA[0]+baseB[0])*.5+ca*.02,height*.78,(baseA[2]+baseB[2])*.5+sa*.02];
    triangle([baseA,ridge,tip],grassColors[i%grassColors.length]);
    triangle([ridge,baseB,tip],shade(grassColors[i%grassColors.length],.88));
   }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  geometry.userData.plantShape=shape;
  return geometry;
 }
 return Object.freeze({createGeometry});
});
