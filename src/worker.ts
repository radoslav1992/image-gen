import {handle} from '@astrojs/cloudflare/handler';
import type {Bindings} from './lib/server';
export default {
 fetch:handle,
 async scheduled(_event:ScheduledController,e:Bindings){const time=Math.floor(Date.now()/1000);
 // Interrupted requests are refunded once; tombstones keep idempotency history.
 const pending=await e.DB.prepare("SELECT id,key FROM images WHERE status='pending' AND created_at<? LIMIT 100").bind(time-1800).all<{id:string;key:string}>();
 for(const row of pending.results){const refunded=await e.DB.prepare("UPDATE images SET status='failed' WHERE id=? AND status='pending'").bind(row.id).run();if(refunded.meta.changes)await e.IMAGES.delete(row.key);}
 await e.DB.batch([e.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(time),e.DB.prepare('DELETE FROM reset_tokens WHERE expires_at<?').bind(time),e.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(time),e.DB.prepare("UPDATE users SET credits=0,plan='free',storage_limit=100000000 WHERE period_end IS NOT NULL AND period_end<? AND plan!='free'").bind(time)]);
 }
} satisfies ExportedHandler<Bindings>;
