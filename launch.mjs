import {readFile,writeFile,mkdir,open,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {at,ROOT,exists,config,manifest,download,publicLink,psQuote} from './lib.mjs';
import {ensureFiles,javaPath} from './setup.mjs';
import {createGateway} from './gateway.mjs';
import {backupStopped} from './backup.mjs';
import {chooseWorld,importOldInstallation} from './worlds.mjs';
import {prepareOptionalMinimap} from './minimap-build.mjs';
let game,gateway,tunnel,reader,stopping=false,finished=false,ready=false,lock=null;
const LOCK=at('launcher.lock');
function openBrowser(url){if(process.platform==='win32'){const p=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Start-Process ${psQuote(url)}`],{windowsHide:true,stdio:'ignore'});p.on('error',()=>{});}}
async function acquireLock(){
 try{lock=await open(LOCK,'wx');await lock.writeFile(String(process.pid));}
 catch(e){if(e.code!=='EEXIST')throw e;const pid=Number(await readFile(LOCK,'utf8'));let running=false;if(Number.isInteger(pid)&&pid>0)try{process.kill(pid,0);running=true;}catch{}
  if(running)throw Error('The launcher is already running. Use its existing window.');
  // Verify the exact lockfile is inside this project before removing a stale lock.
  await unlink(LOCK);lock=await open(LOCK,'wx');await lock.writeFile(String(process.pid));
 }
}
async function releaseLock(){if(lock){await lock.close();lock=null;await unlink(LOCK).catch(()=>{});}}
async function share(c){
 if(!ready){console.log('Wait for the server to finish starting before sharing.');return;}
 if(tunnel){console.log('Your tunnel is already running. See the invite link above or INVITE.txt.');return;}
 const bin=at('tools','cloudflared.exe');await download(manifest.tunnel.url,bin,manifest.tunnel);
 console.log('\nCreating a temporary HTTPS invite. Share the complete /play/.../ link, including its key.');
 tunnel=spawn(bin,['tunnel','--no-autoupdate','--url',`http://127.0.0.1:${c.httpPort}`],{cwd:ROOT,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let printed=false,buffer='';const output=data=>{
  buffer=(buffer+data.toString()).slice(-12000);const match=buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if(match&&!printed){printed=true;const url=publicLink(match[0],c.inviteKey);console.log('\nGIRLFRIEND INVITE LINK:\n'+url+'\n');writeFile(at('INVITE.txt'),url+'\n\nKeep the launcher open while playing. This address changes when the tunnel restarts.\n').catch(()=>{});}
  if(!printed&&/ERR/.test(data.toString()))console.log(data.toString());
 };
 tunnel.stdout.on('data',output);tunnel.stderr.on('data',output);tunnel.once('error',e=>console.error('Tunnel could not start: '+e.message));tunnel.once('exit',()=>{tunnel=null;if(!stopping)console.log('Public link stopped. Type share to create another.');});
}
async function finish(code){
 if(finished)return;finished=true;ready=false;
 tunnel?.kill();if(gateway)await gateway.stop().catch(()=>{});reader?.close();
 try{if(code===0){console.log('\nServer stopped. Backing up the saved world...');const b=await backupStopped();if(b)console.log('Backup saved: '+b);else console.log('No world has been created yet.');}else console.error('\nServer did not exit cleanly. Automatic backup skipped; existing saves are preserved. Check server/logs/latest.log.');}
 catch(e){console.error('Your world files remain in server/. ZIP backup failed: '+e.message);}
 await releaseLock();process.exitCode=code===0?0:1;
}
async function stop(){if(stopping)return;stopping=true;console.log('\nSaving all dimensions and stopping safely...');tunnel?.kill();if(game&&game.exitCode===null)game.stdin.write('stop\n');else await finish(0);}
try{
 await acquireLock();
 if(process.argv.includes('--backup-only')){const result=await backupStopped();console.log(result?'All worlds exported: '+result:'No saved world found.');await releaseLock();}
 else if(process.argv.includes('--import-world')){const prompt=createInterface({input:process.stdin,output:process.stdout});try{const source=(await prompt.question('Path to your STOPPED old Minecraft setup folder: ')).trim().replace(/^"|"$/g,'');const entry=await importOldInstallation(source);console.log('Copied world: '+entry.name+'. The original was not changed. Use START.bat to select it.');}finally{prompt.close();await releaseLock();}}
 else{
  console.log('\nOUR MINECRAFT WORLD - Java 1.12.2 in your browser\n');const java=await ensureFiles();const c=await config();
  const eula=await readFile(at('server','eula.txt'),'utf8');
  if(!/^\s*eula\s*=\s*true\s*$/m.test(eula)){
   if(!process.stdin.isTTY)throw Error('Minecraft EULA acceptance is required. Run START.bat yourself to review it.');
   const prompt=createInterface({input:process.stdin,output:process.stdout});console.log('\nRead the Minecraft EULA: https://www.minecraft.net/eula\nThis setup does not accept it for you.');const answer=await prompt.question('If you accept the Minecraft EULA, type AGREE (anything else stops): ');prompt.close();
   if(answer.trim()!=='AGREE')throw Error('EULA not accepted. No server was started.');
   await writeFile(at('server','eula.txt'),'# Accepted interactively by the user on '+new Date().toISOString()+'\neula=true\n');
  }
  const memory=Number.isInteger(c.memoryMB)&&c.memoryMB>=1024&&c.memoryMB<=16384?c.memoryMB:2048;
  const world=await chooseWorld();console.log('Preparing minimap for '+world.name+'...');await prepareOptionalMinimap(c);
  gateway=createGateway(c);await new Promise((resolve,reject)=>{gateway.once('error',reject);gateway.listen(c.httpPort,'127.0.0.1',resolve);});
  console.log(`Browser gateway ready on port ${c.httpPort}. Starting the world server; first launch can take several minutes...`);
  game=spawn(java,['-Xms512M',`-Xmx${memory}M`,'-Dfile.encoding=UTF-8','-jar','paper-1.12.2.jar','nogui'],{cwd:at('server'),windowsHide:true,stdio:['pipe','pipe','pipe']});
  game.stdin.on('error',e=>{if(e.code!=='EPIPE'&&!stopping)console.error('Server input error: '+e.message);});
  let line='';const output=data=>{process.stdout.write(data);line=(line+data.toString()).slice(-10000);if(!ready&&/Done \([^)]+\)!/.test(line)){
   ready=true;const url=publicLink(`http://localhost:${c.httpPort}`,c.inviteKey);console.log('\nREADY TO PLAY:\n'+url+'\n\nCommands: share = create girlfriend invite | stop = save, stop, and back up\nIn-game first visit: /register YOUR_PASSWORD YOUR_PASSWORD\nLater visits: /login YOUR_PASSWORD (choose a unique game-only password).\n');openBrowser(url);
  }};
  game.stdout.on('data',output);game.stderr.on('data',output);game.once('error',async e=>{console.error('Java failed: '+e.message);await finish(1);});game.once('exit',async code=>await finish(code));
  reader=createInterface({input:process.stdin,output:process.stdout});let commandBusy=false;
  reader.on('line',async raw=>{if(commandBusy||stopping)return;const cmd=raw.trim();commandBusy=true;try{
   if(cmd==='stop'||cmd==='backup')await stop();
   else if(cmd==='share')await share(c);
   else if(cmd==='help')console.log('share: create a public link. stop: save + stop + ZIP backup. backup: also safely stops before backing up. Other input goes to the Minecraft console.');
   else if(cmd&&game.exitCode===null)game.stdin.write(cmd+'\n');
  }catch(e){console.error(e.message);}finally{commandBusy=false;}});
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
 }
}catch(e){console.error('\nSETUP STOPPED: '+e.message+'\nExisting worlds were not removed. Keep this window open to read the error.');if(gateway)await gateway.stop().catch(()=>{});await releaseLock();process.exitCode=1;}
