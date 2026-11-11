import './local-env.mjs';
import {readFile} from 'node:fs/promises';
import {createPool} from './postgres-store.mjs';
const url=process.env.DATABASE_URL_UNPOOLED;
if(!url)throw Error('DATABASE_URL_UNPOOLED is required for schema setup. Run neon deploy first.');
const pool=createPool(url);
try{
  const sql=await readFile(new URL('./schema.sql',import.meta.url),'utf8');
  await pool.query(sql);
  const check=await pool.query("SELECT count(*)::int AS columns FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='couture_events'");
  if(check.rows[0].columns!==3)throw Error('Existing tournament table has an unexpected schema.');
  console.log('Schema ready: couture_events (3 columns). Existing events preserved.');
}finally{await pool.end();}
