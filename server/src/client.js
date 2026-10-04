import { randomUUID } from 'node:crypto';
export class Client {
  constructor(ws){ this.id=randomUUID(); this.ws=ws; this.name='Guest'; this.room=null; this.joined=false; this.rate={second:0,count:0}; }
  sendJson(payload){
    if(this.ws.readyState!==1 || this.ws.bufferedAmount > 256*1024) return false;
    const text=JSON.stringify(payload);
    if(Buffer.byteLength(text)>4096) return false;
    this.ws.send(text); return true;
  }
  allowMessage(limit){ const sec=Math.floor(Date.now()/1000); if(sec!==this.rate.second){this.rate={second:sec,count:0};} return ++this.rate.count <= limit; }
}
