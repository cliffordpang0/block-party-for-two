import {createHash,randomBytes} from 'node:crypto';
import {readFile,writeFile,mkdir,access,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';
export const ROOT=fileURLToPath(new URL('./',import.meta.url));
export const at=(...parts)=>path.join(ROOT,...parts);
export const exists=async p=>{try{await access(p);return true;}catch{return false;}};
export const manifest=JSON.parse(await readFile(at('downloads.json'),'utf8'));
export function gitHash(bytes){return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');}
export async function verify(file,item){try{const bytes=await readFile(file);return (!item.size||bytes.length===item.size)&&(item.sha?gitHash(bytes)===item.sha:createHash(item.sha1?'sha1':'sha256').update(bytes).digest('hex')===(item.sha1||item.sha256));}catch{return false;}}
export async function config(){
 const p=at('local-config.json');if(await exists(p)){const c=JSON.parse(await readFile(p,'utf8'));if(!/^[a-f0-9]{48}$/.test(c.inviteKey))throw Error('Invalid invite key in local-config.json');return c;}
 const c={inviteKey:randomBytes(24).toString('hex'),httpPort:3001,gamePort:25565,memoryMB:2048};await writeFile(p,JSON.stringify(c,null,2),{flag:'wx'});return c;
}
export function publicLink(origin,key){const u=new URL(origin);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Invalid origin');u.pathname=`/play/${key}/`;u.search='';u.hash='';return u.href;}
export const psQuote=s=>"'"+String(s).replaceAll("'","''")+"'";
export function run(command,args,options={}){return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd:ROOT,windowsHide:true,stdio:'inherit',...options});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`${path.basename(command)} exited with code ${code}`)));});}
export async function download(url,file,item){
 if(await verify(file,item))return;
 await mkdir(path.dirname(file),{recursive:true});console.log(`Downloading ${path.basename(file)}${item.size?` (${Math.ceil(item.size/1048576)} MB)`:''} ...`);
 const allowed=new Set(['raw.githubusercontent.com','github.com','api.github.com','release-assets.githubusercontent.com','objects.githubusercontent.com','api.adoptium.net','hub.spigotmc.org']);
 let response;
 for(let i=0;i<8;i++){
  const u=new URL(url);if(u.protocol!=='https:'||!allowed.has(u.hostname))throw Error('Unexpected download host: '+u.hostname);
  response=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(180000),headers:{'User-Agent':'Minecraft-Home-Setup/1.0'}});
  if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw Error('Download redirect has no location');url=new URL(location,url).href;await response.body?.cancel();continue;}break;
 }
 if(!response?.ok)throw Error(`Download failed: HTTP ${response?.status||'unknown'}`);
 const tmp=file+'.download';const handle=await (await import('node:fs/promises')).open(tmp,'w');let count=0;
 try{for await(const chunk of response.body){count+=chunk.length;if(count>(item.size||300*1048576)+1024)throw Error('Download exceeded expected size');await handle.writeFile(chunk);}}finally{await handle.close();}
 if(!await verify(tmp,item))throw Error('Checksum mismatch: '+path.basename(file)+'. Nothing was executed.');
 await rename(tmp,file);
}
