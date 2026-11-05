/* The canonical DIYCraft version-1 starter world, kept independent of either renderer. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DIYCraftThreeStarterWorld=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const emptySlots=()=>Array.from({length:60},()=>null);
 function freshWorld(){
 const blocks=[];const put=(x,y,z,type)=>blocks.push({x,y,z,type});
 for(let x=-3;x<=1;x++)for(let z=-13;z<=-9;z++){put(x,0,z,'wood');if(x===-3||x===1||z===-13||z===-9){put(x,1,z,'brick');put(x,2,z,'brick');}}
 for(let x=-4;x<=2;x++)for(let z=-14;z<=-8;z++)put(x,3,z,'wood');
 for(let x=-4;x<=2;x++){put(x,4,-14,'brick');put(x,4,-8,'brick');}
 put(-1,1,-9,'glass');put(-3,1,-11,'glass');put(1,1,-11,'glass');
 for(let y=0;y<=3;y++)put(9,y,-12,'wood');
 for(let x=7;x<=11;x++)for(let z=-14;z<=-10;z++)put(x,3,z,'leaves');
 for(let x=8;x<=10;x++)for(let z=-13;z<=-11;z++)put(x,4,z,'leaves');
 for(let y=0;y<=3;y++)put(-10,y,-13,'wood');
 for(let x=-12;x<=-8;x++)for(let z=-15;z<=-11;z++)put(x,3,z,'leaves');
 for(let x=-11;x<=-9;x++)for(let z=-14;z<=-12;z++)put(x,4,z,'leaves');
 for(let x=10;x<=13;x++)for(let z=-5;z<=-2;z++)put(x,0,z,'dirt');
 for(let x=10;x<=13;x++)for(let z=-5;z<=-2;z+=2)put(x,1,z,'flower');
 for(let x=-8;x<=-6;x++)for(let z=-9;z<=-7;z++)put(x,0,z,'flower');
 return {version:1,name:'My Peaceful World',blocks,excavations:[],waterCells:[],waterLevels:[],fish:[],bucket:[],animals:[],
  player:{x:0,y:0,z:7,yaw:0,pitch:-.12,bed:{x:-1,y:0,z:-11,yaw:0},shirt:'#d94b3d',hair:'#493127',skin:'#efc39d',pants:'#397d8f',shoes:'#bd4540',eyes:'#302820',hairStyle:'short',outfitStyle:'hoodie',accessory:'none',accessoryColor:'#f4a8bb'},
  customBlock:{color:'#aa83d8',texture:'custom'},doorDesign:{color:'#a97545',style:'classic'},tileDesign:{color:'#c5a98a',pattern:'grid'},solidStyles:{},timeMode:'day',materials:emptySlots(),crafted:emptySlots(),artworks:[],
  animalCare:{sheep:0,cat_mochi:0,dog_buddy:0,cow_bessie:0,horse_spirit:0,bird_chirpy:0,giraffe_raffy:0}};
}
 return Object.freeze({create:freshWorld});
});
