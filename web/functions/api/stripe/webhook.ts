// Test-mode Stripe webhook. Browser redirects never update payment state.
interface Statement {first<T>():Promise<T|null>;run():Promise<{meta?:{changes?:number}}>}
interface DB {prepare(sql:string):{bind(...values:unknown[]):Statement};batch(statements:Statement[]):Promise<Array<{meta?:{changes?:number}}>>}
interface Env {INQUIRIES_DB?:DB;STRIPE_WEBHOOK_SECRET?:string;STRIPE_CHECKOUT_TEST_ENABLED?:string}
interface Session {id?:string;livemode?:boolean;payment_status?:string;amount_total?:number;currency?:string;client_reference_id?:string;metadata?:{order_id?:string};payment_intent?:string}
interface Event {id?:string;type?:string;livemode?:boolean;data?:{object?:Session}}
interface Order {id:string;status:string;amount_cents:number;currency:string;provider_checkout_session_id:string;provider_payment_intent_id:string|null}
const response=(status:number)=>new Response(null,{status,headers:{'Cache-Control':'no-store'}});
async function verify(body:string,header:string,secret:string):Promise<boolean>{
 const entries=header.split(',').map(x=>x.trim().split('='));
 const stamp=entries.find(x=>x[0]==='t')?.[1];
 const sigs=entries.filter(x=>x[0]==='v1').map(x=>x[1]);
 if(!stamp||!/^\d{10,}$/.test(stamp)||!Number.isSafeInteger(Number(stamp))||Math.abs(Date.now()/1000-Number(stamp))>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+body)));
 return sigs.some(sig=>{
  if(!/^[0-9a-f]{64}$/i.test(sig))return false;
  const bytes=Uint8Array.from(sig.match(/../g)!,x=>parseInt(x,16));
  let mismatch=0;for(let i=0;i<digest.length;i++)mismatch|=digest[i]^bytes[i];
  return mismatch===0;
 });
}
export const onRequestPost:PagesFunction<Env>=async({request,env})=>{
 if(env.STRIPE_CHECKOUT_TEST_ENABLED!=='true'||!env.INQUIRIES_DB||!env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))return response(503);
 const body=await request.text();
 if(body.length>65536)return response(413);
 if(!await verify(body,request.headers.get('Stripe-Signature')||'',env.STRIPE_WEBHOOK_SECRET))return response(400);
 let event:Event;
 try{event=JSON.parse(body) as Event;}catch{return response(400);}
 if(!event||typeof event!=='object'||Array.isArray(event)||typeof event.id!=='string'||!event.id.startsWith('evt_')||event.livemode!==false||typeof event.type!=='string'||!event.type)return response(400);
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return response(200);
 const session=event.data?.object;
 if(typeof session?.id!=='string'||!session.id.startsWith('cs_test_')||session.livemode!==false||session.payment_status!=='paid'||!Number.isSafeInteger(session.amount_total)||session.amount_total<1||session.currency!=='usd'||typeof session.payment_intent!=='string'||!session.payment_intent.startsWith('pi_')||!session.client_reference_id||session.metadata?.order_id!==session.client_reference_id)return response(400);
 try{
  const db=env.INQUIRIES_DB;
  const order=await db.prepare('SELECT id,status,amount_cents,currency,provider_checkout_session_id,provider_payment_intent_id FROM service_orders WHERE id=?').bind(session.client_reference_id).first<Order>();
  if(!order||order.provider_checkout_session_id!==session.id||order.amount_cents!==session.amount_total||order.currency!==session.currency)return response(400);
  if(order.status!=='awaiting_payment'&&order.status!=='paid')return response(409);
  if(order.provider_payment_intent_id&&order.provider_payment_intent_id!==session.payment_intent)return response(400);
  const results=await db.batch([
   db.prepare("INSERT OR IGNORE INTO payment_webhook_events(provider,provider_event_id,event_type,order_id) VALUES('stripe',?,?,?)").bind(event.id,event.type,order.id),
   db.prepare("UPDATE service_orders SET status='paid',payment_provider='stripe',provider_payment_intent_id=?,paid_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='awaiting_payment' AND EXISTS(SELECT 1 FROM payment_webhook_events WHERE provider='stripe' AND provider_event_id=? AND processed_at IS NULL)").bind(session.payment_intent,order.id,event.id),
   db.prepare("INSERT INTO commerce_events(id,entity_type,entity_id,event_type,old_status,new_status,actor,details_json) SELECT ?,'order',?,'payment_confirmed','awaiting_payment','paid','stripe',? WHERE changes()=1").bind(crypto.randomUUID(),order.id,JSON.stringify({stripeEventId:event.id,checkoutSessionId:session.id})),
   db.prepare("UPDATE payment_webhook_events SET processed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE provider='stripe' AND provider_event_id=? AND processed_at IS NULL").bind(event.id)
  ]);
  return results[1]?.meta?.changes===1||order.status==='paid'?response(200):response(409);
 }catch{return response(503);}
};
