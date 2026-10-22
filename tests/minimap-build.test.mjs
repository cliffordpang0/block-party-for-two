import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compileArgs,hasBukkitApi,prepareOptionalMinimap} from '../minimap-build.mjs';
import {manifest,verify,at} from '../lib.mjs';
import {mkdtemp,writeFile,rm,rmdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {createHandler} from '../gateway.mjs';
test('minimap compilation uses a pinned Spigot API instead of Paperclip',async()=>{
 assert.equal(new URL(manifest.compileApi.url).hostname,'hub.spigotmc.org');assert.ok(manifest.compileApi.url.includes('1.12.2-R0.1'));assert.equal(manifest.compileApi.size,4341501);assert.match(manifest.compileApi.sha1,/^[a-f0-9]{40}$/);
 const args=compileArgs('spigot-api.jar','classes','OurMinimap.java');assert.equal(args[args.indexOf('-cp')+1],'spigot-api.jar');const code=await readFile(at('minimap-build.mjs'),'utf8');assert.ok(!code.includes("at('server','paper-1.12.2.jar')"));
});
test('Bukkit dependency probe rejects bootstrap-only JAR contents',()=>{
 assert.equal(hasBukkitApi(Buffer.from('paperclip/PatchData.class')),false);assert.equal(hasBukkitApi(Buffer.from('org/bukkit/World.class')),false);assert.equal(hasBukkitApi(Buffer.from('org/bukkit/World.class\0org/bukkit/plugin/java/JavaPlugin.class')),true);
});
test('minimap failure is nonfatal and success enables the HUD',async()=>{
 const c={},messages=[];assert.equal(await prepareOptionalMinimap(c,async()=>{throw Error('compile failed');},m=>messages.push(m)),false);assert.equal(c.minimapReady,false);assert.ok(messages[0].includes('Starting your world without the map'));
 assert.equal(await prepareOptionalMinimap(c,async()=>{},()=>{}),true);assert.equal(c.minimapReady,true);
 const source=await readFile(at('launch.mjs'),'utf8');assert.ok(source.includes('await prepareOptionalMinimap(c)'));assert.ok(!source.includes('await ensureMinimap(c)'));
});
test('publisher raw SHA-1 is verified independently of Git blob hashes',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'minimap-integrity-')),p=path.join(dir,'api.jar');try{const data=Buffer.from('api-fixture');await writeFile(p,data);assert.equal(await verify(p,{sha1:createHash('sha1').update(data).digest('hex'),size:data.length}),true);assert.equal(await verify(p,{sha1:'0'.repeat(40),size:data.length}),false);}finally{await rm(p);await rmdir(dir);}
});
test('browser receives explicit map-unavailable state while normal gateway stays usable',async()=>{
 const h=createHandler({inviteKey:'key',minimapReady:false});const out={writeHead(s){this.status=s;},end(b){this.body=b;}};await h({url:'/play/key/map.json',method:'GET'},out);assert.equal(out.status,200);assert.equal(JSON.parse(out.body).available,false);
 const page={writeHead(s){this.status=s;},end(b){this.body=b;}};await h({url:'/play/key/',method:'GET'},page);assert.equal(page.status,200);assert.ok(page.body.includes('game_frame'));
});
