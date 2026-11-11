import test from 'node:test';
import assert from 'node:assert/strict';
import {clues} from './content.ts';
import {findRoute,clearSegment,inspectionSpots,roomObstacles,type Point} from './navigation.ts';
test('Every clue and exit can be reached from the entrance and from every other inspection point',()=>{
 for(let room=0;room<4;room++){
  const ids=[...clues.filter(c=>c.room===room).map(c=>c.id),'door'];const obstacles=roomObstacles(room);
  for(const start of [{x:0,z:6.15},...ids.map(id=>inspectionSpots[id])])for(const id of ids){
   const end=inspectionSpots[id],route=findRoute(start,end,obstacles);assert.ok(route.length,`Room ${room+1}: route to ${id}`);
   let last:Point=start;for(const step of route){assert.ok(clearSegment(last,step,obstacles),`Route to ${id} crosses furniture`);last=step;}
   assert.deepEqual(last,end);const clue=clues.find(c=>c.id===id);if(clue)assert.ok(Math.hypot(end.x-clue.position[0],1.7-clue.position[1],end.z-clue.position[2])<3.8,`${id} must end within reach`);
  }
 }
});
test('Guided walking goes around furniture and rejects a blocked destination',()=>{
 const furniture=[{x:0,z:0,rx:1,rz:1}];const route=findRoute({x:-3,z:0},{x:3,z:0},furniture);
 assert.ok(route.length>1);assert.deepEqual(findRoute({x:-3,z:0},{x:0,z:0},furniture),[]);
});
