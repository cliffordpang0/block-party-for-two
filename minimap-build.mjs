import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {at,exists,download,run,psQuote,manifest} from './lib.mjs';
export function compileArgs(apiJar,output,source){return ['--release','8','-encoding','UTF-8','-cp',apiJar,'-d',output,source];}
export function hasBukkitApi(bytes){return bytes.includes(Buffer.from('org/bukkit/World.class'))&&bytes.includes(Buffer.from('org/bukkit/plugin/java/JavaPlugin.class'));}
export async function prepareOptionalMinimap(c,build=ensureMinimap,log=console.warn){
 try{await build(c);c.minimapReady=true;return true;}
 catch(e){c.minimapReady=false;log('\nMINIMAP UNAVAILABLE: '+e.message+'\nStarting your world without the map. Restart START.bat to retry the minimap setup.\n');return false;}
}
async function compiler(){
 const base=at('runtime');if(await exists(base))for(const e of await readdir(base,{withFileTypes:true})){const bin=path.join(base,e.name,'bin');if(e.isDirectory()&&await exists(path.join(bin,'javac.exe')))return bin;}
 if(spawnSync('javac',['-version'],{windowsHide:true,stdio:'ignore'}).status===0)return null;
 if(process.platform!=='win32'||process.arch!=='x64')throw Error('Install a JDK 17+ with javac to build the minimap plugin.');
 console.log('One-time minimap setup: downloading a portable Java 17 JDK for compilation.');
 const r=await fetch('https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse',{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('JDK metadata could not be downloaded.');
 const pkg=(await r.json()).find(r=>r.binary?.package?.name.endsWith('.zip'))?.binary.package;if(!pkg||!/^[a-f0-9]{64}$/i.test(pkg.checksum))throw Error('Invalid JDK metadata.');
 await download(pkg.link,at('downloads','jdk17.zip'),{sha256:pkg.checksum,size:pkg.size});await mkdir(base,{recursive:true});
 await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath ${psQuote(at('downloads','jdk17.zip'))} -DestinationPath ${psQuote(base)} -Force`]);
 for(const e of await readdir(base,{withFileTypes:true})){const bin=path.join(base,e.name,'bin');if(e.isDirectory()&&await exists(path.join(bin,'javac.exe')))return bin;}
 throw Error('The JDK did not extract correctly.');
}
export async function ensureMinimap(c){
 if(!c.minimapKey){c.minimapKey=randomBytes(32).toString('hex');await writeFile(at('local-config.json'),JSON.stringify(c,null,2));}
 const source=await readFile(at('plugin','src','home','map','OurMinimap.java'));
 const descriptor=await readFile(at('plugin','plugin.yml'));const hash=createHash('sha256').update('compile-api-v2').update(source).update(descriptor).digest('hex');
 const jar=at('server','plugins','OurMinimap.jar'),stamp=at('plugin-build.json');let built=false;
 if(await exists(jar)&&await exists(stamp)){const prev=JSON.parse(await readFile(stamp,'utf8'));built=prev.sourceHash===hash&&prev.jarHash===createHash('sha256').update(await readFile(jar)).digest('hex');}
 if(!built){const bin=await compiler(),tool=n=>bin?path.join(bin,n+'.exe'):n;await mkdir(at('plugin-build'),{recursive:true});
  // Paperclip is a bootstrap/patcher, not a Bukkit compile dependency.
  const apiJar=at('compile-libs','spigot-api-1.12.2-shaded.jar');await download(manifest.compileApi.url,apiJar,manifest.compileApi);
  if(!hasBukkitApi(await readFile(apiJar)))throw Error('The compile dependency does not contain the Bukkit API.');
  await run(tool('javac'),compileArgs(apiJar,at('plugin-build'),at('plugin','src','home','map','OurMinimap.java')));
  await run(tool('jar'),['cf',jar,'-C',at('plugin-build'),'home','-C',at('plugin'),'plugin.yml']);
  await writeFile(stamp,JSON.stringify({sourceHash:hash,jarHash:createHash('sha256').update(await readFile(jar)).digest('hex')}));
 }
 const dir=at('server','plugins','OurMinimap');await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'bridge.properties'),`endpoint=http://127.0.0.1:${c.httpPort}/internal/map\nkey=${c.minimapKey}\n`);
}
