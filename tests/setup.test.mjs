import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm,rmdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {manifest,gitHash,verify,publicLink,psQuote,at} from '../lib.mjs';
import {routePath,clientHtml,createHandler} from '../gateway.mjs';
test('download manifest pins repository commits, file hashes and paths',()=>{
 for(const s of [manifest.serverCommit,manifest.clientCommit])assert.match(s,/^[a-f0-9]{40}$/);
 for(const f of [...manifest.serverFiles,...manifest.clientFiles]){assert.match(f.sha,/^[a-f0-9]{40}$/);assert.ok(f.size>0);assert.ok(!f.path.includes('..')&&!f.path.startsWith('/'));}
 assert.match(manifest.tunnel.sha256,/^[a-f0-9]{64}$/);assert.ok(manifest.serverFiles.some(f=>f.path==='plugins/AuthMe.jar'));
});
test('integrity verification detects truncation and tampering',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'minecraft-test-')),p=path.join(dir,'file');const bytes=Buffer.from('verified bytes');
 try{await writeFile(p,bytes);assert.equal(await verify(p,{sha:gitHash(bytes),size:bytes.length}),true);assert.equal(await verify(p,{sha256:createHash('sha256').update(bytes).digest('hex'),size:bytes.length}),true);await writeFile(p,'tampered');assert.equal(await verify(p,{sha:gitHash(bytes),size:bytes.length}),false);}finally{await rm(p);await rmdir(dir);}
});
test('gateway only exposes exact client assets behind the invite key',()=>{
 const key='a'.repeat(48),prefix='/play/'+key+'/';assert.equal(routePath(prefix,key),'index.html');assert.equal(routePath(prefix+'assets.epw',key),'assets.epw');assert.equal(routePath(prefix+'socket',key),'socket');
 for(const u of ['/',prefix+'../server.properties',prefix+'%2e%2e/server.properties',prefix+'local-config.json',prefix+'world/level.dat','/play/wrong/assets.epw',prefix+'bootstrap.js/evil'])assert.equal(routePath(u,key),null);
});
test('invite builder preserves public origin and strips unrelated URL content',()=>{
 assert.equal(publicLink('https://example.trycloudflare.com/abc?q=1#x','key'),'https://example.trycloudflare.com/play/key/');assert.throws(()=>publicLink('file:///a','key'));
});
test('client uses same-origin WebSockets, stable world database and no public relay',()=>{
 const html=clientHtml();assert.ok(html.includes("new URL('socket',location.href)"));assert.ok(html.includes("?'wss:':'ws:'"));assert.ok(html.includes("worldsDB:'our-minecraft-1122'"));assert.ok(html.includes('relays:[]'));assert.ok(html.includes('joinServer:socket.href'));
});
test('PowerShell path quoting keeps apostrophes literal',()=>{
 assert.equal(psQuote("C:\\Users\\O'Connor\\game"),"'C:\\Users\\O''Connor\\game'");
});
test('gateway returns HTML only for a valid key and never exposes saves',async()=>{
 const key='b'.repeat(48),handler=createHandler({inviteKey:key});
 async function get(url,method='GET'){const r={writeHead(s,h){this.status=s;this.headers=h;},end(body){this.body=body;}};await handler({url,method},r);return r;}
 assert.equal((await get('/play/'+key+'/')).status,200);assert.equal((await get('/')).status,404);assert.equal((await get('/play/'+key+'/server/world/level.dat')).status,404);assert.equal((await get('/play/'+key+'/','POST')).status,405);
 const head=await get('/play/'+key+'/','HEAD');assert.equal(head.body,undefined);assert.equal(head.headers['Referrer-Policy'],'no-referrer');
});
test('launcher requires an interactive EULA decision and graceful backups',async()=>{
 const launcher=await readFile(at('launch.mjs'),'utf8'),setup=await readFile(at('setup.mjs'),'utf8');assert.ok(launcher.includes("answer.trim()!=='AGREE'"));assert.ok(!launcher.includes('-Dcom.mojang.eula.agree=true'));assert.ok(setup.includes('eula=false'));assert.ok(launcher.includes("game.stdin.write('stop\\n')"));assert.ok(launcher.includes('if(code===0)'));
});
