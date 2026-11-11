import pg from 'pg';
import {TournamentStore, ApiError} from './tournament.mjs';

export function createPool(connectionString, options={}) {
  const url=new URL(connectionString);
  if(['require','prefer','verify-ca'].includes(url.searchParams.get('sslmode'))){
    url.searchParams.set('sslmode','verify-full');
  }
  connectionString=url.href;
  return new pg.Pool({connectionString, max:10, idleTimeoutMillis:10000,
    connectionTimeoutMillis:45000, allowExitOnIdle:true,...options});
}

// A database row lock serializes all writes for one event, even across
// different Vercel instances. Never keep tournament state in a warm function.
export class PostgresTournamentStore {
  constructor({pool, hostKey}) { this.pool=pool; this.hostKey=hostKey; }
  async run(action, code, bearer, body) {
    const client=await this.pool.connect();
    let transaction=false;
    try {
      if(action!=='get'){
        await client.query("BEGIN; SET LOCAL statement_timeout = '45000'"); transaction=true;
      }
      let stored;
      let databaseNow;
      if(action==='create') {
        // Only event creation shares a global lock; ordinary play locks its event.
        await client.query('SELECT pg_advisory_xact_lock(19471947)');
      } else {
        const result=await client.query(`WITH locked AS MATERIALIZED (
          SELECT state FROM couture_events WHERE code=$1 ${action==='get'?'':'FOR UPDATE'}
        ) SELECT state, floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS now FROM locked`,[String(code).toUpperCase()]);
        stored=result.rows[0]?.state;
        databaseNow=result.rows[0]?.now;
        if(!stored) throw new ApiError(404,'That room code was not found.');
      }
      // Read time after obtaining the lock; all instances use the same clock.
      if(databaseNow===undefined){const time=await client.query('SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS now');databaseNow=time.rows[0].now;}
      const now=Number(databaseNow);
      const store=new TournamentStore({hostKey:this.hostKey,clock:()=>now});
      if(stored) store.events[stored.code]=stored;
      let result, rejection;
      try {
        if(action==='create') {
          // Count cap and collision prevention are serialized with creation.
          const codes=await client.query('SELECT code FROM couture_events');
          for(const row of codes.rows) store.events[row.code]={};
          result=store.create(body);
          await client.query('INSERT INTO couture_events(code,state) VALUES($1,$2::jsonb)',[result.code,JSON.stringify(store.events[result.code])]);
        } else if(action==='get') result=store.get(code,bearer);
        else if(action==='join') result=store.join(code,body);
        else if(action==='start'||action==='close') result=store[action](code,bearer);
        else if(action==='discover'||action==='finish') result=store[action](code,bearer,body);
        else throw new ApiError(404,'Unknown action.');
      } catch(error) {
        if(!(error instanceof ApiError)) throw error;
        // Wrong-answer cooldowns must persist even when the HTTP answer is 400.
        rejection=error;
      }
      if(stored && action!=='get') await client.query('UPDATE couture_events SET state=$2::jsonb, updated_at=clock_timestamp() WHERE code=$1',[stored.code,JSON.stringify(store.events[stored.code])]);
      if(transaction){await client.query('COMMIT'); transaction=false;}
      if(rejection) throw rejection;
      return result;
    } catch(error) {
      if(transaction) await client.query('ROLLBACK').catch(()=>{});
      throw error;
    } finally { client.release(); }
  }
}
