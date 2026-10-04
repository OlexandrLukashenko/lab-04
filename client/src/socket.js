export class ReconnectingSocket extends EventTarget {
  constructor(url=location.origin.replace(/^http/,'ws')+'/ws') { super(); this.url=url; this.ws=null; this.queue=[]; this.delay=500; this.closed=false; this.connect(); }
  connect(){ if(this.closed)return; this.ws=new WebSocket(this.url); this.ws.addEventListener('open',()=>{this.delay=500;this.dispatchEvent(new Event('open'));this.flush();}); this.ws.addEventListener('message',e=>this.dispatchEvent(new MessageEvent('message',{data:e.data}))); this.ws.addEventListener('error',e=>this.dispatchEvent(new Event('error'))); this.ws.addEventListener('close',()=>{this.dispatchEvent(new Event('close'));if(!this.closed){const d=this.delay;this.delay=Math.min(this.delay*2,10000);setTimeout(()=>this.connect(),d);}}); }
  send(value){const data=typeof value==='string'?value:JSON.stringify(value);if(this.ws?.readyState===WebSocket.OPEN&&this.ws.bufferedAmount<256*1024)this.ws.send(data);else this.queue.push(data);}
  flush(){while(this.queue.length&&this.ws?.readyState===WebSocket.OPEN&&this.ws.bufferedAmount<256*1024)this.ws.send(this.queue.shift());}
  close(){this.closed=true;this.ws?.close();}
}
