export function connectAnswerBox(container:HTMLElement,onChange:(choice:string)=>void){
 const box=container.querySelector<HTMLButtonElement>('.mystery-box')!;let armed='',selected='',drag:{id:number;label:string;x:number;y:number;moved:boolean;ghost:HTMLElement|null}|null=null;
 const select=(label:string)=>{selected=label;armed='';box.textContent=label;box.classList.add('filled');box.setAttribute('aria-label',`Selected answer: ${label}`);onChange(label);};
 container.querySelectorAll<HTMLButtonElement>('.answer-card').forEach(card=>{
  const arm=()=>{armed=card.dataset.answer!;box.textContent='Tap here to place your selected card';container.querySelectorAll('.answer-card').forEach(c=>c.classList.toggle('selected',c===card));};
  card.addEventListener('pointerdown',e=>{if(e.button>0)return;drag={id:e.pointerId,label:card.dataset.answer!,x:e.clientX,y:e.clientY,moved:false,ghost:null};card.setPointerCapture(e.pointerId);});
  card.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>9){drag.moved=true;if(!drag.ghost){drag.ghost=document.createElement('div');drag.ghost.className='answer-ghost';drag.ghost.textContent=drag.label;container.append(drag.ghost);}drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';const r=box.getBoundingClientRect();box.classList.toggle('over',e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom);}});
  card.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;d.ghost?.remove();box.classList.remove('over');if(d.moved){const r=box.getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom)select(d.label);}else arm();});
  card.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null;box.classList.remove('over');});
  card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();arm();box.focus();}});
 });
 box.onclick=()=>{if(armed)select(armed);};return ()=>selected;
}
