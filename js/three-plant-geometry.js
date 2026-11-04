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
 const positions=[],colors=[],uvs=[],indices=[];
 function vertex(point,color,uv){
  positions.push(point[0],point[1],point[2]);const c=new THREE.Color(color);colors.push(c.r,c.g,c.b);uvs.push(uv[0],uv[1]);
 }
 function quad(points,color){
  const start=positions.length/3;
  vertex(points[0],color,[0,0]);vertex(points[1],color,[1,0]);vertex(points[2],color,[1,1]);vertex(points[3],color,[0,1]);
  indices.push(start,start+1,start+2,start,start+2,start+3);
 }
 function triangle(points,color){
  const start=positions.length/3;
  vertex(points[0],color,[.5,.5]);vertex(points[1],color,[1,0]);vertex(points[2],color,[0,1]);
  indices.push(start,start+1,start+2);
 }
 if(block.type==='flower'){
  const petal=block.color||'#e9a4c1',stem='#47834d',leaf='#8eac6c',gold='#edc76b';
  // Two crossed stalk planes and paired leaves preserve the plant silhouette from all sides.
  quad([[-.025,0,0],[.025,0,0],[.025,.72,0],[-.025,.72,0]],stem);
  quad([[0,0,-.025],[0,0,.025],[0,.72,.025],[0,.72,-.025]],stem);
  quad([[0,.25,0],[-.24,.43,0],[-.19,.49,.025],[0,.29,.025]],leaf);
  quad([[0,.37,0],[.22,.53,0],[.18,.59,-.025],[0,.41,-.025]],leaf);
  quad([[0,.25,0],[0,.29,.025],[0,.49,.025],[-.24,.43,0]],leaf);
  quad([[0,.37,0],[0,.41,-.025],[0,.59,-.025],[.22,.53,0]],leaf);
  // Eight broad, watercolor/pencil petals around a warm centre.
  for(let i=0;i<8;i++){
   const angle=i*Math.PI/4,ca=Math.cos(angle),sa=Math.sin(angle),cx=ca*.105,cz=sa*.105;
   const tx=ca*.29,tz=sa*.29,wx=-sa*.052,wz=ca*.052;
   quad([[cx+wx,.80,cz+wz],[cx-wx,.80,cz-wz],[tx-wx*.55,.80,tz-wz*.55],[tx+wx*.55,.80,tz+wz*.55]],petal);
  }
  for(let i=0;i<10;i++){
   const a=i*Math.PI/5,b=(i+1)*Math.PI/5;
   triangle([[0,.815,0],[Math.cos(a)*.075,.815,Math.sin(a)*.075],[Math.cos(b)*.075,.815,Math.sin(b)*.075]],gold);
  }
 }else{
  const colors=['#4e9850','#5eaa58','#78b568','#a4c374'];
  for(let i=0;i<7;i++){
   const angle=i*2.399,r=.04+(i%3)*.025,ca=Math.cos(angle),sa=Math.sin(angle),wx=-sa*.065,wz=ca*.065;
   const bx=ca*r,bz=sa*r,tx=ca*(r+.16),tz=sa*(r+.16),height=.66+(i%3)*.07;
   quad([[bx+wx,0,bz+wz],[bx-wx,0,bz-wz],[tx,height,tz],[tx+wx*.25,height*.82,tz+wz*.25]],colors[i%colors.length]);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return geometry;
}
 return Object.freeze({createGeometry});
});
