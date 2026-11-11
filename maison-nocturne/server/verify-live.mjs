import './local-env.mjs';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {clues,puzzles} from '../src/escape/content.ts';
const base=process.env.VERIFY_URL||'http://127.0.0.1:5175';
const hostKey=process.env.HOST_KEY||(await readFile(new URL('../data/host-key.txt',import.meta.url),'utf8')).trim();
async function api(path,body,token){
  const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(55000)});
  const result=await response.json();
  assert.ok(response.ok,`${path}: ${response.status} ${result.error||''}`);return result;
}
assert.equal((await fetch(base)).status,200);
assert.equal((await api('/api/health')).database,'connected');
console.log('PASS: app HTML and live Neon health endpoint');
const host=await api('/api/events',{hostKey,expected:50});
const path='/api/events/'+host.code;
const players=await Promise.all(Array.from({length:50},(_,i)=>api(path+'/join',{name:`QA ${i+1}`,requestId:`live-verification-${host.code}-${i}`})));
console.log('PASS: 50 concurrent HTTP joins saved in Neon');
let active=players;
for(let round=0;round<4;round++){
  await api(path+'/start',{},host.hostToken);
  await Promise.all(active.map(async player=>{for(const clue of clues.filter(c=>c.room===round))await api(path+'/clues',{round,clueId:clue.id},player.playerToken);}));
  await Promise.all(active.map(player=>api(path+'/finish',{round,answer:puzzles[round].answers[0]},player.playerToken)));
  const result=await api(path,undefined,host.hostToken);
  const qualifiers=result.players.filter(p=>p.qualified);
  assert.equal(qualifiers.length,[30,15,5,1][round]);
  console.log(`PASS: Room ${round+1}: ${active.length} completed → ${qualifiers.length} ${round===3?'winner':'qualified'}`);
  active=players.filter(p=>qualifiers.some(q=>q.id===p.playerId));
}
const final=await api(path,undefined,host.hostToken);
assert.equal(final.status,'finished');assert.equal(final.history.length,4);
const qr=await fetch(base+'/api/qr?url='+encodeURIComponent(base+'/?event='+host.code));
assert.equal(qr.status,200);assert.match(await qr.text(),/<svg/);
console.log('PASS: four persisted leaderboards, final winner and QR endpoint');
console.log(`Completed QA event ${host.code}; retained as test evidence, not the classroom event.`);
