export type Point = {x:number;z:number};
export type Obstacle = {x:number;z:number;rx:number;rz:number};
export const inspectionSpots:Record<string,Point>={
 inventory:{x:2.8,z:4.5},register:{x:2.8,z:4.5},date:{x:2.8,z:4.5},invitation:{x:2.8,z:4.5},
 ivory:{x:-2.4,z:-2.7},bar:{x:-2.4,z:-2.7},timeline:{x:0,z:-4.6},press:{x:0,z:-4.6},calendar:{x:0,z:-4.6},
 transfer:{x:0,z:2.45},label:{x:-2.7,z:.2},schedule:{x:-4.5,z:2.1},door:{x:5,z:-4.9},
};
export const blocked=(p:Point,obstacles:Obstacle[])=>obstacles.some(o=>Math.abs(p.x-o.x)<o.rx+.06&&Math.abs(p.z-o.z)<o.rz+.06);
export function clearSegment(a:Point,b:Point,obstacles:Obstacle[]){const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.08));for(let i=1;i<=steps;i++)if(blocked({x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps},obstacles))return false;return true;}
/** A small room-local grid. Every edge, including diagonals, is checked against furniture. */
export function findRoute(start:Point,end:Point,obstacles:Obstacle[]):Point[]{
 if(blocked(end,obstacles))return [];
 if(clearSegment(start,end,obstacles))return [{...end}];
 const step=.35,minX=-6.65,minZ=-6.05,nx=39,nz=37;
 const point=(i:number)=>({x:minX+(i%nx)*step,z:minZ+Math.floor(i/nx)*step});
 const nodes=Array.from({length:nx*nz},(_,i)=>i).filter(i=>!blocked(point(i),obstacles));
 const nearest=(p:Point)=>nodes.slice().sort((a,b)=>Math.hypot(point(a).x-p.x,point(a).z-p.z)-Math.hypot(point(b).x-p.x,point(b).z-p.z)).find(i=>clearSegment(p,point(i),obstacles));
 const first=nearest(start),last=nearest(end);if(first===undefined||last===undefined)return [];
 const allowed=new Set(nodes),open=new Set([first]),came=new Map<number,number>(),g=new Map([[first,0]]);
 const estimate=(i:number)=>Math.hypot(point(i).x-point(last).x,point(i).z-point(last).z);
 while(open.size){const current=[...open].reduce((a,b)=>(g.get(a)!+estimate(a))<(g.get(b)!+estimate(b))?a:b);
  if(current===last){const ids=[current];while(came.has(ids[0]))ids.unshift(came.get(ids[0])!);const raw=[start,...ids.map(point),end],route:Point[]=[];let at=0;while(at<raw.length-1){let next=raw.length-1;while(next>at+1&&!clearSegment(raw[at],raw[next],obstacles))next--;route.push(raw[next]);at=next;}return route;}
  open.delete(current);const x=current%nx,z=Math.floor(current/nx);
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||xx>=nx||zz<0||zz>=nz)continue;const next=zz*nx+xx;if(!allowed.has(next)||!clearSegment(point(current),point(next),obstacles))continue;const score=g.get(current)!+Math.hypot(dx,dz)*step;if(score<(g.get(next)??Infinity)){came.set(next,current);g.set(next,score);open.add(next);}}
 }
 return [];
}

export function roomObstacles(room:number):Obstacle[]{
 const list=[{x:-4.5,z:-.65,rx:1.6,rz:1.05},{x:-3.9,z:-4.8,rx:1.13,rz:1.13},{x:4.15,z:-1.2,rx:1.15,rz:1.15},{x:4.6,z:3,rx:1.1,rz:.95}];
 if(room===0||room===2)list.push({x:-4.7,z:3,rx:1.65,rz:.9});
 if(room===1)list.push({x:0,z:.1,rx:2.2,rz:1.3});
 if(room===3)for(const side of [-1,1])for(let i=0;i<4;i++)list.push({x:side*2.7,z:3.4-i*1.65,rx:.62,rz:.62});
 return list;
}
