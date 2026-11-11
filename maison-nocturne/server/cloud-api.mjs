import {ApiError} from './tournament.mjs';
import qrcode from './qrcode.cjs';

export function cloudHandler({getStore, publicUrl}) {
  return async function handler(req,res) {
    const send=(status,data,type='application/json; charset=utf-8')=>{
      res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
      res.statusCode=status;res.setHeader('Content-Type',type);
      res.end(type.startsWith('application/json')?JSON.stringify(data):data);
    };
    try {
      const host=req.headers.host;
      const base=publicUrl||`https://${host}`;
      const url=new URL(req.url,base);
      // Vercel rewrite passes the original API path explicitly.
      const path=url.searchParams.has('route')?'/api/'+url.searchParams.get('route'):url.pathname;
      const origin=req.headers.origin;
      if(req.method==='POST' && origin && origin!==new URL(base).origin && origin!==`${new URL(base).protocol}//${host}`) throw new ApiError(403,'Use the game’s own page to submit.');
      if(req.method==='GET' && path==='/api/config') return send(200,{joinBase:base.replace(/\/$/,'')+'/',addresses:[],local:base,rounds:[50,30,15,5,1]});
      if(req.method==='GET' && path==='/api/health') {
        const store=getStore(); await store.pool.query('SELECT 1 FROM couture_events LIMIT 1');
        return send(200,{app:'lost-couture-collection',database:'connected'});
      }
      if(req.method==='GET' && path==='/api/qr') {
        const target=url.searchParams.get('url')||base;
        let parsed;try{parsed=new URL(target);}catch{throw new ApiError(400,'Invalid QR address.');}
        if(!['http:','https:'].includes(parsed.protocol)||target.length>600)throw new ApiError(400,'Invalid QR address.');
        const qr=qrcode(0,'M');qr.addData(target);qr.make();
        return send(200,qr.createSvgTag({cellSize:6,margin:24,scalable:true}),'image/svg+xml');
      }
      if(!['GET','POST'].includes(req.method)) throw new ApiError(405,'Method not allowed.');
      let body={};
      if(req.method==='POST') {
        if(Number(req.headers['content-length']||0)>8192)throw new ApiError(413,'Request too large.');
        try {body=typeof req.body==='string'?JSON.parse(req.body):req.body??{};}catch{throw new ApiError(400,'Invalid request.');}
        if(!body||Array.isArray(body)||typeof body!=='object')throw new ApiError(400,'Invalid request.');
        if(Buffer.byteLength(JSON.stringify(body))>8192)throw new ApiError(413,'Request too large.');
      }
      const store=getStore();
      if(path==='/api/events'&&req.method==='POST') return send(201,await store.run('create',null,null,body));
      const match=path.match(/^\/api\/events\/([A-Za-z0-9]{6})(?:\/(join|start|close|clues|finish))?$/);
      if(!match)throw new ApiError(404,'API endpoint not found.');
      const [,code,operation]=match;
      const action=req.method==='GET'&&!operation?'get':req.method==='POST'?({clues:'discover',join:'join',start:'start',close:'close',finish:'finish'})[operation]:null;
      if(!action)throw new ApiError(405,'Method not allowed.');
      const bearer=req.headers.authorization?.replace(/^Bearer /,'');
      return send(200,await store.run(action,code.toUpperCase(),bearer,body));
    } catch(error) {
      if(error instanceof ApiError) return send(error.status,{error:error.message});
      // Never return database URLs, SQL or driver errors to players or logs.
      return send(503,{error:'Tournament service unavailable. Please retry shortly. The organiser should check database setup.'});
    }
  };
}
