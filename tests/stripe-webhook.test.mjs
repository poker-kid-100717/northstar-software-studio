// Regression tests for webhook authentication and fail-closed behavior.
// Run from web/: node --test ../tests/stripe-webhook.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
const require=createRequire(new URL('../web/package.json',import.meta.url));
const ts=require('typescript');
const source=readFileSync(new URL('../web/functions/api/stripe/webhook.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {onRequestPost}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const secret='whsec_test_signature_validation';
const db={prepare(){throw new Error('Invalid request must never access database');},batch(){throw new Error('Invalid request must never mutate database');}};
const env={STRIPE_CHECKOUT_TEST_ENABLED:'true',STRIPE_WEBHOOK_SECRET:secret,INQUIRIES_DB:db};
const payload=JSON.stringify({id:'evt_test',livemode:false,type:'checkout.session.completed',data:{object:{}}});
async function sign(body,stamp=Math.floor(Date.now()/1000)){
 const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+body)));
 return 't='+stamp+',v1='+Buffer.from(bytes).toString('hex');
}
async function post(body,signature,overrides={}){
 return onRequestPost({request:new Request('https://northstar.example/api/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':signature},body}),env:{...env,...overrides}});
}
test('checkout disabled fails closed',async()=>{
 assert.equal((await post(payload,await sign(payload),{STRIPE_CHECKOUT_TEST_ENABLED:'false'})).status,503);
});
test('missing signature rejected before any database access',async()=>{
 assert.equal((await post(payload,'')).status,400);
});
test('invalid signature rejected',async()=>{
 assert.equal((await post(payload,'t='+Math.floor(Date.now()/1000)+',v1='+'0'.repeat(64))).status,400);
});
test('expired signed payload rejected',async()=>{
 assert.equal((await post(payload,await sign(payload,Math.floor(Date.now()/1000)-3600))).status,400);
});
test('tampered body rejected even with valid signature for original',async()=>{
 assert.equal((await post(payload+' ',await sign(payload))).status,400);
});
test('valid signed event with invalid payment object rejected',async()=>{
 assert.equal((await post(payload,await sign(payload))).status,400);
});
test('oversized request rejected',async()=>{
 const body='x'.repeat(65537);
 assert.equal((await post(body,await sign(body))).status,413);
});

test('future-dated signature outside replay tolerance rejected',async()=>{
 assert.equal((await post(payload,await sign(payload,Math.floor(Date.now()/1000)+3600))).status,400);
});
test('malformed signature and timestamp rejected before database access',async()=>{
 for(const signature of ['t=not-a-time,v1='+'0'.repeat(64),'t=123,v1='+'0'.repeat(64),'t='+Math.floor(Date.now()/1000)+',v1=garbage']){
  assert.equal((await post(payload,signature)).status,400);
 }
});
test('wrong webhook secret fails closed before database access',async()=>{
 assert.equal((await post(payload,await sign(payload),{STRIPE_WEBHOOK_SECRET:'whsec_different_secret'})).status,400);
});
test('missing webhook secret fails closed',async()=>{
 assert.equal((await post(payload,await sign(payload),{STRIPE_WEBHOOK_SECRET:''})).status,503);
});
test('signed live-mode event rejected in test-only endpoint',async()=>{
 const live=JSON.stringify({...JSON.parse(payload),livemode:true});
 assert.equal((await post(live,await sign(live))).status,400);
});

test('signed malformed JSON shapes fail closed instead of throwing',async()=>{
 for(const body of ['null','[]','42','"text"','{}','{"id":42,"livemode":false,"type":"checkout.session.completed"}','{"id":"evt_test","livemode":false,"type":42}']){
  assert.equal((await post(body,await sign(body))).status,400,body);
 }
});
test('signed malformed session identifiers fail closed',async()=>{
 for(const obj of [{id:42},{id:'cs_test_123',payment_intent:42}]){
  const body=JSON.stringify({id:'evt_test',livemode:false,type:'checkout.session.completed',data:{object:{...obj,livemode:false,payment_status:'paid',amount_total:100,currency:'usd',client_reference_id:'ord_1',metadata:{order_id:'ord_1'}}}});
  assert.equal((await post(body,await sign(body))).status,400);
 }
});

test('signed unsupported Stripe events are acknowledged without touching D1',async()=>{
 for(const type of ['charge.refunded','payment_intent.payment_failed','checkout.session.expired']){
  const body=JSON.stringify({id:'evt_ignored',livemode:false,type,data:{object:{}}});
  assert.equal((await post(body,await sign(body))).status,200,type);
 }
});
test('signed checkout events with invalid payment details cannot touch D1',async()=>{
 const valid={id:'cs_test_123',livemode:false,payment_status:'paid',amount_total:24900,currency:'usd',payment_intent:'pi_test_123',client_reference_id:'order-1',metadata:{order_id:'order-1'}};
 const cases=[
  {...valid,amount_total:0.5},
  {...valid,amount_total:-1},
  {...valid,currency:'eur'},
  {...valid,payment_status:'unpaid'},
  {...valid,livemode:true},
  {...valid,metadata:{order_id:'another-order'}},
  {...valid,id:'cs_live_not_test'}
 ];
 for(const [i,object] of cases.entries()){
  const body=JSON.stringify({id:'evt_invalid_'+i,livemode:false,type:'checkout.session.completed',data:{object}});
  assert.equal((await post(body,await sign(body))).status,400,'invalid checkout case '+i);
 }
});


test('signed Stripe TEST webhook changes only the matching order once, and duplicate deliveries are idempotent',async()=>{
 const {DatabaseSync}=await import('node:sqlite');
 const sqlite=new DatabaseSync(':memory:');
 try{
  sqlite.exec([
   'CREATE TABLE service_orders(id TEXT PRIMARY KEY,status TEXT NOT NULL,amount_cents INTEGER NOT NULL,currency TEXT NOT NULL,provider_checkout_session_id TEXT NOT NULL,provider_payment_intent_id TEXT,payment_provider TEXT,paid_at TEXT,updated_at TEXT)',
   'CREATE TABLE payment_webhook_events(provider TEXT NOT NULL,provider_event_id TEXT NOT NULL,event_type TEXT NOT NULL,order_id TEXT NOT NULL,processed_at TEXT,PRIMARY KEY(provider,provider_event_id))',
   'CREATE TABLE commerce_events(id TEXT PRIMARY KEY,entity_type TEXT,entity_id TEXT,event_type TEXT,old_status TEXT,new_status TEXT,actor TEXT,details_json TEXT)'
  ].join(';')+';');
  const insert=sqlite.prepare("INSERT INTO service_orders(id,status,amount_cents,currency,provider_checkout_session_id) VALUES(?,'awaiting_payment',9900,'usd',?)");
  insert.run('order-a','cs_test_orderA');
  insert.run('order-b','cs_test_orderB');
  // Mirror D1's prepare/bind/first and transactional batch APIs over a real SQLite engine.
  const d1={
   prepare(sql){return{bind(...args){
    const stmt=sqlite.prepare(sql);
    const execute=()=>({meta:{changes:stmt.run(...args).changes}});
    return {first:async()=>stmt.get(...args)??null,run:async()=>execute(),execute};
   }};},
   async batch(statements){
    sqlite.exec('BEGIN');
    try{
     const results=statements.map(statement=>statement.execute());
     sqlite.exec('COMMIT');
     return results;
    }catch(e){sqlite.exec('ROLLBACK');throw e;}
   }
  };
  const session={
   id:'cs_test_orderA',livemode:false,payment_status:'paid',amount_total:9900,
   currency:'usd',payment_intent:'pi_test_orderA',
   client_reference_id:'order-a',metadata:{order_id:'order-a'}
  };
  const event=(id,object=session)=>JSON.stringify({
   id,livemode:false,type:'checkout.session.completed',data:{object}
  });
  const first=event('evt_paid_first');
  assert.equal((await post(first,await sign(first),{INQUIRIES_DB:d1})).status,200);
  const getOrder=id=>sqlite.prepare('SELECT status,provider_payment_intent_id FROM service_orders WHERE id=?').get(id);
  const count=table=>sqlite.prepare('SELECT count(*) AS total FROM '+table).get().total;
  assert.deepEqual(getOrder('order-a'),{status:'paid',provider_payment_intent_id:'pi_test_orderA'});
  assert.equal(getOrder('order-b').status,'awaiting_payment');
  assert.equal(count('commerce_events'),1);
  assert.equal(count('payment_webhook_events'),1);
  assert.ok(sqlite.prepare('SELECT processed_at FROM payment_webhook_events WHERE provider_event_id=?').get('evt_paid_first').processed_at);
  // Stripe retries the identical event, then delivers a distinct event for the same paid session.
  assert.equal((await post(first,await sign(first),{INQUIRIES_DB:d1})).status,200);
  const second=event('evt_paid_again');
  assert.equal((await post(second,await sign(second),{INQUIRIES_DB:d1})).status,200);
  assert.equal(count('commerce_events'),1,'only one payment_confirmed transition');
  assert.equal(count('payment_webhook_events'),2,'distinct delivery IDs are recorded once');
  assert.equal(getOrder('order-b').status,'awaiting_payment');
  const mismatched=event('evt_mismatch',{...session,amount_total:1234});
  assert.equal((await post(mismatched,await sign(mismatched),{INQUIRIES_DB:d1})).status,400);
  assert.equal(count('commerce_events'),1);
  assert.equal(count('payment_webhook_events'),2);
 }finally{sqlite.close();}
});
