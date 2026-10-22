import {readFile,writeFile,mkdir,readdir,cp} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import path from 'node:path';
import {at,exists} from './lib.mjs';
export const validLevel=s=>typeof s==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,60}$/.test(s)&&!s.endsWith('_nether')&&!s.endsWith('_the_end');
export function levelFromProperties(text){const level=text.match(/^level-name=(.+)$/m)?.[1]?.trim()||'world';if(!validLevel(level))throw Error('World names must use letters, numbers, underscores or hyphens. Existing custom world paths were left unchanged.');return level;}
export async function catalogue(base=at('server')){
 await mkdir(base,{recursive:true});const f=path.join(base,'world-catalog.json');let rows=await exists(f)?JSON.parse(await readFile(f,'utf8')):[];
 if(!Array.isArray(rows)||rows.some(r=>!validLevel(r.level)||typeof r.name!=='string'))throw Error('Invalid world catalogue. No saves were changed.');
 const props=path.join(base,'server.properties');const active=await exists(props)?levelFromProperties(await readFile(props,'utf8')):'world';
 for(const e of await readdir(base,{withFileTypes:true}))if(e.isDirectory()&&validLevel(e.name)&&await exists(path.join(base,e.name,'level.dat'))&&!rows.some(r=>r.level===e.name))rows.push({name:e.name==='world'?'Our original world':e.name,level:e.name});
 if(!rows.some(r=>r.level===active))rows.unshift({name:active==='world'?'Our original world':active,level:active});
 await writeFile(f,JSON.stringify(rows,null,2));return {rows,active};
}
export async function createWorld(name,base=at('server')){
 name=String(name).trim();if(!name||name.length>60||/[\x00-\x1f]/.test(name))throw Error('Use a world display name of 1–60 characters.');
 const c=await catalogue(base);const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,35)||'adventure';
 let level='world-'+slug,i=2;while(c.rows.some(r=>r.level===level)||await exists(path.join(base,level)))level='world-'+slug+'-'+i++;
 const entry={name,level};c.rows.push(entry);await writeFile(path.join(base,'world-catalog.json'),JSON.stringify(c.rows,null,2));return entry;
}
export async function selectWorld(entry,base=at('server')){
 if(!validLevel(entry.level))throw Error('Invalid world folder.');const p=path.join(base,'server.properties');let text=await exists(p)?await readFile(p,'utf8'):'';
 text=/^level-name=.*$/m.test(text)?text.replace(/^level-name=.*$/m,'level-name='+entry.level):text+'\nlevel-name='+entry.level+'\n';await writeFile(p,text);return entry;
}
export async function chooseWorld(){
 const c=await catalogue();if(!process.stdin.isTTY)return c.rows.find(r=>r.level===c.active);
 const rl=createInterface({input:process.stdin,output:process.stdout});try{
  console.log('\nYOUR SAVED WORLDS');c.rows.forEach((r,i)=>console.log(`  ${i+1}. ${r.name}${r.level===c.active?' (last played)':''}`));console.log('  N. Create a new world');
  const input=(await rl.question('Choose a number, N, or Enter for last played: ')).trim();let chosen;
  if(input.toLowerCase()==='n')chosen=await createWorld(await rl.question('New world name: '));
  else if(!input)chosen=c.rows.find(r=>r.level===c.active);else chosen=c.rows[Number(input)-1];
  if(!chosen)throw Error('No such world. Run START.bat again and choose a listed number.');
  await selectWorld(chosen);console.log('Selected: '+chosen.name+'\n');return chosen;
 }finally{rl.close();}
}
export async function importOldInstallation(source,base=at('server')){
 source=path.resolve(source);const oldBase=await exists(path.join(source,'server','server.properties'))?path.join(source,'server'):source;
 if(oldBase===path.resolve(base))throw Error('Choose a different old installation.');
 if(await exists(path.join(source,'launcher.lock'))||await exists(path.join(path.dirname(oldBase),'launcher.lock')))throw Error('Stop the old launcher before copying its worlds.');
 if(!await exists(path.join(oldBase,'server.properties')))throw Error('That folder does not contain a Minecraft server installation.');
 const oldLevel=levelFromProperties(await readFile(path.join(oldBase,'server.properties'),'utf8'));
 if(!await exists(path.join(oldBase,oldLevel,'level.dat')))throw Error('No saved world was found there.');
 const entry=await createWorld(path.basename(path.dirname(oldBase))+' (imported)',base);
 for(const suffix of ['','_nether','_the_end'])if(await exists(path.join(oldBase,oldLevel+suffix)))await cp(path.join(oldBase,oldLevel+suffix),path.join(base,entry.level+suffix),{recursive:true,errorOnExist:true,force:false});
 return entry;
}
