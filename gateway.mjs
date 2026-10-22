import http from 'node:http';
import net from 'node:net';
import {stat,readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {at} from './lib.mjs';
import {validateMap} from './map-state.mjs';
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.epw':'application/octet-stream','.png':'image/png'};
export function routePath(raw,key){
 let url;try{url=new URL(raw,'http://localhost');}catch{return null;}
 const prefix=`/play/${key}/`;if(!url.pathname.startsWith(prefix))return null;
 const tail=url.pathname.slice(prefix.length)||'index.html';
 return ['index.html','bootstrap.js','assets.epw','favicon.png','socket','minimap.js','map-math.js','map.json'].includes(tail)?tail:null;
}
export function clientHtml(){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Our Minecraft World · 1.12.2</title><link rel="icon" href="favicon.png"><style>html,body,#game_frame{width:100%;height:100%;margin:0;background:#101810;color:#e5eedb;font:16px system-ui}#loading{padding:32px;max-width:680px;margin:auto;line-height:1.7}a{color:#a6ce86}</style><script src="bootstrap.js"></script></head><body><div id="game_frame"><div id="loading"><h1>Our Minecraft World</h1><p>Loading Minecraft 1.12.2… The first load downloads about 18 MB.</p><p>Choose Multiplayer → Our survival world. When asked, use a nickname and register your own server password. Use the same nickname every time to keep your inventory.</p><p id="failure"></p></div></div><script>
window.addEventListener('load',function(){
 if(typeof window.main!=='function'){document.getElementById('failure').textContent='The client is missing. Run START.bat on the host PC to finish setup.';return;}
 const socket=new URL('socket',location.href);socket.protocol=location.protocol==='https:'?'wss:':'ws:';
 window.eaglercraftXOpts={demoMode:false,container:'game_frame',assetsURI:'assets.epw',worldsDB:'our-minecraft-1122',servers:[{addr:socket.href,name:'Our survival world'}],joinServer:socket.href,relays:[]};
 try{main();}catch(e){document.body.textContent='Could not start the browser client: '+e.message;}
});</script><script type="module" src="minimap.js"></script></body></html>`;}
export function createHandler(c){let mapState={players:[],updated:0};return async(req,res)=>{
 if(req.url==='/internal/map'){
  if(req.method!=='POST'||!c.minimapKey||req.headers?.['x-map-key']!==c.minimapKey||!['127.0.0.1','::ffff:127.0.0.1','::1'].includes(req.socket?.remoteAddress)){res.writeHead(403);res.end();return;}
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>1000000)throw Error('Too large');}const data=validateMap(JSON.parse(body));if(!data)throw Error('Invalid map');mapState=data;res.writeHead(204);res.end();}catch{res.writeHead(400);res.end();}return;
 }
 const file=routePath(req.url,c.inviteKey);
 const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'SAMEORIGIN','Permissions-Policy':'camera=(), microphone=()'};
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,headers);res.end('Method not allowed');return;}
 if(!file||file==='socket'){res.writeHead(404,headers);res.end('Open the complete invite link printed by the launcher.');return;}
 if(file==='map.json'){res.writeHead(200,{...headers,'Content-Type':'application/json','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:JSON.stringify({...(Date.now()-mapState.updated<10000?mapState:{players:[],updated:mapState.updated}),available:c.minimapReady!==false}));return;}
 if(file==='index.html'){res.writeHead(200,{...headers,'Content-Type':TYPES['.html'],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:clientHtml());return;}
 try{const p=at('web',file),s=await stat(p);res.writeHead(200,{...headers,'Content-Type':TYPES[path.extname(file)],'Content-Length':s.size,'Cache-Control':'private, max-age=3600'});if(req.method==='HEAD')res.end();else{const stream=createReadStream(p);stream.on('error',()=>res.destroy());stream.pipe(res);}}
 catch{res.writeHead(503,{...headers,'Content-Type':'text/plain'});res.end('The browser client has not downloaded yet. Run START.bat on the host PC.');}
};}
export function createGateway(c){
 const server=http.createServer(createHandler(c));const connections=new Set();server.on('connection',socket=>{connections.add(socket);socket.once('close',()=>connections.delete(socket));});
 server.on('upgrade',(req,client,head)=>{
  if(routePath(req.url,c.inviteKey)!=='socket'||req.headers.upgrade?.toLowerCase()!=='websocket'){client.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');return;}
  const upstream=net.connect({host:'127.0.0.1',port:c.gamePort});
  upstream.once('connect',()=>{
   const lines=['GET / HTTP/1.1',`Host: 127.0.0.1:${c.gamePort}`];
   for(let i=0;i<req.rawHeaders.length;i+=2){const k=req.rawHeaders[i];if(['host','x-forwarded-for','x-real-ip','forwarded'].includes(k.toLowerCase()))continue;lines.push(k+': '+req.rawHeaders[i+1]);}
   upstream.write(lines.join('\r\n')+'\r\n\r\n');if(head.length)upstream.write(head);client.pipe(upstream);upstream.pipe(client);
  });
  upstream.on('error',()=>client.destroy());client.on('error',()=>upstream.destroy());client.on('close',()=>upstream.destroy());upstream.on('close',()=>client.destroy());
 });
 server.stop=()=>{for(const c of connections)c.destroy();return new Promise(resolve=>server.close(resolve));};return server;
}
