import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

export class Room extends EventEmitter {
  constructor(id, name, config){ super(); this.id=id; this.name=name; this.config=config; this.clients=new Map(); }
  join(client){ this.clients.set(client.id, client); this.emit('join', { room:this.id, client:client.id, name:client.name }); }
  leave(client){ if(this.clients.delete(client.id)) this.emit('leave',{room:this.id,client:client.id,name:client.name}); }
  broadcast(message, exceptId=null){ for(const [id, client] of this.clients){ if(id===exceptId) continue; client.sendJson(message); } }
  get size(){ return this.clients.size; }
}

export class RoomManager extends EventEmitter {
  constructor(){ super(); this.rooms=new Map(); this.seed(); }
  seed(){
    const defaults=[['alpha','Alpha Arena',{width:1200,height:700,asteroids:8,difficulty:1}],['beta','Beta Arena',{width:1400,height:800,asteroids:12,difficulty:1.5}],['training','Training',{width:1000,height:600,asteroids:4,difficulty:.7}]];
    for(const [id,name,cfg] of defaults) this.rooms.set(id,new Room(id,name,cfg));
  }
  list(){ return [...this.rooms.values()].map(r=>({id:r.id,name:r.name,players:r.size,config:r.config})); }
  get(id){ return this.rooms.get(id); }
  create(name, cfg={}){ const id=randomUUID(); const room=new Room(id,name,cfg); this.rooms.set(id,room); return room; }
  removeIfEmpty(room){ if(room.size===0 && room.id !== 'alpha' && room.id !== 'beta' && room.id !== 'training'){ this.rooms.delete(room.id); this.emit('roomRemoved',room.id); } }
}
