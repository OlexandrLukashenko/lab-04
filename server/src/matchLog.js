import { Transform, pipeline } from 'node:stream';
import { createWriteStream, createReadStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function createNdjsonTransform(){
  return new Transform({ writableObjectMode:true, transform(event, enc, cb){ try { cb(null, JSON.stringify(event)+'\n'); } catch(e){ cb(e); } } });
}
export function createMatchLogger(logDir, matchId){
  mkdirSync(logDir,{recursive:true});
  const target=createWriteStream(join(logDir,`${matchId}.ndjson`),{flags:'a'});
  const transform=createNdjsonTransform();
  pipeline(transform,target,err=>{ if(err) console.error('log pipeline:',err); });
  return { write(event){ return transform.write({ts:Date.now(),...event}); }, end(){ transform.end(); }, file:target.path };
}
export function replayStream(logDir, matchId){ return createReadStream(join(logDir,`${matchId}.ndjson`)); }
