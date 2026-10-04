import { fetchJson } from './asyncUtils.js';
import { ReconnectingSocket } from './socket.js';
export class Lobby extends EventTarget {
  constructor({intervalMs=5000}={}){super();this.intervalMs=intervalMs;this.controller=null;this.timer=null;this.visible=false;this.socket=new ReconnectingSocket();this.socket.addEventListener('message',e=>{try{const m=JSON.parse(e.data);if(m.type==='chat'||m.type==='system'||m.type==='joined')this.dispatchEvent(new CustomEvent(m.type,{detail:m}));}catch{}});}
  async refresh(){this.controller?.abort();this.controller=new AbortController();const timeout=AbortSignal.timeout(2500);const signal=AbortSignal.any([this.controller.signal,timeout]);const data=await fetchJson('/api/rooms',{signal});this.dispatchEvent(new CustomEvent('rooms',{detail:data}));return data;}
  start(){this.visible=true;this.refresh().catch(e=>this.dispatchEvent(new CustomEvent('error',{detail:e})));this.timer=setInterval(()=>this.refresh().catch(e=>this.dispatchEvent(new CustomEvent('error',{detail:e}))),this.intervalMs);}
  stop(){this.visible=false;clearInterval(this.timer);this.timer=null;this.controller?.abort();}
  join(name,room){this.socket.send({type:'join',name,roomId:room.id});this.dispatchEvent(new CustomEvent('join',{detail:{name,room}}));this.stop();}
  chat(text){this.socket.send({type:'chat',text});}
  leave(){this.socket.send({type:'leave'});this.socket.close();}
}
