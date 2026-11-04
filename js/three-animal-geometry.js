/* Builds a complete low-poly animal as one vertex-coloured mesh.
   The caller can instance identical species/colour models for low draw-call cost. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeAnimalGeometry=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const HEX=/^#[0-9a-f]{6}$/i;
 const DEFAULTS={sheep:'#f0eee6',cat:'#c5c0b6',dog:'#c89b6d',cow:'#f2eee5',horse:'#8a6347',bird:'#e8c96d',giraffe:'#d9ad55'};
 const SPECIES=new Set(Object.keys(DEFAULTS));
 function validColor(value,fallback){return typeof value==='string'&&HEX.test(value)?value:fallback;}
 function create(THREE,animal){
  if(!THREE||!animal||!SPECIES.has(animal.species))throw new TypeError('A supported animal and Three.js are required.');
  const species=animal.species,body=validColor(animal.body,DEFAULTS[species]),accent=validColor(animal.accent,'#d0b6a0');
  const positions=[],colors=[],uvs=[];
  const sphere=new THREE.SphereGeometry(1,12,9),headSphere=new THREE.SphereGeometry(1,10,8);
  const cylinder=new THREE.CylinderGeometry(.055,.07,.42,6);
  const neckCylinder=new THREE.CylinderGeometry(.14,.19,.85,8);
  const earCone=new THREE.ConeGeometry(.10,.25,5),beakCone=new THREE.ConeGeometry(.09,.22,5);
  const fleeceSphere=new THREE.SphereGeometry(.16,8,6),spotSphere=new THREE.SphereGeometry(.055,7,6);
  const sources=[sphere,headSphere,cylinder,neckCylinder,earCone,beakCone,fleeceSphere,spotSphere];
  function add(geometry,color,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
   const position=geometry.attributes.position,uv=geometry.attributes.uv;
   const object=new THREE.Object3D();
   object.position.set(x,y,z);object.rotation.set(rx,ry,rz);object.scale.set(sx,sy,sz);object.updateMatrix();
   const normalMatrix=new THREE.Matrix3().getNormalMatrix(object.matrix);
   const rgb=new THREE.Color(color),indices=geometry.index?geometry.index.array:null,count=indices?indices.length:position.count;
   for(let i=0;i<count;i+=3){
    for(let j=0;j<3;j++){
     const sourceIndex=indices?indices[i+j]:i+j;
     const v=new THREE.Vector3().fromBufferAttribute(position,sourceIndex).applyMatrix4(object.matrix);
     positions.push(v.x,v.y,v.z);
     colors.push(rgb.r,rgb.g,rgb.b);
     if(uv){uvs.push(uv.getX(sourceIndex),uv.getY(sourceIndex));}else uvs.push(0,0);
    }
   }
  }
  if(species==='bird'){
   add(sphere,body,0,.55,0,1.2,.85,.8);
   add(headSphere,body,0,.82,.17,.17,.17,.17);
   add(beakCone,'#e8ad56',0,.79,.36,.9,1,1,Math.PI/2);
  }else{
   add(sphere,body,0,.72,0,1.35,.82,.9);
   const giraffe=species==='giraffe',headY=giraffe?1.72:1.0,headZ=giraffe?.34:.43;
   if(giraffe){
    add(neckCylinder,body,0,1.25,.28);
    for(let i=0;i<5;i++)add(spotSphere,accent,(i%2)*.13-.07,1.0+i*.15,.42);
   }
   add(headSphere,body,0,headY,headZ,.27,.243,.27);
   if(species==='cat'||species==='dog'){
    for(const x of [-.16,.16])add(earCone,accent,x,headY+.22,headZ,1,1,1,0,0,x*.8);
   }
   for(const x of [-.27,.27])for(const z of [-.24,.24])add(cylinder,'#775941',x,.22,z);
   if(species==='sheep'){
    for(const [x,y,z] of [[-.28,.88,0],[.28,.88,0],[0,.99,-.24],[0,.99,.25]])
     add(fleeceSphere,'#faf7ed',x,y,z,1,1,1);
   }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  geometry.userData={animalSpecies:species,animalBody:body,animalAccent:accent};
  sources.forEach(source=>source.dispose());
  return geometry;
 }
 return Object.freeze({create,species:Object.freeze(Array.from(SPECIES)),defaults:Object.freeze({...DEFAULTS})});
});
