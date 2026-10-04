import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream, mkdirSync } from 'node:fs';
import { join, normalize, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { config } from './config.js';
import { RoomManager } from './rooms.js';
import { Client } from './client.js';
import { createMatchLogger, replayStream } from './matchLog.js';

const here=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..');
const root=resolve(here,config.clientDir);
const logs=resolve(here,config.logDir);
mkdirSync(logs,{recursive:true});
const rooms=new RoomManager();
const sockets=new Set();
const loggers=new Map();

function contentType(path){ return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.wav':'audio/wav'})[extname(path)] || 'application/octet-stream'; }
async function safeFile(pathname){
  let pathnameClean=decodeURIComponent(pathname.split('?')[0]);
  if(pathnameClean.includes('..')) return null;
  if(pathnameClean==='/' ) pathnameClean='/index.html';
  const candidate=normalize(join(root,pathnameClean));
  if(!candidate.startsWith(root)) return null;
  try { const s=await stat(candidate); return s.isFile()?candidate:null; } catch { return null; }
}
async function body(req){ let chunks=[]; let total=0; for await(const chunk of req){ total+=chunk.length; if(total>config.maxMessageBytes) throw Object.assign(new Error('payload too large'),{status:413}); chunks.push(chunk); } return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'); }
function roomsJson(){ return JSON.stringify({rooms:rooms.list()}); }

const server=http.createServer(async(req,res)=>{
  try{
    if(req.url==='/health'){ const data=Buffer.from(JSON.stringify({ok:true,uptime:process.uptime()})); res.writeHead(200,{'content-type':'application/json','content-length':data.length}); res.end(data); return; }
    if(req.url==='/api/rooms' && req.method==='GET'){ const data=Buffer.from(roomsJson()); res.writeHead(200,{'content-type':'application/json','content-length':data.length}); res.end(data); return; }
    if(req.url==='/api/rooms' && req.method==='POST'){ const input=await body(req); if(typeof input.name!=='string'||!input.name.trim()) throw Object.assign(new Error('name required'),{status:400}); const room=rooms.create(input.name.trim().slice(0,40),input.config||{}); const data=Buffer.from(JSON.stringify({room:{id:room.id,name:room.name,players:0,config:room.config}})); res.writeHead(201,{'content-type':'application/json','content-length':data.length}); res.end(data); return; }
    if(req.url?.startsWith('/api/replay/') && req.method==='GET'){ const id=req.url.split('/').pop(); if(!/^[a-zA-Z0-9_-]+$/.test(id)){res.writeHead(400);res.end('bad id');return;} const stream=replayStream(logs,id); stream.on('error',()=>{res.writeHead(404);res.end('not found');}); res.writeHead(200,{'content-type':'application/x-ndjson'}); stream.pipe(res); return; }
    const file=await safeFile(req.url||'/'); if(!file){res.writeHead(403);res.end('Forbidden');return;} const data=await readFile(file); res.writeHead(200,{'content-type':contentType(file),'content-length':data.length}); res.end(data);
  }catch(err){ const code=err.status||500; if(!res.headersSent)res.writeHead(code,{'content-type':'application/json'}); res.end(JSON.stringify({error:err.message})); }
});

const wss=new WebSocketServer({noServer:true,maxPayload:config.maxMessageBytes});
server.on('upgrade',(req,socket,head)=>{ if(req.url!=='/ws'){socket.destroy();return;} wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req)); });

function logFor(room){ if(!loggers.has(room.id)) loggers.set(room.id,createMatchLogger(logs,room.id)); return loggers.get(room.id); }
function validMessage(m){ if(!m||typeof m!=='object'||typeof m.type!=='string') return false; const allowed=['join','leave','chat','ping']; if(!allowed.includes(m.type)) return false; if(m.type==='join' && (typeof m.roomId!=='string'||typeof m.name!=='string')) return false; if(m.type==='chat' && (typeof m.text!=='string'||m.text.length>500)) return false; return true; }

wss.on('connection',(ws)=>{
  const client=new Client(ws); sockets.add(ws); let joinTimer=setTimeout(()=>{if(!client.joined) ws.close(4001,'join timeout');},config.joinTimeoutMs);
  ws.isAlive=true; ws.on('pong',()=>ws.isAlive=true);
  const heartbeat=setInterval(()=>{ if(!ws.isAlive){ws.terminate();return;} ws.isAlive=false; ws.ping(); },15000);
  ws.on('message',(raw)=>{
    if(raw.length>config.maxMessageBytes || !client.allowMessage(config.rateLimitPerSecond)){ws.close(1008,'message limit');return;}
    let m; try{m=JSON.parse(raw.toString('utf8'));}catch{ws.close(1007,'invalid json');return;}
    if(!validMessage(m)){ws.close(1003,'invalid message');return;}
    if(m.type==='join'){
      const room=rooms.get(m.roomId); if(!room){ws.close(1008,'room not found');return;}
      client.name=m.name.trim().slice(0,32)||'Guest'; client.room=room; client.joined=true; clearTimeout(joinTimer); room.join(client); logFor(room).write({event:'join',client:client.id,name:client.name}); client.sendJson({type:'joined',room:{id:room.id,name:room.name,players:room.size,config:room.config}}); room.broadcast({type:'system',text:`${client.name} joined the room`},client.id); return;
    }
    if(m.type==='leave'){ if(client.room){const r=client.room; r.leave(client); logFor(r).write({event:'leave',client:client.id,name:client.name}); r.broadcast({type:'system',text:`${client.name} left the room`},client.id); rooms.removeIfEmpty(r);} return; }
    if(m.type==='chat'){ if(!client.joined){ws.close(1008,'join first');return;} const text=m.text.trim(); if(!text){return;} const r=client.room; const event={type:'chat',name:client.name,text}; r.broadcast(event); logFor(r).write({event:'chat',client:client.id,name:client.name,text}); }
    if(m.type==='ping') client.sendJson({type:'pong',ts:Date.now()});
  });
  ws.on('close',()=>{clearTimeout(joinTimer);clearInterval(heartbeat);sockets.delete(ws);if(client.room){const r=client.room;r.leave(client);logFor(r).write({event:'leave',client:client.id,name:client.name});r.broadcast({type:'system',text:`${client.name} left the room`},client.id);rooms.removeIfEmpty(r);}});
  ws.on('error',(err)=>console.error('WebSocket error',err));
});

function shutdown(signal){ console.log(`${signal}: shutting down`); for(const ws of sockets) ws.close(1001,'server shutdown'); for(const logger of loggers.values()) logger.end(); server.close(()=>process.exit(0)); setTimeout(()=>process.exit(0),2000).unref(); }
process.on('SIGINT',()=>shutdown('SIGINT')); process.on('SIGTERM',()=>shutdown('SIGTERM'));
server.listen(config.port,()=>console.log(`Server listening on http://localhost:${config.port}`));
