import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {clues,puzzles} from '../src/escape/content.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const base='http://127.0.0.1:5174',out='../release';mkdirSync(out,{recursive:true});
const hostKey=readFileSync('data/host-key.txt','utf8').trim();
async function api(path,body,token){const r=await fetch(base+'/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json();assert.ok(r.ok,d.error);return d;}
const test=await api('/events',{hostKey,expected:50});
let participants=await Promise.all(Array.from({length:50},(_,i)=>api('/events/'+test.code+'/join',{name:'QA '+String(i+1).padStart(2,'0'),requestId:crypto.randomUUID()})));
const champion=participants[0];
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await context.addInitScript(({code,playerId,playerToken})=>localStorage.setItem('lost-couture-tournament-v2',JSON.stringify({code,playerId,playerToken})),{code:test.code,playerId:champion.playerId,playerToken:champion.playerToken});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.locator('#join').tap();await page.locator('#panel-title').filter({hasText:'Your place is reserved.'}).waitFor();
for(let round=0;round<4;round++){
 await api('/events/'+test.code+'/start',{},test.hostToken);
 for(const p of participants){for(const c of clues.filter(c=>c.room===round))await api('/events/'+test.code+'/clues',{round,clueId:c.id},p.playerToken);}
 let result;for(const p of participants)result=await api('/events/'+test.code+'/finish',{round,answer:puzzles[round].answers[0]},p.playerToken);
 const qualified=result.history[round].rows.filter(p=>p.qualified);assert.equal(qualified.length,[30,15,5,1][round]);
 await page.waitForTimeout(3000);await page.locator('#panel-title').filter({hasText:round===3?'You are the winner!':'You qualified!'}).waitFor();
 await page.screenshot({path:out+'/tournament-room-'+(round+1)+'.png'});participants=participants.filter(p=>qualified.some(q=>q.id===p.playerId));console.log('LIVE API + PHONE RESULTS',50,'→',[30,15,5,1][round]);
}
await page.reload();await page.locator('#join').tap();await page.locator('#panel-title').filter({hasText:'You are the winner!'}).waitFor();await page.locator('#winner-reveal').tap();await page.locator('#skip').tap();await page.locator('#ending-action').tap();await page.locator('#panel-title').filter({hasText:'You are the winner!'}).waitFor();
const readyFile='data/ready-event.json';const ready=existsSync(readyFile)?JSON.parse(readFileSync(readyFile,'utf8')):await api('/events',{hostKey,expected:50});if(!existsSync(readyFile))writeFileSync(readyFile,JSON.stringify({code:ready.code,hostToken:ready.hostToken}),{mode:0o600});
const config=await api('/config');const join=new URL(config.joinBase);join.searchParams.set('event',ready.code);const svg=await fetch(base+'/api/qr?url='+encodeURIComponent(join.href)).then(r=>r.text());writeFileSync(out+'/Join-the-Museum.svg',svg);
const qrPage=await browser.newPage({viewport:{width:420,height:420},deviceScaleFactor:2});await qrPage.setContent('<html style="background:white"><body style="margin:20px">'+svg+'</body></html>');await qrPage.locator('svg').screenshot({path:out+'/Join-the-Museum.png'});await qrPage.close();
const hostPage=await browser.newPage({viewport:{width:1280,height:900}});hostPage.on('pageerror',e=>errors.push(e.message));await hostPage.goto(base+'/host.html#host='+ready.code+'.'+ready.hostToken);await hostPage.locator('#code').filter({hasText:ready.code}).waitFor();await hostPage.locator('#qr').evaluate(img=>img.decode());assert.equal(await hostPage.locator('#start').isDisabled(),true);await hostPage.screenshot({path:out+'/host-preview.png',fullPage:true});
writeFileSync(out+'/PRIVATE-HOST-ACCESS.md',`# Organiser access — keep private\n\n[Open your prepared host screen](${base}/host.html#host=${ready.code}.${ready.hostToken})\n\nThis resumes the empty 50-player event ${ready.code}. Never share this private host link.\n\nParticipant link: ${join.href}\n\nPrivate key for creating a NEW event: ${hostKey}\n\nKeep this computer awake and the museum server running. All phones must use the same Wi-Fi. If the address changes, update the shared address on the host page and download a fresh QR.\n`,{mode:0o600});
writeFileSync(out+'/preview.json',JSON.stringify({preview:base+'/',join:join.href,code:ready.code,host:base+'/host.html'},null,2));
console.log(JSON.stringify({preview:base+'/',join:join.href,code:ready.code,host:base+'/host.html',errors}));await browser.close();assert.equal(errors.length,0);
