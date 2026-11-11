import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {PostgresTournamentStore,createPool} from './postgres-store.mjs';
import {cloudHandler} from './cloud-api.mjs';
import {clues,puzzles} from '../src/escape/content.ts';

// PGlite executes actual PostgreSQL SQL, but has one connection. This pool
// queues transactions. TEST_DATABASE_URL additionally tests real row locking
// across independent connections against an isolated temporary schema.
async function database() {
  if(process.env.TEST_DATABASE_URL){
    const schema='couture_test_'+Date.now();
    const admin=createPool(process.env.TEST_DATABASE_URL);
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool=createPool(process.env.TEST_DATABASE_URL,{options:`-c search_path=${schema}`});
    await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
    return {pool,close:async()=>{await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}};
  }
  const db=new PGlite();
  await db.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
  let tail=Promise.resolve();
  const pool={async connect(){let release;const previous=tail;tail=new Promise(resolve=>{release=resolve;});await previous;return {query:(q,p)=>!p&&q.includes(';')?db.exec(q).then(results=>results.at(-1)):db.query(q,p),release};},async query(q,p){const c=await this.connect();try{return await c.query(q,p);}finally{c.release();}}};
  return {pool,close:()=>db.close()};
}

test('database API: concurrent 50 → 30 → 15 → 5 → 1, fresh instances, retries and permissions',async()=>{
  const db=await database();
  const hostKey='test-host-password';
  const request=async(path,{body,token,method=body?'POST':'GET',origin='https://museum.example'}={})=>{
    // Fresh store and handler on every request emulate separate cold functions.
    const handler=cloudHandler({getStore:()=>new PostgresTournamentStore({pool:db.pool,hostKey}),publicUrl:'https://museum.example'});
    let response;
    await handler({url:path,method,headers:{host:'museum.example',origin,...(token?{authorization:'Bearer '+token}:{})},body},{setHeader(){},statusCode:200,end(value){response={status:this.statusCode,body:JSON.parse(value)};}});
    return response;
  };
  const ok=async(path,options)=>{const r=await request(path,options);assert.ok(r.status<300,JSON.stringify(r));return r.body;};
  try{
    assert.equal((await request('/api/events',{body:{hostKey:'wrong'}})).status,403);
    assert.equal((await request('/api/events',{body:{hostKey},origin:'https://untrusted.example'})).status,403);
    assert.equal((await request('/api/events',{body:'{broken'})).status,400);
    const host=await ok('/api/index?route=events',{body:{hostKey,expected:50}});
    const base='/api/events/'+host.code;
    const players=await Promise.all(Array.from({length:50},(_,i)=>ok(base+'/join',{body:{name:`Player ${i}`,requestId:`concurrent-request-${i}`}})));
    assert.equal(new Set(players.map(p=>p.playerId)).size,50);
    const duplicate=await ok(base+'/join',{body:{name:'retry',requestId:'concurrent-request-0'}});
    assert.equal(duplicate.playerToken,players[0].playerToken);
    assert.equal((await request(base+'/join',{body:{name:'Overflow',requestId:'overflow-request-51'}})).status,409);
    assert.equal((await request(base)).status,401);
    assert.equal((await request(base+'/start',{token:players[0].playerToken,body:{}})).status,403);
    let active=players;
    for(let round=0;round<4;round++){
      await ok(base+'/start',{token:host.hostToken,body:{}});
      assert.equal((await ok(base,{token:host.hostToken})).activeCount,[50,30,15,5][round]);
      const eliminated=players.find(p=>!active.includes(p));
      if(eliminated) assert.equal((await request(base+'/clues',{token:eliminated.playerToken,body:{round,clueId:clues.find(c=>c.room===round).id}})).status,409);
      assert.equal((await request(base+'/finish',{token:active[0].playerToken,body:{round,answer:puzzles[round].answers[0]}})).status,400);
      await Promise.all(active.map(async p=>{for(const clue of clues.filter(c=>c.room===round))await ok(base+'/clues',{token:p.playerToken,body:{round,clueId:clue.id}});}));
      const finishes=await Promise.all(active.map(p=>ok(base+'/finish',{token:p.playerToken,body:{round,answer:puzzles[round].answers[0],elapsedMs:-99999}})));
      assert.ok(finishes.length);
      const result=await ok(base,{token:host.hostToken});
      const qualified=result.players.filter(p=>p.qualified);
      assert.equal(qualified.length,[30,15,5,1][round]);
      assert.equal(new Set(result.players.map(p=>p.rank)).size,active.length);
      assert.ok(result.players.every(p=>p.elapsedMs>=0));
      // A lost response may be retried without another finish or changed rank.
      const retry=await ok(base+'/finish',{token:active[0].playerToken,body:{round,answer:puzzles[round].answers[0]}});
      assert.equal(retry.finishedCount,active.length);
      assert.ok(!JSON.stringify(result).includes('playerToken'));
      assert.ok(!JSON.stringify(result).includes(host.hostToken));
      active=players.filter(p=>qualified.some(q=>q.id===p.playerId));
    }
    assert.equal((await ok(base,{token:host.hostToken})).status,'finished');
    assert.equal((await ok(base,{token:active[0].playerToken})).me.rank,1);
    assert.equal((await request(base+'/start',{token:host.hostToken,body:{}})).status,409);
    assert.equal((await ok('/api/health')).database,'connected');

    const rehearsal=await ok('/api/events',{body:{hostKey,expected:1}}),r='/api/events/'+rehearsal.code;
    const p=await ok(r+'/join',{body:{name:'Cooldown',requestId:'cooldown-request-id'}});
    await ok(r+'/start',{body:{},token:rehearsal.hostToken});
    for(const clue of clues.filter(c=>c.room===0))await ok(r+'/clues',{body:{round:0,clueId:clue.id},token:p.playerToken});
    assert.equal((await request(r+'/finish',{token:p.playerToken,body:{round:0,answer:'wrong'}})).status,400);
    assert.equal((await request(r+'/finish',{token:p.playerToken,body:{round:0,answer:'Dress'}})).status,429);
    const closed=await ok(r+'/close',{token:rehearsal.hostToken,body:{}});
    assert.equal(closed.players.filter(p=>p.qualified).length,0);
  }finally{await db.close();}
});

test('cloud API fails safely without configuration and preserves QR/config routes',async()=>{
  const handler=cloudHandler({getStore(){throw Error('postgresql://secret-credentials');}});
  async function call(url){let result;await handler({url,method:'GET',headers:{host:'preview.vercel.app'}},{statusCode:200,setHeader(){},end(body){result={status:this.statusCode,body};}});return result;}
  const config=JSON.parse((await call('/api/index?route=config')).body);
  assert.equal(config.joinBase,'https://preview.vercel.app/');
  assert.match((await call('/api/index?route=qr&url=https%3A%2F%2Fpreview.vercel.app%2F%3Fevent%3D123ABC')).body,/<svg/);
  const failure=await call('/api/events/123ABC');assert.equal(failure.status,503);assert.ok(!failure.body.includes('secret-credentials'));
});
