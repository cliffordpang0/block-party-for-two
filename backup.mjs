import {mkdir,stat,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {at,ROOT,exists,psQuote,run} from './lib.mjs';
import {fileURLToPath} from 'node:url';
import {catalogue} from './worlds.mjs';
export async function backupTargets(base=at('server')){
 const {rows}=await catalogue(base);const names=['world-catalog.json','plugins/AuthMe','plugins/SkinsRestorer','server.properties','bukkit.yml','spigot.yml','paper.yml','ops.json','whitelist.json','banned-players.json','banned-ips.json'];
 let worlds=0;for(const {level} of rows)for(const suffix of ['','_nether','_the_end']){const n=level+suffix;if(await exists(path.join(base,n))){names.push(n);if(!suffix)worlds++;}}
 const targets=[];for(const n of names)if(await exists(path.join(base,...n.split('/'))))targets.push(path.join(base,...n.split('/')));return {targets,worlds};
}
export async function backupStopped(){
 // Only a fully stopped server is backed up: never zip world region files mid-write.
 const {targets,worlds}=await backupTargets();if(!worlds)return null;
 await mkdir(at('backups'),{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,'-');const target=at('backups',`all-worlds-${stamp}.zip`);
 if(process.platform!=='win32')throw Error('Automatic ZIP backup currently supports Windows. Copy the stopped server folder manually on other platforms.');
 await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Compress-Archive -LiteralPath ${targets.map(psQuote).join(',')} -DestinationPath ${psQuote(target)} -CompressionLevel Optimal`]);
 const hash=createHash('sha256');for await(const chunk of createReadStream(target))hash.update(chunk);await writeFile(target+'.sha256',hash.digest('hex')+'  '+path.basename(target)+'\n');return target;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 console.error('Use BACKUP.bat after the server has stopped, or type backup in the running launcher.');process.exitCode=1;
}
