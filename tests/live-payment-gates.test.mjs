// A release invariant, not authorization to accept real payments.
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import './inquiry-fixture.mjs'; // Registers the project's real TypeScript Pages handler loader.
const {onRequestPost:checkout} = await import('../web/functions/api/checkout/session.ts');
const {onRequestPost:webhook} = await import('../web/functions/api/stripe/webhook.ts');
const origin='https://staging.northstar-software-studio.pages.dev';
const denyDatabase={prepare(){throw new Error('Rejected payment must never query D1');},
 batch(){throw new Error('Rejected payment must never mutate D1');}};
async function openCheckout(overrides={}){
 return checkout({request:new Request(origin+'/api/checkout/session',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({token:'a'.repeat(64)})
 }),env:{INQUIRIES_DB:denyDatabase,STRIPE_CHECKOUT_TEST_ENABLED:'true',
  QUOTE_ACCEPTANCE_ENABLED:'true',CF_ACCESS_TEAM_DOMAIN:'test.cloudflareaccess.com',
  CF_ACCESS_AUD:'owner-app',CF_ACCESS_ADMIN_EMAIL:'owner@example.test',
  ...overrides}});
}
const secret='whsec_synthetic_live_mode_rejection';
async function signedLiveWebhook(){
 const payload=JSON.stringify({id:'evt_live_fixture',type:'charge.refunded',livemode:true,data:{object:{
  id:'ch_live_fixture',livemode:true,payment_intent:'pi_live_fixture',amount:9900,
  amount_refunded:9900,refunded:true,currency:'usd'
 }}});
 const stamp=Math.floor(Date.now()/1000);
 const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Buffer.from(await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(stamp+'.'+payload))).toString('hex');
 return webhook({request:new Request(origin+'/api/stripe/webhook',{
  method:'POST',headers:{'Stripe-Signature':'t='+stamp+',v1='+signature},body:payload
 }),env:{INQUIRIES_DB:denyDatabase,STRIPE_WEBHOOK_SECRET:secret,STRIPE_CHECKOUT_TEST_ENABLED:'true'}});
}
test('real Stripe secret is refused even when Checkout TEST flags are enabled',async()=>{
 for(const candidate of ['sk_live_synthetic_value','sk_live_','',undefined]){
  const response=await openCheckout({STRIPE_SECRET_KEY:candidate});
  assert.equal(response.status,503);
  assert.equal((await response.json()).error,'CHECKOUT_NOT_CONFIGURED');
 }
});
test('test-mode Checkout remains disabled when either explicit switch is off',async()=>{
 for(const flags of [
  {STRIPE_CHECKOUT_TEST_ENABLED:'false',STRIPE_SECRET_KEY:'sk_test_synthetic'},
  {QUOTE_ACCEPTANCE_ENABLED:'false',STRIPE_SECRET_KEY:'sk_test_synthetic'}
 ])assert.equal((await openCheckout(flags)).status,503);
});
test('valid test secret still requires owner authentication',async()=>{
 assert.equal((await openCheckout({STRIPE_SECRET_KEY:'sk_test_synthetic'})).status,401);
});
test('correctly signed live-mode Stripe event is rejected before any D1 access',async()=>{
 assert.equal((await signedLiveWebhook()).status,400);
});
