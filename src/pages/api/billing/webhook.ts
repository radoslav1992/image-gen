import {endpoint,bindings,fail,json,now} from '../../../lib/server';
import {stripe,verifyStripe,planFor} from '../../../lib/stripe';
import {PLANS} from '../../../lib/catalog';
export const POST=endpoint(async ctx=>{const e=bindings();if(!e.STRIPE_WEBHOOK_SECRET)fail(503,'Webhook is not configured');const raw=await ctx.request.text();if(raw.length>1_000_000)fail(413,'Too large');if(!await verifyStripe(raw,ctx.request.headers.get('stripe-signature')||'',e.STRIPE_WEBHOOK_SECRET))fail(400,'Invalid signature');const event=JSON.parse(raw);if(await e.DB.prepare('SELECT id FROM stripe_events WHERE id=?').bind(event.id).first())return json({received:true});
 if(event.type==='invoice.paid'){
  const invoice=await stripe(`invoices/${encodeURIComponent(event.data.object.id)}`);const subscriptionId=invoice.parent?.subscription_details?.subscription||invoice.subscription;
  if(subscriptionId&&['subscription_create','subscription_cycle'].includes(invoice.billing_reason)&&invoice.status==='paid'){
   const sub=await stripe(`subscriptions/${encodeURIComponent(subscriptionId)}`);const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
   const u=await e.DB.prepare('SELECT id,period_end FROM users WHERE stripe_customer=?').bind(customer).first<{id:string;period_end:number|null}>();if(!u)fail(503,'Customer mapping pending');
   const line=invoice.lines?.data?.find((l:any)=>!l.parent?.subscription_item_details?.proration&&(l.parent?.type==='subscription_item_details'||l.type==='subscription'));
   const price=line?.pricing?.price_details?.price||line?.price?.id;const plan=planFor(price);if(!plan)fail(400,'Unknown subscription price');const end=line.period.end;
   // Never replay an older billing period or grant prorations / manual invoices.
   await e.DB.batch([
    e.DB.prepare('INSERT OR IGNORE INTO paid_invoices(id,user_id,plan,credits,created_at,period_end) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND COALESCE(period_end,0)<=?)').bind(invoice.id,u.id,plan,PLANS[plan].credits,now(),end,u.id,end),
    e.DB.prepare('UPDATE users SET plan=?,storage_limit=?,stripe_subscription=?,subscription_status=?,period_end=? WHERE id=? AND COALESCE(period_end,0)<=?').bind(plan,PLANS[plan].storage,sub.id,sub.status,end,u.id,end)
   ]);
  }
 }else if(['customer.subscription.updated','customer.subscription.deleted'].includes(event.type)){
  const sub=await stripe(`subscriptions/${encodeURIComponent(event.data.object.id)}`);const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
  await e.DB.prepare('UPDATE users SET subscription_status=? WHERE stripe_customer=? AND stripe_subscription=?').bind(sub.status,customer,sub.id).run();
 }
 await e.DB.prepare('INSERT OR IGNORE INTO stripe_events VALUES (?,?)').bind(event.id,now()).run();return json({received:true});});
