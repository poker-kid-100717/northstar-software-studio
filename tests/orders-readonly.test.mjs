import test,{before,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {D1} from './inquiry-fixture.mjs';
const {onRequestGet}=await import('../web/functions/api/admin/orders.ts');
let pair,jwk,db,env,originalFetch;
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
async function ownerToken(changes={}){
 const input=b64({alg:'RS256',kid:'test'})+'.'+b64({iss:'https://test.cloudflareaccess.com',aud:['owner-app'],exp:Date.now()/1000+600,email:'owner@example.test',...changes});
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input));
 return input+'.'+Buffer.from(signature).toString('base64url');
}
function request(token='',path='/api/admin/orders'){
 return onRequestGet({request:new Request('https://northstar.test'+path,{
  headers:token?{'Cf-Access-Jwt-Assertion':token}:{}
 }),env});
}
before(async()=>{
 pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
  publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test'};
});
beforeEach(()=>{
 db=new D1();originalFetch=globalThis.fetch;
 env={INQUIRIES_DB:db,CF_ACCESS_TEAM_DOMAIN:'test.cloudflareaccess.com',CF_ACCESS_AUD:'owner-app',CF_ACCESS_ADMIN_EMAIL:'owner@example.test'};
 globalThis.fetch=async url=>{assert.ok(String(url).endsWith('/cdn-cgi/access/certs'));return Response.json({keys:[jwk]});};
 const sql=db.db;
 const inquiry='10000000-0000-4000-8000-000000000001';
 sql.prepare('INSERT INTO consultation_inquiries(id,contact_name,contact_email,project_type,description,budget,timeline) VALUES (?,?,?,?,?,?,?)')
  .run(inquiry,'Synthetic','synthetic@example.test','other','Synthetic test inquiry for protected order queue regression.','unsure','flexible');
 const q=sql.prepare("INSERT INTO service_quotes(id,inquiry_id,service_name,deliverables,amount_cents,status,approved_at,approved_by,expires_at,accepted_at) VALUES (?,?,?,?,9900,'accepted',datetime('now'),'owner',datetime('now','+7 days'),datetime('now'))");
 q.run('20000000-0000-4000-8000-000000000002',inquiry,'Synthetic repair','Test deliverables');
 q.run('30000000-0000-4000-8000-000000000003',inquiry,'Synthetic workflow','Test deliverables');
 sql.prepare("INSERT INTO service_orders(id,quote_id,status,amount_cents,paid_at) VALUES (? ,? ,'paid',9900,datetime('now'))")
  .run('40000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002');
 sql.prepare("INSERT INTO service_orders(id,quote_id,status,amount_cents) VALUES (?,?,'awaiting_payment',9900)")
  .run('50000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000003');
});
afterEach(()=>{globalThis.fetch=originalFetch;db.db.close();});
test('owner can view read-only paged queue, status counts and linked service names',async()=>{
 const before=db.db.prepare('SELECT total_changes() AS n').get().n;
 const response=await request(await ownerToken());
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.total,2);
 assert.equal(body.orders.length,2);
 assert.equal(body.counts.find(x=>x.status==='paid').count,1);
 assert.equal(body.counts.find(x=>x.status==='awaiting_payment').count,1);
 assert.ok(body.orders.some(o=>o.service_name==='Synthetic repair'&&o.status==='paid'));
 assert.ok(body.orders.every(o=>!('contact_email' in o)&&!('provider_payment_intent_id' in o)));
 assert.equal(db.db.prepare('SELECT total_changes() AS n').get().n,before,'list must never mutate D1');
});
test('status filter and strict pagination work',async()=>{
 const token=await ownerToken();
 const filtered=await request(token,'/api/admin/orders?status=paid&limit=1&offset=0');
 assert.equal(filtered.status,200);
 const payload=await filtered.json();
 assert.equal(payload.total,1);assert.equal(payload.orders.length,1);assert.equal(payload.orders[0].status,'paid');
 for(const path of ['/api/admin/orders?status=other','/api/admin/orders?limit=0','/api/admin/orders?limit=100',
  '/api/admin/orders?offset=10001','/api/admin/orders?offset=-1','/api/admin/orders?sort=hack',
  '/api/admin/orders?status=paid&status=refunded']){
  const response=await request(token,path);
  assert.equal(response.status,400,path);
 }
});
test('anonymous, incorrect audience and non-owner assertions cannot view orders',async()=>{
 assert.equal((await request()).status,401);
 assert.equal((await request(await ownerToken({email:'intruder@example.test'}))).status,403);
 assert.equal((await request(await ownerToken({aud:['other-app']}))).status,403);
});
