import { clues, puzzles, type RoomId } from './content.ts';
export type State = { version: 2; room: RoomId; discovered: string[]; solved: string[]; hints: number[]; complete: boolean };
export const fresh = (): State => ({ version: 2, room: 0, discovered: [], solved: [], hints: [0,0,0,0], complete: false });
export function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.,!?:;–—-]/g,' ').replace(/\s+/g,' ').trim(); }
export function validateConfiguration() {
  const ids = new Set(clues.map(c=>c.id));
  if(ids.size !== clues.length || puzzles.length !== 4) throw new Error('Duplicate clues or missing rooms');
  puzzles.forEach((p,i)=>{ if(p.room !== i || !p.answers.length || !p.required.every(id=>ids.has(id)) || p.required.some(id=>clues.find(c=>c.id===id)!.room>i) || !p.options.length) throw new Error(`Invalid puzzle ${p.id}`); });
}
export function discover(s: State, id: string): State {
  const clue = clues.find(c=>c.id===id);
  return !clue || clue.room!==s.room ? s : { ...s, discovered: [...new Set([...s.discovered,id])] };
}
export function submit(s: State, answer: string, _evidence?: number): {state: State; status: 'missing'|'wrong'|'correct'} {
  const p = puzzles[s.room];
  if(!p.required.every(id=>s.discovered.includes(id))) return {state:s,status:'missing'};
  const accepted = p.answers.some(a=>normalize(a)===normalize(answer));
  if(!accepted) return {state:s,status:'wrong'};
  return {state:{...s,solved:[...new Set([...s.solved,p.id])]},status:'correct'};
}
export function advance(s: State): State {
  if(!s.solved.includes(puzzles[s.room].id)) return s;
  return s.room===3 ? {...s,complete:true} : {...s,room:(s.room+1) as RoomId};
}
export function restore(raw: string|null): State {
  try {
    const d = JSON.parse(raw||'null'); if(!d || d.version!==2) return fresh();
    const s=fresh();
    const found=Array.isArray(d.discovered)? d.discovered.filter((id:unknown)=>typeof id==='string'&&clues.some(c=>c.id===id)):[];
    for(const p of puzzles) {
      if(!Array.isArray(d.solved)||!d.solved.includes(p.id)||!p.required.every(id=>found.includes(id))) break;
      s.solved.push(p.id);
    }
    s.room=Math.min(Number.isInteger(d.room)?Math.max(0,d.room):0,s.solved.length,3) as RoomId;
    s.discovered=[...new Set<string>(found.filter((id:string)=>clues.find(c=>c.id===id)!.room<=s.room))];
    s.hints=s.hints.map((_,i)=>Number.isInteger(d.hints?.[i])?Math.max(0,Math.min(3,d.hints[i])):0);
    s.complete=d.complete===true&&s.solved.length===4&&s.room===3;
    return s;
  } catch { return fresh(); }
}
