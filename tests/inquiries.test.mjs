import test, { before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { D1, handlers as h } from './inquiry-fixture.mjs';
let db,env,pair,jwk,notifications,originalFetch,providerStatus,verifySuccess;
const id='10000000-0000-4000-8000-000000000001';
const input={name:' Example ',email:' Example@EXAMPLE.test ',projectType:'other',description:'Synthetic request describing an application project.',budget:'unsure',timeline:'flexible',turnstileToken:'do-not-store-token',selectedService:'Automation'};
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
async function jwt(claims={},header={}) {
 const data=b64({alg:'RS256',kid:'test',...header})+'.'+b64({iss:'https://test.cloudflareaccess.com',aud:['owner-app'],exp:Date.now()/1000+600,email:'owner@example.test',...claims});
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data));
 return data+'.'+Buffer.from(signature).toString('base64url');
}
function context(method,path,body,token,extra={}) {
 const headers={'Content-Type':'application/json','Origin':'https://northstar.test','CF-Connecting-IP':'192.0.2.1',...extra};
 if(token)headers['Cf-Access-Jwt-Assertion']=token;
 return {request:new Request('https://northstar.test'+path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})}),env,params:{id}};
}
const intake=(key=crypto.randomUUID(),body=input)=>h.intake.onRequestPost(context('POST','/api/consultation-inquiries',body,null,{'Idempotency-Key':key}));
function seed() {db.db.prepare('INSERT INTO consultation_inquiries(id,contact_name,contact_email,project_type,description,budget,timeline) VALUES (?,?,?,?,?,?,?)').run(id,'Example','example@example.test','other',input.description,'unsure','flexible');}
before(async()=>{
 pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'test'};
});
beforeEach(()=>{
 db=new D1();env={INQUIRIES_DB:db,CF_ACCESS_TEAM_DOMAIN:'test.cloudflareaccess.com',CF_ACCESS_AUD:'owner-app',CF_ACCESS_ADMIN_EMAIL:'owner@example.test',TURNSTILE_SECRET_KEY:'synthetic-secret',RESEND_API_KEY:'synthetic-key',CONSULTATION_FROM_EMAIL:'from@example.test'};
 notifications=[];providerStatus=503;verifySuccess=true;originalFetch=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('/certs'))return Response.json({keys:[jwk]});
  if(String(url).includes('siteverify'))return Response.json({success:verifySuccess,hostname:'northstar.test'});
  if(String(url).includes('resend')){notifications.push(init);return new Response('{}',{status:providerStatus});}
  throw new Error('Unexpected network call');
 };
});
afterEach(()=>{globalThis.fetch=originalFetch;db.db.close();});
test('persists before a Resend outage; normalizes and minimizes stored data',async()=>{
 const response=await intake();assert.equal(response.status,200);
 const result=await response.json();assert.equal(result.stored,true);assert.equal(result.notification,'pending');
 const row=db.db.prepare('SELECT * FROM consultation_inquiries').get();
 assert.equal(row.id,result.reference);assert.equal(row.contact_email,'example@example.test');assert.equal(row.selected_service,'Automation');assert.equal(row.notification_status,'failed');
 const stored=JSON.stringify(row);for(const secret of ['do-not-store-token','synthetic-secret','synthetic-key','192.0.2.1'])assert.ok(!stored.includes(secret));
 assert.equal(notifications.length,1);
});
test('storage failure never reports success or sends email',async()=>{
 db.fail=/INSERT INTO consultation_inquiries/;
 assert.equal((await intake()).status,503);assert.equal(notifications.length,0);
});
test('missing email configuration leaves a durable retryable record',async()=>{
 delete env.RESEND_API_KEY;assert.equal((await intake()).status,200);
 assert.equal(db.db.prepare('SELECT notification_status FROM consultation_inquiries').get().notification_status,'failed');assert.equal(notifications.length,0);
});
test('concurrent duplicate submissions produce one record and one notification',async()=>{
 providerStatus=200;const key=crypto.randomUUID();
 const results=await Promise.all([intake(key),intake(key)]);
 assert.deepEqual(results.map(r=>r.status),[200,200]);
 const bodies=await Promise.all(results.map(r=>r.json()));assert.equal(bodies[0].reference,bodies[1].reference);
 assert.equal(db.db.prepare('SELECT count(*) n FROM consultation_inquiries').get().n,1);assert.equal(notifications.length,1);
 assert.equal((await intake(key,{...input,description:'A different synthetic request with enough detail.'})).status,409);
});
test('owner retry drains durable outbox and stops after delivery',async()=>{
 const result=await (await intake()).json();providerStatus=200;
 db.db.prepare('UPDATE consultation_inquiries SET notification_next_at=NULL').run();
 const response=await h.retry.onRequestPost(context('POST','/api/admin/inquiries/retry',{},await jwt()));
 assert.equal(response.status,200);assert.equal((await response.json()).sent,1);
 assert.equal(notifications[0].headers['Idempotency-Key'],notifications[1].headers['Idempotency-Key']);
 assert.equal(db.db.prepare('SELECT notification_status FROM consultation_inquiries WHERE id=?').get(result.reference).notification_status,'sent');
 await h.retry.onRequestPost(context('POST','/api/admin/inquiries/retry',{},await jwt()));assert.equal(notifications.length,2);
});
test('crashed notification acknowledgement recovers using same provider key',async()=>{
 providerStatus=200;db.fail=/SET notification_status =/;
 await intake();assert.equal(notifications.length,1);
 db.fail=null;db.db.prepare("UPDATE consultation_inquiries SET notification_lease_until=datetime('now','-1 minute')").run();
 await h.retry.onRequestPost(context('POST','/api/admin/inquiries/retry',{},await jwt()));
 assert.equal(notifications.length,2);assert.equal(notifications[0].headers['Idempotency-Key'],notifications[1].headers['Idempotency-Key']);
});
test('retry budget and provider deduplication horizon are bounded',async()=>{
 seed();db.db.prepare('UPDATE consultation_inquiries SET notification_attempts=8').run();
 await h.retry.onRequestPost(context('POST','/api/admin/inquiries/retry',{},await jwt()));assert.equal(notifications.length,0);
 db.db.prepare("UPDATE consultation_inquiries SET notification_attempts=0,created_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','-24 hours')").run();
 await h.retry.onRequestPost(context('POST','/api/admin/inquiries/retry',{},await jwt()));assert.equal(notifications.length,0);
});
test('every inquiry read and mutation denies anonymous requests',async()=>{
 seed();
 for(const [handler,method,body] of [[h.list.onRequestGet,'GET'],[h.csv.onRequestGet,'GET'],[h.status.onRequestPatch,'PATCH',{status:'reviewing'}],[h.activity.onRequestGet,'GET'],[h.activity.onRequestPost,'POST',{body:'private'}],[h.detail.onRequestPatch,'PATCH',{read:true}],[h.detail.onRequestDelete,'DELETE',{confirmReference:id}],[h.retry.onRequestPost,'POST',{}]]) {
  const response=await handler(context(method,'/api/admin/inquiries',body));assert.equal(response.status,401);
  assert.ok(!(await response.text()).includes('example@example.test'));
 }
});
test('owner-only signed JWT validation rejects claims and signatures',async()=>{
 for(const claims of [{email:'other@example.test'},{exp:1},{exp:'999999999999'},{aud:['other']},{iss:'https://evil.test'},{nbf:Date.now()/1000+600}]) {
  assert.equal((await h.list.onRequestGet(context('GET','/api/admin/inquiries',undefined,await jwt(claims)))).status,403);
 }
 const token=await jwt();assert.equal((await h.list.onRequestGet(context('GET','/api/admin/inquiries',undefined,token.slice(0,-20)+'invalid'))).status,403);
 delete env.CF_ACCESS_ADMIN_EMAIL;assert.equal((await h.list.onRequestGet(context('GET','/api/admin/inquiries',undefined,token))).status,503);
});
test('CSRF blocks missing and cross-site origins even with a valid owner JWT',async()=>{
 seed();const token=await jwt();
 for(const origin of ['https://evil.test','null','']) {
  assert.equal((await h.status.onRequestPatch(context('PATCH','/api/admin/inquiries/'+id+'/status',{status:'won'},token,{Origin:origin}))).status,403);
 }
 assert.equal(db.db.prepare('SELECT status FROM consultation_inquiries').get().status,'new');
});
test('owner triage writes atomic status audit and private notes',async()=>{
 seed();const token=await jwt();
 assert.equal((await h.status.onRequestPatch(context('PATCH','/api/admin/inquiries/'+id+'/status',{status:'reviewing'},token))).status,200);
 const audit=db.db.prepare('SELECT * FROM inquiry_activity').get();assert.equal(audit.old_status,'new');assert.equal(audit.new_status,'reviewing');assert.equal(audit.actor,env.CF_ACCESS_ADMIN_EMAIL);
 assert.equal((await h.activity.onRequestPost(context('POST','/api/admin/inquiries/'+id+'/activity',{body:'Synthetic private note'},token))).status,201);
 const activity=await (await h.activity.onRequestGet(context('GET','/api/admin/inquiries/'+id+'/activity',undefined,token))).json();assert.equal(activity.activity.length,2);
 db.db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON inquiry_activity BEGIN SELECT RAISE(ABORT,'synthetic'); END");
 assert.equal((await h.status.onRequestPatch(context('PATCH','/api/admin/inquiries/'+id+'/status',{status:'won'},token))).status,503);
 assert.equal(db.db.prepare('SELECT status FROM consultation_inquiries').get().status,'reviewing');
});
test('follow-up, unread count, search, duplicate detection and paging',async()=>{
 seed();const token=await jwt();
 await intake();
 let result=await (await h.list.onRequestGet(context('GET','/api/admin/inquiries?q=example&sort=followup&limit=1',undefined,token))).json();
 assert.equal(result.total,2);assert.equal(result.unread,2);assert.equal(result.inquiries.length,1);assert.equal(result.inquiries[0].duplicate_count,1);
 assert.equal((await h.detail.onRequestPatch(context('PATCH','/api/admin/inquiries/'+id,{read:true,followUpAt:'2026-11-01T12:00:00.000Z'},token))).status,200);
 assert.ok(db.db.prepare('SELECT read_at FROM consultation_inquiries WHERE id=?').get(id).read_at);
 assert.equal(db.db.prepare('SELECT kind FROM inquiry_events').get().kind,'follow_up_changed');
 result=await (await h.list.onRequestGet(context('GET',"/api/admin/inquiries?q='+OR+1=1--",undefined,token))).json();assert.equal(result.total,0);
 assert.equal((await h.list.onRequestGet(context('GET','/api/admin/inquiries?sort=drop',undefined,token))).status,400);
});
test('safe deletion requires reference, archive and no linked quotes; removes notes',async()=>{
 seed();const token=await jwt();const del=body=>h.detail.onRequestDelete(context('DELETE','/api/admin/inquiries/'+id,body,token));
 assert.equal((await del({confirmReference:'wrong'})).status,400);
 assert.equal((await del({confirmReference:id})).status,409);
 db.db.prepare("UPDATE consultation_inquiries SET status='archived'").run();
 db.db.prepare("INSERT INTO service_quotes(id,inquiry_id,service_name,deliverables,amount_cents) VALUES ('quote',?,'Synthetic','Synthetic',100)").run(id);
 assert.equal((await del({confirmReference:id})).status,409);
 db.db.prepare('DELETE FROM service_quotes').run();
 assert.equal((await del({confirmReference:id})).status,200);
 assert.equal(db.db.prepare('SELECT count(*) n FROM inquiry_activity').get().n,0);
 assert.equal(db.db.prepare("SELECT actor FROM inquiry_events WHERE kind='deleted'").get().actor,env.CF_ACCESS_ADMIN_EMAIL);
});
test('CSV protects formulas and quotes; anonymous export is denied',async()=>{
 for(const v of ['=1+1',' +SUM(A1)','@cmd','\t=cmd','\r-2'])assert.ok(h.csv.csvCell(v).startsWith('"\''));
 assert.equal(h.csv.csvCell('A "quote"'),'\"A \"\"quote\"\"\"');
 seed();const response=await h.csv.onRequestGet(context('GET','/api/admin/inquiries/export',undefined,await jwt()));
 assert.equal(response.headers.get('cache-control'),'no-store');assert.match(await response.text(),/example@example.test/);
});
test('rate limits, bot rejection and actual body bounds prevent writes',async()=>{
 verifySuccess=false;assert.equal((await intake()).status,403);
 verifySuccess=true;assert.equal((await intake(crypto.randomUUID(),{...input,turnstileToken:''})).status,400);
 for(let n=0;n<8;n++) await intake();
 assert.equal((await intake()).status,429);
 assert.equal((await intake(crypto.randomUUID(),{...input,description:'x'.repeat(15000)})).status,400);
 assert.equal((await intake(crypto.randomUUID(),{...input,website:'spam.test'})).status,400);
});

test('single-use Turnstile retry is deduplicated using the inquiry UUID',async()=>{
 const key=crypto.randomUUID(),seen=new Set(),baseFetch=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('siteverify')){
   const token=init.body.get('response'),verificationKey=init.body.get('idempotency_key');
   assert.equal(verificationKey,key);
   const composite=token+':'+verificationKey;
   // A consumed token only replays the original verdict for the same provider key.
   if(seen.has(token) && !seen.has(composite))return Response.json({success:false});
   seen.add(token);seen.add(composite);
   return Response.json({success:true,hostname:'northstar.test'});
  }
  return baseFetch(url,init);
 };
 const responses=await Promise.all([intake(key),intake(key)]);
 assert.deepEqual(responses.map(r=>r.status),[200,200]);
 const bodies=await Promise.all(responses.map(r=>r.json()));assert.equal(bodies[0].reference,bodies[1].reference);
});
test('middleware and handler share one owner verification per request',async()=>{
 seed();let certificates=0;const baseFetch=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{if(String(url).includes('/certs'))certificates++;return baseFetch(url,init);};
 const ctx=context('GET','/api/admin/inquiries',undefined,await jwt());
 const response=await h.middleware.onRequest({...ctx,next:()=>h.list.onRequestGet(ctx)});
 assert.equal(response.status,200);assert.equal(certificates,1);
 const second=context('GET','/api/admin/inquiries',undefined,await jwt());
 assert.equal((await h.list.onRequestGet(second)).status,200);assert.equal(certificates,2);
});
test('status actor cannot leak from prior owner updates into direct database writes',async()=>{
 seed();const token=await jwt();
 await h.detail.onRequestDelete(context('DELETE','/api/admin/inquiries/'+id,{confirmReference:id},token));
 assert.equal(db.db.prepare('SELECT updated_by FROM consultation_inquiries').get().updated_by,'system');
 await h.detail.onRequestPatch(context('PATCH','/api/admin/inquiries/'+id,{read:true},token));
 await h.status.onRequestPatch(context('PATCH','/api/admin/inquiries/'+id+'/status',{status:'reviewing'},token));
 assert.equal(db.db.prepare('SELECT actor FROM inquiry_activity WHERE kind=?').get('status').actor,env.CF_ACCESS_ADMIN_EMAIL);
 assert.equal(db.db.prepare('SELECT updated_by FROM consultation_inquiries').get().updated_by,'system');
 db.db.prepare("UPDATE consultation_inquiries SET status='contacted' WHERE id=?").run(id);
 assert.equal(db.db.prepare("SELECT actor FROM inquiry_activity WHERE new_status='contacted'").get().actor,'system');
 // No-op updates must also consume attribution.
 await h.detail.onRequestPatch(context('PATCH','/api/admin/inquiries/'+id,{followUpAt:null},token));
 db.db.prepare("UPDATE consultation_inquiries SET status='qualified' WHERE id=?").run(id);
 assert.equal(db.db.prepare("SELECT actor FROM inquiry_activity WHERE new_status='qualified'").get().actor,'system');
});
test('description and selected service remain searchable across all stored records',async()=>{
 await intake();const token=await jwt();
 for(const q of ['application project','Automation']) {
  const response=await h.list.onRequestGet(context('GET','/api/admin/inquiries?q='+encodeURIComponent(q),undefined,token));
  assert.equal((await response.json()).total,1);
 }
});
test('notification includes the separately stored catalog service',async()=>{
 providerStatus=200;await intake();
 assert.match(JSON.parse(notifications[0].body).text,/Selected service: Automation/);
});
