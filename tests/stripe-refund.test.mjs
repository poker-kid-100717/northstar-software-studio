// Real SQLite regression for Stripe TEST full refunds. No live Stripe or production D1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(new URL('../web/package.json', import.meta.url));
const ts = require('typescript');
const code = readFileSync(new URL('../web/functions/api/stripe/webhook.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(code, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {onRequestPost} = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const secret = 'whsec_synthetic_refund_test_only';
const fullCharge = {
 id:'ch_test_orderA',livemode:false,payment_intent:'pi_test_orderA',
 amount:9900,amount_refunded:9900,refunded:true,currency:'usd'
};
const event=(id,charge=fullCharge)=>JSON.stringify({
 id,livemode:false,type:'charge.refunded',data:{object:charge}
});
async function sign(body){
 const stamp=Math.floor(Date.now()/1000);
 const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+body));
 return 't='+stamp+',v1='+Buffer.from(bytes).toString('hex');
}
function database(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec([
  'CREATE TABLE service_orders (id TEXT PRIMARY KEY,status TEXT NOT NULL,amount_cents INTEGER NOT NULL,currency TEXT NOT NULL,provider_checkout_session_id TEXT NOT NULL,provider_payment_intent_id TEXT,payment_provider TEXT,paid_at TEXT,updated_at TEXT)',
  'CREATE TABLE payment_webhook_events (provider TEXT NOT NULL,provider_event_id TEXT NOT NULL,event_type TEXT NOT NULL,order_id TEXT NOT NULL,processed_at TEXT,PRIMARY KEY(provider,provider_event_id))',
  'CREATE TABLE commerce_events (id TEXT PRIMARY KEY,entity_type TEXT,entity_id TEXT,event_type TEXT,old_status TEXT,new_status TEXT,actor TEXT,details_json TEXT)'
 ].join(';')+';');
 sqlite.prepare("INSERT INTO service_orders(id,status,amount_cents,currency,provider_checkout_session_id,provider_payment_intent_id,paid_at) VALUES(?,'paid',9900,'usd',?,?,datetime('now'))").run('order-a','cs_test_orderA','pi_test_orderA');
 sqlite.prepare("INSERT INTO service_orders(id,status,amount_cents,currency,provider_checkout_session_id,provider_payment_intent_id,paid_at) VALUES(?,'paid',9900,'usd',?,?,datetime('now'))").run('order-b','cs_test_orderB','pi_test_orderB');
 sqlite.prepare("INSERT INTO service_orders(id,status,amount_cents,currency,provider_checkout_session_id) VALUES(?,'awaiting_payment',9900,'usd',?)").run('order-c','cs_test_orderC');
 const d1={
  prepare(sql){return {bind(...args){const stmt=sqlite.prepare(sql);return {
   first:async()=>stmt.get(...args)??null,run:async()=>({meta:{changes:stmt.run(...args).changes}}),
   execute:()=>({meta:{changes:stmt.run(...args).changes}})
  };}};},
  async batch(stmts){sqlite.exec('BEGIN');try{const result=stmts.map(s=>s.execute());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}
 };
 async function post(body,signature=undefined){
  const signed=signature===undefined?await sign(body):signature;
  return onRequestPost({request:new Request('https://staging.northstar-software-studio.pages.dev/api/stripe/webhook',{
   method:'POST',headers:{'Stripe-Signature':signed},body
  }),env:{INQUIRIES_DB:d1,STRIPE_CHECKOUT_TEST_ENABLED:'true',STRIPE_WEBHOOK_SECRET:secret}});
 }
 const status=id=>sqlite.prepare('SELECT status FROM service_orders WHERE id=?').get(id).status;
 const count=table=>sqlite.prepare('SELECT COUNT(*) AS n FROM '+table).get().n;
 return {sqlite,post,status,count};
}
test('signed full TEST refund atomically refunds exact order and creates one audit event',async()=>{
 const db=database();
 try{
  const payload=event('evt_refund_one');
  assert.equal((await db.post(payload)).status,200);
  assert.equal(db.status('order-a'),'refunded');
  assert.equal(db.status('order-b'),'paid');
  assert.equal(db.status('order-c'),'awaiting_payment');
  assert.equal(db.count('commerce_events'),1);
  assert.equal(db.count('payment_webhook_events'),1);
  const audit=db.sqlite.prepare('SELECT event_type,old_status,new_status,actor FROM commerce_events').get();
  assert.deepEqual({...audit},{event_type:'refunded',old_status:'paid',new_status:'refunded',actor:'stripe'});
  assert.ok(db.sqlite.prepare('SELECT processed_at FROM payment_webhook_events').get().processed_at);
  assert.equal((await db.post(payload)).status,200,'same event replay is safe');
  assert.equal((await db.post(event('evt_refund_distinct'))).status,200,'second signed event for same already-refunded order is safe');
  assert.equal(db.count('commerce_events'),1,'no second refund transition');
 }finally{db.sqlite.close();}
});
test('partial refunds are not incorrectly recorded as fully refunded',async()=>{
 const db=database();
 try{
  assert.equal((await db.post(event('evt_partial',{...fullCharge,refunded:false,amount_refunded:4000}))).status,409);
  assert.equal(db.status('order-a'),'paid');
  assert.equal(db.count('payment_webhook_events'),0);
 }finally{db.sqlite.close();}
});
test('amount mismatch, unknown payment intent and out-of-order refund are retryable conflicts',async()=>{
 const db=database();
 try{
  for(const charge of [
   {...fullCharge,amount:12000,amount_refunded:12000},
   {...fullCharge,payment_intent:'pi_test_unknown'},
   {...fullCharge,payment_intent:'pi_test_orderC',id:'ch_test_orderC'}
  ])assert.equal((await db.post(event('evt_conflict_'+charge.payment_intent+charge.amount,charge))).status,409);
  assert.equal(db.status('order-a'),'paid');
  assert.equal(db.count('commerce_events'),0);
 }finally{db.sqlite.close();}
});
test('wrong signature and malformed refund claims fail before storage',async()=>{
 const db=database();
 try{
  assert.equal((await db.post(event('evt_wrong_signature'),'t=1,v1='+'0'.repeat(64))).status,400);
  for(const bad of [
   {...fullCharge,livemode:true},
   {...fullCharge,currency:'eur'},
   {...fullCharge,amount_refunded:9901},
   {...fullCharge,amount_refunded:0.25},
   {...fullCharge,refunded:false},
   {...fullCharge,payment_intent:undefined},
   {...fullCharge,id:'not-a-charge'}
  ]) {
   const expected=bad.refunded===false?409:400;
   assert.equal((await db.post(event('evt_bad_'+Math.random().toString(36),bad))).status,expected);
  }
  assert.equal(db.count('commerce_events'),0);
  assert.equal(db.count('payment_webhook_events'),0);
 }finally{db.sqlite.close();}
});
