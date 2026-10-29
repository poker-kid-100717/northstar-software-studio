import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
const origin=process.env.NORTHSTAR_STAGING_URL!;
const assertion=process.env.STAGING_CF_ACCESS_JWT;
const quoteToken=process.env.STAGING_QUOTE_TOKEN;
const turnstile=process.env.STAGING_TURNSTILE_TEST_TOKEN;
const required=[['STAGING_CF_ACCESS_JWT',assertion],['STAGING_QUOTE_TOKEN',quoteToken],['STAGING_TURNSTILE_TEST_TOKEN',turnstile]];
for(const [key,val] of required)if(!val)throw new Error('Missing '+key+'; staging E2E must not silently skip business assertions.');
if (!/^[a-f0-9]{64}$/i.test(quoteToken!))throw new Error('STAGING_QUOTE_TOKEN must be a 64-character hex scoped staging token.');
test('staging full business path with synthetic inquiry, owner read, notification state and seeded quote acceptance',async({request})=>{
 const key=randomUUID();
 const name='Northstar E2E '+key.slice(0,8);
 const email='northstar-e2e-'+key+'@example.test';
 const response=await request.post('/api/consultation-inquiries',{
  headers:{'Origin':origin,'Idempotency-Key':key,'Content-Type':'application/json'},
  data:{name,email,projectType:'application',description:'Automated isolated staging acceptance test request, no real customer involved.',budget:'unsure',timeline:'flexible',selectedService:'Staging verification',turnstileToken:turnstile}
 });
 expect(response.status(),'staging synthetic intake').toBe(200);
 const stored=await response.json();
 expect(stored).toMatchObject({ok:true,stored:true});
 expect(stored.reference).toMatch(/^[0-9a-f-]{36}$/i);
 // The admin JWT must be a dedicated short-lived staging credential for the configured test owner.
 const admin=await request.get('/api/admin/inquiries?q='+encodeURIComponent(key),{
  headers:{'Cf-Access-Jwt-Assertion':assertion!},maxRedirects:0
 });
 expect(admin.status(),'authenticated staging inquiry listing').toBe(200);
 const listing=await admin.json();
 expect(listing.inquiries.some((v:{id:string,contact_email:string})=>v.id===stored.reference && v.contact_email===email)).toBe(true);
 const inquiry=listing.inquiries.find((v:{id:string})=>v.id===stored.reference);
 expect(['pending','sent','failed']).toContain(inquiry.notification_status);
 // An accepted response alone does not prove email delivery; this verifies durable notification state.
 const quote=await request.get('/api/quotes/'+quoteToken,{maxRedirects:0});
 expect(quote.status(),'pre-seeded isolated quote GET').toBe(200);
 const quoteBody=await quote.json();
 expect(quoteBody.quote.status).toBe('sent');
 expect(quoteBody.acceptanceEnabled).toBe(true);
 const accepted=await request.post('/api/quotes/'+quoteToken,{
  headers:{Origin:origin,'Content-Type':'application/json'},
  data:{acceptTerms:true,expectedVersion:quoteBody.quote.version}
 });
 expect(accepted.status(),'staging quote acceptance').toBe(200);
 expect(await accepted.json()).toMatchObject({ok:true,status:'accepted',paymentStatus:'not_collected'});
 const after=await request.get('/api/quotes/'+quoteToken);
 expect(after.status(),'accepted quote read-back').toBe(200);
 expect((await after.json()).quote.status).toBe('accepted');
 // Acceptance is non-repeatable; the token remains a sensitive read credential until expiry.
 const replay=await request.post('/api/quotes/'+quoteToken,{
  headers:{Origin:origin,'Content-Type':'application/json'},
  data:{acceptTerms:true,expectedVersion:quoteBody.quote.version}
 });
 expect(replay.status(),'replayed quote acceptance must conflict').toBe(409);
 expect(await replay.json()).toMatchObject({error:'QUOTE_CONFLICT'});
});
