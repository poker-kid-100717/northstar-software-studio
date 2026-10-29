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
