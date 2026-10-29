import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
const origin=process.env.NORTHSTAR_STAGING_URL!;
const assertion=process.env.STAGING_CF_ACCESS_JWT;
const turnstile=process.env.STAGING_TURNSTILE_TEST_TOKEN;
const required=[['STAGING_CF_ACCESS_JWT',assertion],['STAGING_TURNSTILE_TEST_TOKEN',turnstile]];
for(const [key,val] of required)if(!val)throw new Error('Missing '+key+'; staging E2E must not silently skip business assertions.');
test('staging full business path with synthetic inquiry, owner read, notification state and seeded quote acceptance',async({request,page},testInfo)=>{
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
 // Checkout is a distinct acceptance gate. Business E2E must not falsely claim Stripe passed.
 if(process.env.STAGING_REQUIRE_STRIPE_CHECKOUT !== 'true') {
  console.log('STRIPE_CHECKOUT_NOT_TESTED: run workflow with require_stripe_checkout=true for explicit payment-gate acceptance.');
  return;
 }
 // Test Stripe session creation only; no card entry, charge, or payment-state mutation.
 const checkout=await request.post('/api/checkout/session',{
  headers:{Origin:origin,'Content-Type':'application/json'},
  data:{token:quoteToken}
 });
 const checkoutResult=await checkout.json() as {error?:string;checkoutUrl?:string;orderId?:string;mode?:string;paymentStatus?:string};
 // API error codes are intentionally non-sensitive; do not print tokens, URLs or headers.
 expect(checkout.status(),`Stripe TEST checkout session creation: ${checkoutResult.error ?? 'UNKNOWN_ERROR'}`).toBe(200);
 const checkoutBody=checkoutResult;
 expect(checkoutBody).toMatchObject({mode:'test',paymentStatus:'awaiting_payment'});
 expect(checkoutBody.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//);
 expect(checkoutBody.orderId).toMatch(/^[0-9a-f-]{36}$/i);
 const exact=await request.get('/api/stripe/reconciliation?orderId='+checkoutBody.orderId,{headers:{'Cf-Access-Jwt-Assertion':assertion!},maxRedirects:0});
 expect(exact.status(),'owner-only test-order reconciliation').toBe(200);
 const reconciliation=await exact.json();
 expect(reconciliation).toMatchObject({mode:'test',checked:1});
 expect(reconciliation.results[0]).toMatchObject({orderId:checkoutBody.orderId,localStatus:'awaiting_payment',finding:'MATCH'});
 // Checkout cannot be started twice for this order.
 const again=await request.post('/api/checkout/session',{headers:{Origin:origin,'Content-Type':'application/json'},data:{token:quoteToken}});
 expect(again.status(),'duplicate checkout blocked').toBe(409);

 if(process.env.STAGING_COMPLETE_TEST_PAYMENT==='true'){
  // Test-only hosted checkout. Never submit a real payment credential.
  await page.goto(checkoutBody.checkoutUrl!,{waitUntil:'domcontentloaded'});
  // Hosted Checkout may ask for contact information or payment method selection
  // before mounting its card fields. Never guess that a particular iframe exists.
  await expect(page).toHaveURL(url => url.hostname === 'checkout.stripe.com');
  const emailField=page.getByRole('textbox',{name:/email/i}).or(page.getByPlaceholder(/email/i));
  if(await emailField.first().isVisible().catch(()=>false))
   await emailField.first().fill('northstar-e2e@example.test');
  // Stripe may already have the Card accordion expanded. In that state the
  // accordion's "Pay with card" button is retained in the DOM but hidden.
  // Only click when the card choice is actually visible; otherwise inspect
  // already-mounted payment fields rather than failing on a hidden button.
  const cardChoice=page.getByRole('button',{name:'Pay with card',exact:true});
  if(await cardChoice.isVisible().catch(()=>false))
   await cardChoice.click();

  const fields=[
   {name:'card number',pattern:/card number|1234 1234 1234 1234/i,value:'4242424242424242'},
   {name:'expiry',pattern:/expiration|expiry|mm.*yy/i,value:'1230'},
   {name:'security code',pattern:/cvc|security code|cvv/i,value:'123'}
  ];
  for(const field of fields){
   let filled=false;
   // Search every frame; Stripe can change the nesting and names of secure inputs.
   for(let attempt=0;attempt<10&&!filled;attempt++){
    for(const frame of page.frames()){
     const locator=frame.getByRole('textbox',{name:field.pattern})
      .or(frame.getByPlaceholder(field.pattern))
      .or(frame.locator('input[aria-label],input[placeholder]').filter({visible:true}));
     const inputs=await locator.count().catch(()=>0);
     for(let i=0;i<Math.min(inputs,12);i++){
      const input=locator.nth(i);
      const descriptor=((await input.getAttribute('aria-label').catch(()=>''))||'')+' '+((await input.getAttribute('placeholder').catch(()=>''))||'');
      if(!field.pattern.test(descriptor))continue;
      try{await input.fill(field.value,{timeout:1500});filled=true;break;}catch{}
     }
     if(filled)break;
    }
    if(!filled)await page.waitForTimeout(700);
   }
   if(!filled){
    // Metadata only: never write URLs with session tokens, input values, or secrets.
    const frames=page.frames().map(f=>({host:(()=>{try{return new URL(f.url()).hostname}catch{return 'unknown'}})()}));
    await testInfo.attach('stripe-frame-hosts',{body:JSON.stringify(frames),contentType:'application/json'});
    throw new Error('Stripe hosted '+field.name+' field not visible. Inspect protected Playwright trace/screenshot; hosted Checkout may be showing a different payment method, blocked by bot protection, or changed its markup.');
   }
  }
  await page.getByRole('button',{name:/Pay|Complete payment/i}).click();
  await expect(page).toHaveURL(/checkout\/success/,{timeout:60000});
  await expect.poll(async()=>{
   const result=await request.get('/api/stripe/reconciliation?orderId='+checkoutBody.orderId,{headers:{'Cf-Access-Jwt-Assertion':assertion!},maxRedirects:0});
   if(result.status()!==200)return 'NOT_READY';
   const data=await result.json();
   return data.results?.[0]?.orderId===checkoutBody.orderId && data.results[0].localStatus==='paid' ? data.results[0].finding:'NOT_READY';
  },{message:'Signed webhook must mark this exact Stripe TEST order paid and reconcile',timeout:60000,intervals:[1000,2000,4000]}).toBe('MATCH');
 }

});
