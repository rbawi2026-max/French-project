import {createPool,PostgresTournamentStore} from '../server/postgres-store.mjs';
import {cloudHandler} from '../server/cloud-api.mjs';
import {attachDatabasePool} from '@vercel/functions';
let store;
function getStore(){
  if(!process.env.DATABASE_URL||!process.env.HOST_KEY)throw new Error('Missing server configuration');
  if(!store){
    const pool=createPool(process.env.DATABASE_URL);
    attachDatabasePool(pool);
    pool.on('error',()=>{}); // Idle connection failures are retried on the next request.
    store=new PostgresTournamentStore({pool,hostKey:process.env.HOST_KEY});
  }
  return store;
}
export default cloudHandler({getStore,publicUrl:process.env.PUBLIC_URL});
