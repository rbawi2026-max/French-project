import {readFile,writeFile} from 'node:fs/promises';
import qrCode from '../maison-nocturne/server/qrcode.cjs';
const api='http://127.0.0.1:5174';
async function request(path,body){const response=await fetch(api+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const data=await response.json();if(!response.ok)throw new Error(data.error||'Request failed');return data;}
const config=await request('/api/config');
const hostKey=(await readFile(new URL('../maison-nocturne/data/host-key.txt',import.meta.url),'utf8')).trim();
const event=await request('/api/events',{hostKey,expected:1});
const join=new URL(config.joinBase);join.searchParams.set('event',event.code);
const host=`${api}/host.html#host=${event.code}.${event.hostToken}`;
const qr=qrCode(0,'M');qr.addData(join.href);qr.make();
await writeFile(new URL('Phone-test-QR.svg',import.meta.url),qr.createSvgTag({cellSize:10,margin:40,scalable:true}));
await writeFile(new URL('Phone-test-QR.gif',import.meta.url),Buffer.from(qr.createDataURL(10,40).split(',')[1],'base64'));
await writeFile(new URL('PRIVATE-PHONE-TEST-HOST.md',import.meta.url),`# Private controls for your phone rehearsal\n\n[Open rehearsal host controls](${host})\n\nKeep this file private. The player link is ${join.href}\n\nThis event expects one participant. Join from your phone, then start each room from these host controls. Results appear after you solve each room. The main 50-player event is separate.\n`,{mode:0o600});
await writeFile(new URL('private-phone-test.json',import.meta.url),JSON.stringify({code:event.code,join:join.href,host}),{mode:0o600});
console.log(JSON.stringify({code:event.code,join:join.href,expected:event.event.expected,status:event.event.status}));
