/* Low-poly volumetric plant meshes, merged to one geometry per plant for mobile draw efficiency. */
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
  const shape={
   plantType:block.type,petalCount:0,leafCount:0,raisedPetalRidges:false,raisedLeafVeins:false,
   petalYRange:null,petalProfiles:[],petalRise:0,petalCupDepth:0,flowerCenterY:0,flowerVolume:false,petalCrossSectionSegments:0,petalLongitudinalRings:0,
   petalThickness:0,stalkVolume:false,stalkRadialSegments:0,basalLeavesVolume:false,leafThickness:0
  };
  let petalMinY=Infinity,petalMaxY=-Infinity;
  function vertex(point,color,uv){
   const index=positions.length/3;positions.push(point[0],point[1],point[2]);
   const c=new THREE.Color(color);colors.push(c.r,c.g,c.b);uvs.push(uv[0],uv[1]);return index;
  }
  function face(a,b,c){indices.push(a,b,c);}
  function quad(a,b,c,d){face(a,b,c);face(a,c,d);}
  function shade(hex,factor){
   const n=parseInt(String(hex).slice(1),16);
   const channels=[(n>>16)&255,(n>>8)&255,n&255].map(c=>Math.max(0,Math.min(255,Math.round(c*factor))));
   return '#'+channels.map(c=>c.toString(16).padStart(2,'0')).join('');
  }
  function normalize(v){
   const length=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/length,v[1]/length,v[2]/length];
  }
  function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function addSweep(centers,side,normal,widths,thicknesses,color,sides=8){
   const ringIds=[];
   centers.forEach((center,ringIndex)=>{
    const ring=[];
    for(let j=0;j<sides;j++){
     const angle=j*Math.PI*2/sides,cs=Math.cos(angle),sn=Math.sin(angle);
     const point=[
      center[0]+side[0]*widths[ringIndex]*cs+normal[0]*thicknesses[ringIndex]*sn,
      center[1]+side[1]*widths[ringIndex]*cs+normal[1]*thicknesses[ringIndex]*sn,
      center[2]+side[2]*widths[ringIndex]*cs+normal[2]*thicknesses[ringIndex]*sn
     ];
     const tint=j%4===0?1.045:j%4===2?.965:1;
     ring.push(vertex(point,shade(color,tint),[j/sides,ringIndex/Math.max(1,centers.length-1)]));
    }
    ringIds.push(ring);
   });
   for(let i=0;i<ringIds.length-1;i++){
    const current=ringIds[i],next=ringIds[i+1];
    for(let j=0;j<sides;j++)quad(current[j],next[j],next[(j+1)%sides],current[(j+1)%sides]);
   }
   const startCenter=vertex(centers[0],shade(color,.88),[.5,0]);
   const endCenter=vertex(centers[centers.length-1],shade(color,1.08),[.5,1]);
   for(let j=0;j<sides;j++){
    face(startCenter,ringIds[0][(j+1)%sides],ringIds[0][j]);
    face(endCenter,ringIds[ringIds.length-1][j],ringIds[ringIds.length-1][(j+1)%sides]);
   }
  }
  function ellipsoid(center,radii,color,longitude=10,latitude=6){
   const rings=[];
   for(let i=0;i<=latitude;i++){
    const phi=Math.PI*i/latitude,ring=[];
    for(let j=0;j<longitude;j++){
     const theta=Math.PI*2*j/longitude;
     const point=[
      center[0]+radii[0]*Math.sin(phi)*Math.cos(theta),
      center[1]+radii[1]*Math.cos(phi),
      center[2]+radii[2]*Math.sin(phi)*Math.sin(theta)
     ];
     ring.push(vertex(point,shade(color,1+Math.sin(theta+phi)*.025),[j/longitude,i/latitude]));
    }
    rings.push(ring);
   }
   for(let i=0;i<rings.length-1;i++)for(let j=0;j<longitude;j++)
    quad(rings[i][j],rings[i+1][j],rings[i+1][(j+1)%longitude],rings[i][(j+1)%longitude]);
  }
  function addStem(){
   const centers=[],widths=[],depths=[],ringCount=6;
   for(let i=0;i<ringCount;i++){
    const t=i/(ringCount-1);
    centers.push([.008*Math.sin(t*Math.PI),.02+.86*t,0]);
    const radius=.043-.014*t;widths.push(radius);depths.push(radius*.94);
   }
   addSweep(centers,[1,0,0],[0,0,1],widths,depths,'#47834d',7);
   shape.stalkVolume=true;shape.stalkRadialSegments=7;
  }
  function addPetal(angle,color,index){
   // Each petal leaves the recessed flower heart and sweeps outward AND upward.
   // The upward radial arc creates a visible bowl profile instead of a flat rosette disc.
   const axis=normalize([Math.cos(angle),.72,Math.sin(angle)]);
   const side=[-Math.sin(angle),0,Math.cos(angle)];
   const normal=normalize(cross(side,axis));
   const centers=[],widths=[],thicknesses=[],ringCount=7;
   const petalScale=index%2?.94:1;
   for(let i=0;i<ringCount;i++){
    const t=.02+(i/(ringCount-1))*.96;
    const radial=.04+.37*petalScale*t;
    const rise=petalScale*(.255*t+.055*Math.sin(Math.PI*t));
    const y=.875+rise;
    centers.push([Math.cos(angle)*radial,y,Math.sin(angle)*radial]);
    const fullness=Math.pow(Math.max(.001,Math.sin(Math.PI*t)),.72);
    // Keep visible gaps between individual petals; each ring is a solid rounded cross-section.
    widths.push(.064*fullness+.0025);
    thicknesses.push(.026*fullness+.004);
   }
   addSweep(centers,side,normal,widths,thicknesses,color,8);
   const baseY=centers[0][1],tipY=centers[centers.length-1][1];
   const profile={angle,baseY,tipY,rise:tipY-baseY,radialExtent:Math.hypot(centers[centers.length-1][0],centers[centers.length-1][2])};
   shape.petalProfiles.push(profile);
   shape.petalRise=Math.max(shape.petalRise,profile.rise);
   for(const center of centers){petalMinY=Math.min(petalMinY,center[1]-.03);petalMaxY=Math.max(petalMaxY,center[1]+.03);}
  }
  function addLeaf(start,end,width,color){
   const direction=normalize([end[0]-start[0],end[1]-start[1],end[2]-start[2]]);
   const side=normalize([-direction[2],0,direction[0]]);
   const normal=normalize(cross(side,direction));
   const centers=[],widths=[],thicknesses=[],ringCount=7;
   for(let i=0;i<ringCount;i++){
    const t=.025+(i/(ringCount-1))*.95,fullness=Math.pow(Math.max(.001,Math.sin(Math.PI*t)),.78);
    centers.push([start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t+.018*Math.sin(Math.PI*t),start[2]+(end[2]-start[2])*t]);
    widths.push(width*fullness+.002);thicknesses.push(width*.24*fullness+.002);
   }
   addSweep(centers,side,normal,widths,thicknesses,color,7);
   const veinCenters=centers.map((p,i)=>[p[0]+normal[0]*thicknesses[i],p[1]+normal[1]*thicknesses[i],p[2]+normal[2]*thicknesses[i]]);
   addSweep(veinCenters,side,normal,centers.map(()=>.006),centers.map(()=>.004),shade(color,1.22),5);
  }
  if(block.type==='flower'){
   const petal=block.color||'#e9a4c1',gold='#edc76b',leafColor='#8eac6c';
   addStem();
   addLeaf([0,.22,0],[-.33,.43,.055],.078,leafColor);
   addLeaf([0,.34,0],[.29,.57,-.06],.073,shade(leafColor,1.08));
   for(let i=0;i<8;i++)addPetal(i*Math.PI/4,i%2?shade(petal,.93):petal,i);
   // Recess the heart into the cup; the stem meets its underside instead of supporting a flat plate.
   shape.flowerCenterY=.948;
   ellipsoid([0,shape.flowerCenterY,0],[.086,.055,.086],gold,12,8);
   for(let i=0;i<7;i++){
    const angle=i*Math.PI*2/7,r=.043;
    ellipsoid([Math.cos(angle)*r,1.002,Math.sin(angle)*r],[.013,.011,.013],i%2?'#f8dfa0':'#f3cd78',6,4);
   }
   shape.petalCount=8;shape.leafCount=2;shape.raisedPetalRidges=true;shape.raisedLeafVeins=true;
   shape.petalYRange={min:petalMinY,max:petalMaxY};
   shape.petalCupDepth=Math.min(...shape.petalProfiles.map(profile=>profile.tipY))-shape.flowerCenterY;
   shape.flowerVolume=true;shape.petalCrossSectionSegments=8;shape.petalLongitudinalRings=7;shape.petalThickness=.03;
   shape.basalLeavesVolume=true;shape.leafThickness=.078*.24;
  }else{
   const grassColors=['#4e9850','#5eaa58','#78b568','#a4c374'];
   for(let i=0;i<7;i++){
    const angle=i*2.399,r=.04+(i%3)*.025,ca=Math.cos(angle),sa=Math.sin(angle);
    const side=[-sa,0,ca],normal=[0,1,0],centers=[],widths=[],thicknesses=[],height=.66+(i%3)*.07;
    for(let j=0;j<5;j++){
     const t=j/4,fullness=Math.sin(Math.PI*t);
     centers.push([ca*(r+.16*t),height*t,sa*(r+.16*t)]);
     widths.push(.047*fullness+.002);thicknesses.push(.011*fullness+.002);
    }
    addSweep(centers,side,normal,widths,thicknesses,grassColors[i%grassColors.length],6);
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
