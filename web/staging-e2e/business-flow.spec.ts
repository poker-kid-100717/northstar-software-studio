import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
const origin=process.env.NORTHSTAR_STAGING_URL!;
const assertion=process.env.STAGING_CF_ACCESS_JWT;
const turnstile=process.env.STAGING_TURNSTILE_TEST_TOKEN;
const required=[['STAGING_CF_ACCESS_JWT',assertion],['STAGING_TURNSTILE_TEST_TOKEN',turnstile]];
for(const [key,val] of required)if(!val)throw new Error('Missing '+key+'; staging E2E must not silently skip business assertions.');
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
 // Seed a dedicated synthetic quote via the same authenticated production-code APIs.
 // The share token stays in this job's memory and is not logged or stored in GitHub secrets.
 const adminHeaders={'Cf-Access-Jwt-Assertion':assertion!,Origin:origin,'Content-Type':'application/json'};
 const created=await request.post('/api/admin/quotes',{headers:adminHeaders,data:{
  inquiryId:stored.reference,serviceName:'Staging diagnostic',deliverables:'Synthetic automated acceptance only',exclusions:'No real customer work',amountCents:9900
 }});
 expect(created.status(),'create staging quote').toBe(201);
 const createdQuote=await created.json();
 const quoteId=createdQuote.id as string;
 const expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();
 const approved=await request.post('/api/admin/quotes/'+quoteId+'/approve',{headers:adminHeaders,data:{expectedVersion:1,expiresAt}});
 expect(approved.status(),'approve staging quote').toBe(200);
 const shared=await request.post('/api/admin/quotes/'+quoteId+'/share',{headers:adminHeaders});
 expect(shared.status(),'share staging quote').toBe(200);
 const share=await shared.json();
 const quoteToken=new URL(share.shareUrl).pathname.split('/').pop();
 expect(quoteToken).toMatch(/^[a-f0-9]{64}$/i);
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
