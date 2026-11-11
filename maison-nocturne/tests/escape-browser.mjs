// End-to-end browser check. Start Vite before running.
// PLAYWRIGHT_MODULE may point to an existing Playwright installation.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
let failed=false;
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(process.env.COUTURE_URL || 'http://127.0.0.1:5173');await page.locator('#begin').waitFor();
console.log(await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name).filter(n=>n.includes('three'))));
await page.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('/deps/three.js'));const T=await import(url);const original=T.PerspectiveCamera.prototype.updateMatrixWorld;T.PerspectiveCamera.prototype.updateMatrixWorld=function(force){if(this.fov===58)window.view={x:this.position.x,z:this.position.z,yaw:this.rotation.y,pitch:this.rotation.x};return original.call(this,force);};});
await page.locator('#begin').click();await page.locator('#explore').click();await page.waitForTimeout(300);
console.log('view',await page.evaluate(()=>window.view));
await page.evaluate(()=>document.exitPointerLock());await page.waitForTimeout(100);if(await page.locator('#panel').isVisible())await page.locator('.close').click();
const key=async(code,type)=>page.evaluate(([code,type])=>window.dispatchEvent(new KeyboardEvent(type,{code})),[code,type]);
async function lookAt(x,y,z){await page.evaluate(([x,y,z])=>{const v=window.view,dx=x-v.x,dz=z-v.z;const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(y-1.7,Math.hypot(dx,dz));document.querySelector('canvas').dispatchEvent(new PointerEvent('pointerdown'));window.dispatchEvent(new MouseEvent('mousemove',{movementX:(v.yaw-yaw)/.002,movementY:(v.pitch-pitch)/.002}));window.dispatchEvent(new PointerEvent('pointerup'));},[x,y,z]);await page.waitForTimeout(80);}
async function go(x,z){await lookAt(x,1.7,z);await key('KeyW','keydown');const t=Date.now();while(Date.now()-t<12000){const v=await page.evaluate(()=>window.view);if(Math.hypot(v.x-x,v.z-z)<.15 || await page.locator('#panel').isVisible() || await page.locator('#cinema').isVisible())break;await page.waitForTimeout(35);}await key('KeyW','keyup');console.log('moved',await page.evaluate(()=>window.view));}
async function clue(id,x,y,z,px,pz){await go(px,pz);await lookAt(x,y,z);console.log('target',id,await page.locator('#interaction').textContent());await key('KeyE','keydown');await key('KeyE','keyup');await page.locator('#discover').click({timeout:2500});await page.screenshot({path:`/tmp/couture-${id}.png`});await page.locator('.close').click();}
try{
 await clue('inventory',4.42,1,3.1,2.8,4.5);
 await go(0,3.4);await go(0,-2.7);await clue('ivory',-3.9,1.8,-4.1,-2,-2.9);
 await clue('timeline',0,2.8,-6.45,0,-4.5);
 console.log('journal',await page.evaluate(()=>localStorage.getItem('lost-couture-four-rooms-v1')));
 await go(3,-4.5);await go(5,-4.7);await lookAt(5,1.75,-6.55);await key('KeyE','keydown');await key('KeyE','keyup');
 await page.locator('#answer').fill('Court');await page.locator('input[name=reason][value="1"]').check();await page.locator('button[type=submit]').click();if(!(await page.locator('#feedback').textContent()).includes('stays closed'))throw new Error('Wrong answer accepted');await page.waitForTimeout(1900);await page.locator('#answer').fill('Empire');await page.locator('input[name=reason][value="1"]').check();await page.locator('button[type=submit]').click();console.log('solved',await page.locator('#panel-title').textContent());await page.locator('#return-room').click();await page.waitForTimeout(900);await go(5,-8.1);await page.locator('#explore').waitFor({timeout:4000});console.log('NEXT ROOM',await page.locator('#panel-title').textContent());
 await page.locator('.close').click();await page.screenshot({path:'/tmp/couture-atelier.png'});
 await clue('register',4.42,1,3.1,2.8,4.5);
 await clue('transfer',0,1.05,1.1,0,2.4);
 await go(-2.8,2.4);await clue('label',-4.5,1.65,.05,-2.8,.5);
 await go(-2.8,-3);await go(0,-4.5);
 async function unlock(answer,reason){await go(3,-4.5);await go(5,-4.7);await lookAt(5,1.75,-6.55);await key('KeyE','keydown');await key('KeyE','keyup');await page.locator('#answer').fill(answer);await page.locator(`input[name=reason][value="${reason}"]`).check();await page.locator('button[type=submit]').click();await page.locator('#return-room').click();await page.waitForTimeout(900);await go(5,-8.1);}
 await unlock('House of Worth',2);await page.locator('#explore').waitFor();console.log('NEXT ROOM',await page.locator('#panel-title').textContent());await page.locator('.close').click();await page.screenshot({path:'/tmp/couture-dior.png'});
 await clue('date',4.42,1,3.1,2.8,4.5);await go(0,3.4);await go(0,-2.7);await clue('bar',-3.9,1.65,-4.1,-2,-2.9);await clue('press',0,2.8,-6.45,0,-4.5);
 await unlock('New Look 1947',1);await page.locator('#explore').waitFor();console.log('NEXT ROOM',await page.locator('#panel-title').textContent());await page.locator('.close').click();await page.screenshot({path:'/tmp/couture-runway.png'});
 await clue('invitation',4.42,1,3.1,2.8,4.5);await go(0,5);await go(-4.5,5);await clue('schedule',-4.5,1.1,.65,-4.5,1.9);await go(-4.5,5);await go(0,5);await clue('calendar',0,2.8,-6.45,0,-4.5);
 await page.keyboard.press('j');await page.locator('[data-clue="inventory"]').click();console.log('prior clue journal',await page.locator('#panel-title').textContent());await page.locator('.close').click();
 await unlock('1873',0);await page.waitForTimeout(1600);await page.screenshot({path:'/tmp/couture-ending.png'});await page.locator('#panel-title').filter({hasText:'The collection returns.'}).waitFor({timeout:10000});console.log('COMPLETE',await page.evaluate(()=>JSON.parse(localStorage.getItem('lost-couture-four-rooms-v1'))));
 await page.reload();await page.locator('#begin').click();await page.locator('#panel-title').filter({hasText:'The collection returns.'}).waitFor();console.log('RELOAD COMPLETION OK');

}catch(e){failed=true;console.error('TEST FAILED',e.message);await page.screenshot({path:'/tmp/couture-failure.png'});}
console.log('errors',errors);await browser.close();if(failed||errors.length)process.exitCode=1;
