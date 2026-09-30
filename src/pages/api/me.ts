import {endpoint,requireUser,json} from '../../lib/server';
export const GET=endpoint(async ctx=>{const u=await requireUser(ctx);return json({name:u.name,email:u.email,credits:u.credits,plan:u.plan,storageUsed:u.storage_used,storageLimit:u.storage_limit});});
