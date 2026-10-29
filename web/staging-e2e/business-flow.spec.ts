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
  headers:{'Cf-Access-Jwt-Assertion':assertion!,Origin:origin,'Content-Type':'application/json'},
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
 const anon=await request.post('/api/checkout/session',{headers:{Origin:origin,'Content-Type':'application/json'},data:{token:quoteToken},maxRedirects:0});
 expect([401,403],'checkout without owner identity must be denied').toContain(anon.status());
 const again=await request.post('/api/checkout/session',{headers:{'Cf-Access-Jwt-Assertion':assertion!,Origin:origin,'Content-Type':'application/json'},data:{token:quoteToken}});
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
  // Run #24 trace: the "Pay with card" button is a zero-area overlay that Playwright
  // reports as outside the viewport, so force-clicking it can never work. The real
  // user target is the visible "Card" row; a coordinate click on it goes through the
  // browser hit test and reaches whichever overlay Stripe places on top.
  const cardLabel=page.locator('#payment-method-label-card');
  await expect(cardLabel,'Stripe Card payment method row').toBeVisible({timeout:15000});
  const box=await cardLabel.boundingBox();
  expect(box,'Card row has a layout box').not.toBeNull();
  await page.mouse.click(box!.x+box!.width/2,box!.y+box!.height/2);

  // Hosted Checkout renders card inputs in the top-level document; assert activation
  // through the accessible fields rather than assuming a click worked.
  const cardNumber=page.getByRole('textbox',{name:/card number/i});
  try{
   await expect(cardNumber).toBeVisible({timeout:15000});
  }catch(e){
   await testInfo.attach('stripe-checkout-aria',{body:await page.locator('body').ariaSnapshot().catch(()=>'unavailable'),contentType:'text/plain'});
   throw new Error('Stripe Card method did not expand after selecting the Card row; see attached aria snapshot and trace.');
  }
  await cardNumber.fill('4242424242424242');
  await page.getByRole('textbox',{name:/expiration|expiry|mm.*yy/i}).fill('1230');
  await page.getByRole('textbox',{name:/cvc|security code|cvv/i}).fill('123');
  const name=page.getByRole('textbox',{name:/name on card|cardholder/i});
  if(await name.isVisible())await name.fill('Northstar E2E');
  // Run #28 trace proves the final control is the visible, accessible button "Pay".
  // Never combine it with "Pay with card": that selects Stripe's hidden accordion.
  const billingZip=page.getByRole('textbox',{name:/^(ZIP|Postal code|Postcode)$/i});
  if(await billingZip.isVisible().catch(()=>false))await billingZip.fill('87101');
  const linkOptIn=page.getByRole('checkbox',{name:/Save my information with Link/i});
  if(await linkOptIn.isVisible().catch(()=>false) && await linkOptIn.isChecked())await linkOptIn.uncheck();
  const payButton=page.getByRole('button',{name:'Pay',exact:true});
  await expect(payButton,'Stripe TEST final Pay button').toBeVisible({timeout:15000});
  await expect(payButton).toBeEnabled();
  await payButton.click({timeout:15000});
  await expect(page).toHaveURL(/checkout\/success/,{timeout:60000});
  await expect.poll(async()=>{
   const result=await request.get('/api/stripe/reconciliation?orderId='+checkoutBody.orderId,{headers:{'Cf-Access-Jwt-Assertion':assertion!},maxRedirects:0});
   if(result.status()!==200)return 'NOT_READY';
   const data=await result.json();
   return data.results?.[0]?.orderId===checkoutBody.orderId && data.results[0].localStatus==='paid' ? data.results[0].finding:'NOT_READY';
  },{message:'Signed webhook must mark this exact Stripe TEST order paid and reconcile',timeout:60000,intervals:[1000,2000,4000]}).toBe('MATCH');
 }

});
