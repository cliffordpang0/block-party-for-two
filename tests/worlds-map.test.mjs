import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {catalogue,createWorld,selectWorld,importOldInstallation,validLevel} from '../worlds.mjs';
import {backupTargets} from '../backup.mjs';
import {validateMap} from '../map-state.mjs';
import {createHandler} from '../gateway.mjs';
import {markerPosition} from '../web/map-math.js';
async function temp(){return mkdtemp(path.join(os.tmpdir(),'minecraftworldtest-'));}
async function cleanup(dir){const resolved=path.resolve(dir);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('minecraftworldtest-'));await rm(resolved,{recursive:true});}
async function saved(base,level){await mkdir(path.join(base,level),{recursive:true});await writeFile(path.join(base,level,'level.dat'),'fixture world data');}
test('world discovery preserves original saves and finds all dimensions',async()=>{
 const dir=await temp();try{await writeFile(path.join(dir,'server.properties'),'level-name=world\npvp=false\n');await saved(dir,'world');await saved(dir,'world_nether');await saved(dir,'world_the_end');await saved(dir,'world-second');const c=await catalogue(dir);assert.equal(c.active,'world');assert.deepEqual(c.rows.map(r=>r.level),['world','world-second']);assert.equal(await readFile(path.join(dir,'world','level.dat'),'utf8'),'fixture world data');}finally{await cleanup(dir);}
});
test('new worlds get unique safe folders and selecting them preserves settings',async()=>{
 const dir=await temp();try{await writeFile(path.join(dir,'server.properties'),'level-name=world\npvp=false\n');const a=await createWorld('Our Adventure',dir),b=await createWorld('Our Adventure',dir);assert.notEqual(a.level,b.level);await selectWorld(a,dir);const props=await readFile(path.join(dir,'server.properties'),'utf8');assert.ok(props.includes('level-name='+a.level));assert.ok(props.includes('pvp=false'));for(const s of ['../world','a/b','world_nether','world_the_end',''])assert.equal(validLevel(s),false);}finally{await cleanup(dir);}
});
test('combined export includes every registered world and all existing dimensions',async()=>{
 const dir=await temp();try{await saved(dir,'world');await saved(dir,'world_nether');await saved(dir,'world_the_end');await saved(dir,'world-second');await saved(dir,'world-second_nether');await writeFile(path.join(dir,'server.properties'),'level-name=world-second\n');const b=await backupTargets(dir);assert.equal(b.worlds,2);for(const n of ['world','world_nether','world_the_end','world-second','world-second_nether','world-catalog.json'])assert.ok(b.targets.includes(path.join(dir,n)));}finally{await cleanup(dir);}
});
test('import copies all three dimensions without changing originals',async()=>{
 const dir=await temp();try{const old=path.join(dir,'old','server'),dest=path.join(dir,'new');await mkdir(old,{recursive:true});await writeFile(path.join(old,'server.properties'),'level-name=world\n');for(const s of ['','_nether','_the_end'])await saved(old,'world'+s);const e=await importOldInstallation(path.join(dir,'old'),dest);for(const s of ['','_nether','_the_end'])assert.equal(await readFile(path.join(dest,e.level+s,'level.dat'),'utf8'),'fixture world data');assert.equal(await readFile(path.join(old,'world','level.dat'),'utf8'),'fixture world data');}finally{await cleanup(dir);}
});
function player(){return {name:'Alice',world:'world',dimension:'NORMAL',x:10,y:64,z:20,yaw:0,cx:10,cz:20,size:33,step:2,tiles:Array(1089).fill(0x123456)};}
test('map validation rejects malformed telemetry and only keeps safe fields',()=>{
 assert.equal(validateMap({players:[{...player(),tiles:[]}]}),null);assert.equal(validateMap({players:[{...player(),x:Infinity}]}),null);assert.equal(validateMap({players:[{...player(),tiles:Array(1089).fill(-1)}]}),null);const s=validateMap({players:[{...player(),secret:'hidden'}]});assert.ok(s.updated>0);assert.equal(s.players[0].secret,undefined);
});
test('map ingest requires a separate key and loopback; map output needs invite key',async()=>{
 const handler=createHandler({inviteKey:'x',minimapKey:'private-bridge-key'});
 async function req(url,method='GET',key,body,remote='127.0.0.1'){const request={url,method,headers:{'x-map-key':key},socket:{remoteAddress:remote},async *[Symbol.asyncIterator](){if(body)yield JSON.stringify(body);}};const res={writeHead(s,h){this.status=s;this.headers=h;},end(b){this.body=b;}};await handler(request,res);return res;}
 assert.equal((await req('/internal/map','POST','bad',{players:[player()]})).status,403);assert.equal((await req('/internal/map','POST','private-bridge-key',{players:[player()]},'192.0.2.1')).status,403);assert.equal((await req('/internal/map','POST','private-bridge-key',{players:[player()]})).status,204);assert.equal((await req('/map.json')).status,404);const r=await req('/play/x/map.json');assert.equal(r.status,200);assert.equal(JSON.parse(r.body).players[0].name,'Alice');assert.equal(r.headers['Cache-Control'],'no-store');
});
test('map uses north-up world coordinates, dimension-specific centering and edge markers',()=>{
 const c=player();assert.equal(markerPosition(c,c).x,99);assert.equal(markerPosition(c,c).y,99);const m=markerPosition({...c,x:1000},c);assert.equal(m.x,190);assert.equal(m.outside,true);assert.equal(markerPosition({...c,z:0},c).y<99,true);assert.equal(markerPosition(c,c).rotation,Math.PI);
});
