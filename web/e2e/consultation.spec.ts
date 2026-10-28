import { test, expect, Page, Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const reference='10000000-0000-4000-8000-000000000001';
const description='I would like an application to help organize customer bookings.';
const accepted={ok:true,stored:true,reference,notification:'sent'};
async function open(page:Page, post?:(route:Route)=>Promise<void>) {
 await page.addInitScript(()=>{
  (window as any).__verification=null;
  window.turnstile={
   render(element:any,options:any){
    (window as any).__verification=options;
    const button=document.createElement('button');button.type='button';button.textContent='Complete security check';
    button.onclick=()=>options.callback('synthetic-token');element.appendChild(button);return 'synthetic-widget';
   },
   reset(){},remove(){}
  };
 });
 await page.route('**/api/consultation-inquiries',async route=>{
  if(route.request().method()==='GET')await route.fulfill({json:{siteKey:'synthetic-site-key'}});
  else if(post)await post(route);
  else await route.fulfill({json:accepted});
 });
 await page.goto('/consultation');
 await expect(page.getByRole('button',{name:'Complete security check'})).toBeVisible();
}
async function fill(page:Page) {
 await page.getByLabel('Your name',{exact:true}).fill('Example Customer');
 await page.getByLabel('Email address',{exact:true}).fill('example@example.test');
 await page.getByLabel("Tell us about your idea or what you'd like to change",{exact:true}).fill(description);
 await page.getByRole('button',{name:'Complete security check'}).click();
}
const send=(page:Page)=>page.getByRole('button',{name:'Share my idea'});
test('successful inquiry displays persisted reference, moves focus and fits viewport',async({page},testInfo)=>{
 await open(page);
 await expect(page.getByText('Do not include passwords, API keys, patient information',{exact:false})).toBeVisible();
 await fill(page);
 await page.screenshot({path:testInfo.outputPath('consultation-form.png'),fullPage:true});
 await send(page).click();
 await expect(page.getByText(reference,{exact:false})).toBeVisible();
 await expect(page.locator('#consultation-confirmation')).toBeFocused();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('consultation-confirmation.png'),fullPage:true});
});
test('keyboard validation exposes inline errors and focuses first invalid field',async({page})=>{
 await open(page);await page.getByRole('button',{name:'Complete security check'}).click();
 await send(page).focus();await page.keyboard.press('Enter');
 await expect(page.getByLabel('Your name',{exact:true})).toBeFocused();
 await expect(page.locator('#name-error')).toContainText('Enter your name');
 await expect(page.locator('#email-error')).toContainText('valid email');
 await expect(page.locator('#description-error')).toContainText('30 to 3,000');
 await page.keyboard.type('Example Customer');await page.keyboard.press('Tab');await page.keyboard.type('example@example.test');
 await expect(page.locator('#contactEmail')).toHaveAttribute('aria-invalid','false');
 await expect(page.locator('#projectDescription')).toHaveAttribute('aria-describedby',/description-error/);
});
test('Turnstile expiry and failure disable sending, preserve answers and allow retry',async({page})=>{
 await open(page);await fill(page);
 await page.evaluate(()=>(window as any).__verification['expired-callback']());
 await expect(send(page)).toBeDisabled();await expect(page.getByRole('status')).toContainText('expired');
 await page.getByRole('button',{name:'Retry security check'}).click();
 await page.getByRole('button',{name:'Complete security check'}).click();
 await expect(send(page)).toBeEnabled();
 await page.evaluate(()=>(window as any).__verification['error-callback']());
 await expect(send(page)).toBeDisabled();await expect(page.getByRole('status')).toContainText('failed');
 await expect(page.locator('#projectDescription')).toHaveValue(description);
});
for(const status of [400,403,502,503,429]) {
 test('HTTP '+status+' keeps answers and retries with the same idempotency key',async({page})=>{
  const keys:string[]=[];
  await open(page,async route=>{
   keys.push(route.request().headers()['idempotency-key']);
   await route.fulfill(keys.length===1?{status,json:{error:status===503?'INQUIRY_STORAGE_UNAVAILABLE':'FAILURE'}}:{json:accepted});
  });
  await fill(page);await send(page).click();
  await expect(page.locator('#submission-feedback')).toBeVisible();await expect(page.locator('#submission-feedback')).toBeFocused();
  await expect(page.locator('#contactName')).toHaveValue('Example Customer');
  await expect(page.locator('#contactEmail')).toHaveValue('example@example.test');
  await expect(page.locator('#projectDescription')).toHaveValue(description);
  await page.getByRole('button',{name:'Complete security check'}).click();await send(page).click();
  await expect(page.locator('#consultation-confirmation')).toBeVisible();expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
 });
}
test('network outage has human-readable feedback and preserves data',async({page})=>{
 await open(page,async route=>route.abort('internetdisconnected'));await fill(page);await send(page).click();
 await expect(page.locator('#submission-feedback')).toContainText('Connection lost');
 await expect(page.locator('#projectDescription')).toHaveValue(description);
});
test('timeout is recoverable and never claims the request was not saved',async({page})=>{
 await page.addInitScript(()=>{
  const timeout=AbortSignal.timeout.bind(AbortSignal);
  AbortSignal.timeout=(ms:number)=>timeout(ms===20000?50:ms);
 });
 await open(page,async route=>{await new Promise(resolve=>setTimeout(resolve,500));await route.fulfill({json:accepted}).catch(()=>{});});
 await fill(page);await send(page).click();
 await expect(page.locator('#submission-feedback')).toContainText('may have been saved');
 await expect(page.locator('#projectDescription')).toHaveValue(description);
});
test('duplicate clicks send once and expose a loading state',async({page})=>{
 let count=0;
 await open(page,async route=>{count++;await new Promise(resolve=>setTimeout(resolve,700));await route.fulfill({json:accepted});});
 await fill(page);await send(page).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
 await expect(page.locator('form')).toHaveAttribute('aria-busy','true');
 await expect(page.getByRole('button',{name:'Sending your request…'})).toBeDisabled();
 await expect(page.locator('#consultation-confirmation')).toBeVisible();expect(count).toBe(1);
});
test('changed answers create a new submission key after failure',async({page})=>{
 const keys:string[]=[];
 await open(page,async route=>{keys.push(route.request().headers()['idempotency-key']);await route.fulfill({status:503,json:{error:'INQUIRY_STORAGE_UNAVAILABLE'}});});
 await fill(page);await send(page).click();await expect(page.locator('#submission-feedback')).toBeVisible();
 await page.locator('#contactName').fill('Another Customer');
 await page.getByRole('button',{name:'Complete security check'}).click();await send(page).click();
 await expect.poll(()=>keys.length).toBe(2);expect(keys[0]).not.toBe(keys[1]);
});
test('missing durable confirmation never shows success',async({page})=>{
 await open(page,async route=>route.fulfill({json:{ok:true}}));await fill(page);await send(page).click();
 await expect(page.locator('#submission-feedback')).toContainText('could not confirm');
 await expect(page.locator('#consultation-confirmation')).toHaveCount(0);
});
test('pending notification accurately confirms secure storage',async({page})=>{
 await open(page,async route=>route.fulfill({json:{...accepted,notification:'pending'}}));await fill(page);await send(page).click();
 await expect(page.getByRole('heading',{name:'Your request has been saved.'})).toBeVisible();
 await expect(page.getByText('We cannot promise a response until delivery is restored.',{exact:false})).toBeVisible();
});
test('security initialization outage shows a retry without exposing technical details',async({page})=>{
 // Install the widget double, then simulate configuration failing on a new visit.
 await open(page);
 await page.unroute('**/api/consultation-inquiries');
 await page.route('**/api/consultation-inquiries',async route=>route.fulfill({status:503,json:{error:'FAILURE'}}));
 await page.reload();
 await expect(page.getByRole('status')).toContainText('security check is unavailable');
 await expect(page.getByRole('status')).not.toContainText('HTTP');
 await page.unroute('**/api/consultation-inquiries');
 await page.route('**/api/consultation-inquiries',async route=>route.fulfill({json:{siteKey:'synthetic'}}));
 await page.getByRole('button',{name:'Retry security check'}).click();
 await expect(page.getByRole('button',{name:'Complete security check'})).toBeVisible();
});
test('WCAG AA automated audit covers pristine, error and confirmation states',async({page})=>{
 await open(page);
 const audit=()=>new AxeBuilder({page}).include('.consultation-page').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
 expect((await audit()).violations).toEqual([]);
 await page.getByRole('button',{name:'Complete security check'}).click();await send(page).click();
 await expect(page.locator('#name-error')).toContainText('Enter your name');
 expect((await audit()).violations).toEqual([]);
 await fill(page);await send(page).click();await expect(page.locator('#consultation-confirmation')).toBeVisible();
 expect((await audit()).violations).toEqual([]);
});
