import test from 'node:test';
import assert from 'node:assert/strict';
import {TournamentStore, qualificationLimits} from './tournament.mjs';
import {clues,puzzles} from '../src/escape/content.ts';

function setup(count){
  const store=new TournamentStore({hostKey:'test-host'});
  const host=store.create({hostKey:'test-host'});
  const players=Array.from({length:count},(_,i)=>store.join(host.code,{name:`Student ${i+1}`,requestId:`student-request-${i}`}));
  return {store,host,players};
}
function finish(store,code,player,round){
  for(const clue of clues.filter(c=>c.room===round))store.discover(code,player.playerToken,{round,clueId:clue.id});
  return store.finish(code,player.playerToken,{round,answer:puzzles[round].answers[0]});
}

test('qualification examples use the original group, rounding halves upward',()=>{
  for(const [count,expected] of [[0,[0,0,0,0]],[1,[1,1,1,1]],[5,[3,2,1,1]],[28,[17,8,3,1]],[45,[27,14,5,1]],[50,[30,15,5,1]],[60,[36,18,6,1]]])assert.deepEqual(qualificationLimits(count),expected);
});

test('empty lobby cannot start; live projections update; 60 is a cap, not a requirement',()=>{
  const {store,host}=setup(0);
  assert.throws(()=>store.start(host.code,host.hostToken),/At least one/);
  for(let i=0;i<60;i++){
    const joined=store.join(host.code,{name:`Person ${i}`,requestId:`capacity-request-${i}`});
    assert.deepEqual(joined.event.qualificationLimits,qualificationLimits(i+1));
    assert.equal(joined.event.startingCount,null);
  }
  assert.throws(()=>store.join(host.code,{name:'Extra student',requestId:'overflow-request-61'}),/full/);
  const started=store.start(host.code,host.hostToken);
  assert.deepEqual(started.qualificationLimits,[36,18,6,1]);
  assert.equal(started.startingCount,60);
  assert.throws(()=>store.join(host.code,{name:'Late student',requestId:'late-request-id-61'}),/already started/);
  assert.equal(store.join(host.code,{name:'Retry',requestId:'capacity-request-0'}).event.joinedCount,60);
});

test('every group size from 1 to 60 can complete all four rounds with exactly one winner',()=>{
  for(let count=1;count<=60;count++){
    const {store,host,players}=setup(count);
    const limits=qualificationLimits(count);
    let active=players;
    for(let round=0;round<4;round++){
      const started=store.start(host.code,host.hostToken);
      assert.equal(started.startingCount,count);
      assert.deepEqual(started.qualificationLimits,limits);
      assert.equal(started.activeCount,active.length);
      for(const player of active)finish(store,host.code,player,round);
      const result=store.get(host.code,host.hostToken);
      assert.equal(result.status,round===3?'finished':'results');
      assert.equal(result.players.filter(p=>p.qualified).length,limits[round],`Group ${count}, room ${round+1}`);
      assert.equal(result.history[round].limit,limits[round]);
      active=active.slice(0,limits[round]);
    }
  }
});

test('early closure preserves frozen targets and never promotes unfinished players',()=>{
  const {store,host,players}=setup(45);
  store.start(host.code,host.hostToken);
  for(const player of players.slice(0,10))finish(store,host.code,player,0);
  const result=store.close(host.code,host.hostToken);
  assert.equal(result.players.filter(p=>p.qualified).length,10);
  assert.equal(result.qualifierLimit,27);
  // Simulate a fresh function loading persisted JSON.
  const restored=new TournamentStore({hostKey:'test-host'});
  restored.events=JSON.parse(JSON.stringify(store.events));
  const next=restored.start(host.code,host.hostToken);
  assert.equal(next.activeCount,10);
  assert.equal(next.qualifierLimit,14);
  assert.deepEqual(next.qualificationLimits,[27,14,5,1]);
  for(const player of players.slice(0,10))finish(restored,host.code,player,1);
  assert.equal(restored.get(host.code,host.hostToken).players.filter(p=>p.qualified).length,10);
  restored.start(host.code,host.hostToken);
  const empty=restored.close(host.code,host.hostToken);
  assert.equal(empty.status,'finished');
  assert.equal(empty.players.filter(p=>p.qualified).length,0);
  assert.throws(()=>restored.start(host.code,host.hostToken));
});

test('existing waiting events gain flexible starts; already-running legacy events retain their rules',()=>{
  const {store,host}=setup(28);
  const event=store.events[host.code];
  delete event.qualificationLimits;delete event.startingCount;event.expected=50;
  assert.deepEqual(store.start(host.code,host.hostToken).qualificationLimits,[17,8,3,1]);
  delete event.qualificationLimits;delete event.startingCount;
  assert.deepEqual(store.get(host.code,host.hostToken).qualificationLimits,[30,15,5,1]);
});
