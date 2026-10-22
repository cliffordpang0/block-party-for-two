import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {at,ROOT,manifest,download,exists,verify,config,psQuote,run} from './lib.mjs';
export async function javaPath(){
 const base=at('runtime');if(await exists(base))for(const e of await readdir(base,{withFileTypes:true})){const p=path.join(base,e.name,'bin','java.exe');if(e.isDirectory()&&await exists(p))return p;}
 const check=spawnSync('java',['-version'],{encoding:'utf8',windowsHide:true});const m=(check.stderr||check.stdout||'').match(/version "(?:1\.)?(\d+)/);if(check.status===0&&m&&Number(m[1])>=17)return 'java';return null;
}
export async function ensureJava(){
 let java=await javaPath();if(java)return java;
 if(process.platform!=='win32')throw Error('Install Java 17+ and retry. Automatic portable Java setup currently supports Windows x64.');
 if(process.arch!=='x64')throw Error('This setup currently requires Windows x64. Install a matching Java 17+ runtime manually.');
 console.log('Getting portable Java 17 JDK from Eclipse Adoptium (includes the minimap compiler; no system installation).');
 const res=await fetch('https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse',{signal:AbortSignal.timeout(30000)});if(!res.ok)throw Error('Could not find Java download.');
 const releases=await res.json();const pkg=releases.find(r=>r.binary?.package?.name.endsWith('.zip'))?.binary?.package;
 if(!pkg||!/^[a-f0-9]{64}$/i.test(pkg.checksum))throw Error('Unexpected Java release metadata.');
 await download(pkg.link,at('downloads','java17.zip'),{sha256:pkg.checksum,size:pkg.size});await mkdir(at('runtime'),{recursive:true});
 await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Expand-Archive -LiteralPath ${psQuote(at('downloads','java17.zip'))} -DestinationPath ${psQuote(at('runtime'))} -Force`]);
 java=await javaPath();if(!java)throw Error('Portable Java did not extract correctly.');return java;
}
export async function ensureFiles(){
 if(Number(process.versions.node.split('.')[0])<20)throw Error('Node.js 20+ is required.');
 await config();await mkdir(at('server'),{recursive:true});await mkdir(at('web'),{recursive:true});
 for(const f of manifest.serverFiles){const target=at('server',...f.path.split('/'));
  // Never overwrite a user's existing authentication configuration.
  if(f.path.endsWith('.yml')&&await exists(target))continue;
  await download(`https://raw.githubusercontent.com/${manifest.serverRepository}/${manifest.serverCommit}/${f.path}`,target,f);
 }
 for(const f of manifest.clientFiles)await download(`https://raw.githubusercontent.com/${manifest.clientRepository}/${manifest.clientCommit}/${f.path}`,at('web',path.basename(f.path)),f);
 const props=at('server','server.properties');if(!await exists(props)){
  await writeFile(props,[
   '# Private two-player Minecraft 1.12.2 survival server',
   'server-ip=127.0.0.1','server-port=25565','level-name=world','gamemode=0','force-gamemode=false','hardcore=false','difficulty=2',
   'max-players=2','pvp=false','allow-nether=true','generate-structures=true','spawn-monsters=true','spawn-animals=true','spawn-npcs=true',
   'view-distance=6','spawn-protection=0','max-build-height=256','enable-rcon=false','enable-query=false','enable-command-block=false',
   'white-list=false','online-mode=false','snooper-enabled=false','level-type=DEFAULT','allow-flight=false','network-compression-threshold=256',''
  ].join('\n'));
 }
 const bukkit=at('server','bukkit.yml');if(!await exists(bukkit))await writeFile(bukkit,'settings:\n  allow-end: true\n  update-folder: update\nticks-per:\n  autosave: 1200\n');
 if(!await exists(at('server','eula.txt')))await writeFile(at('server','eula.txt'),'# Read https://www.minecraft.net/eula\n# Set eula=true here only if you accept the Minecraft EULA.\neula=false\n');
 return ensureJava();
}
export async function checkSetup(){
 const missing=[];for(const f of manifest.serverFiles)if(!await exists(at('server',...f.path.split('/'))))missing.push(f.path);
 for(const f of manifest.clientFiles)if(!await exists(at('web',path.basename(f.path))))missing.push(f.path);
 if(!await javaPath())missing.push('Java 17+');return missing;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.includes('--check')){const missing=await checkSetup();console.log(missing.length?'Setup required:\n'+missing.join('\n'):'All required files and Java are present.');if(missing.length)process.exitCode=1;}else{await ensureFiles();console.log('\nDownloads verified. Run START.bat to launch.');}}
 catch(e){console.error('\nSetup stopped: '+e.message+'\nYour world saves were not changed. Run START.bat again to retry.');process.exitCode=1;}
}
