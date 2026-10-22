export function validateMap(data){
 if(!data||!Array.isArray(data.players)||data.players.length>16)return null;
 const players=[];for(const p of data.players){
  if(typeof p.name!=='string'||p.name.length>32||typeof p.world!=='string'||p.world.length>100||!['NORMAL','NETHER','THE_END','CUSTOM'].includes(p.dimension))return null;
  if(!['x','y','z','yaw','cx','cz'].every(k=>Number.isFinite(p[k]))||p.size!==33||p.step!==2||!Array.isArray(p.tiles)||p.tiles.length!==1089||p.tiles.some(t=>!Number.isInteger(t)||t<0||t>0xffffff))return null;
  players.push({name:p.name,world:p.world,dimension:p.dimension,x:p.x,y:p.y,z:p.z,yaw:p.yaw,cx:p.cx,cz:p.cz,size:33,step:2,tiles:p.tiles});
 }return {players,updated:Date.now()};
}
