import {test,expect} from '@playwright/test';

test.describe('Production — read-only acceptance',()=>{
 test('1. storefront loads and consultation route is reachable',async({page})=>{
  const failures:string[]=[];
  page.on('pageerror',error=>failures.push(error.message));
  const response=await page.goto('/',{waitUntil:'domcontentloaded'});
  expect(response?.ok(),'storefront HTTP response').toBeTruthy();
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
  const consultation=await page.goto('/consultation',{waitUntil:'domcontentloaded'});
  expect(consultation?.ok(),'consultation route HTTP response').toBeTruthy();
  await expect(page.getByRole('button',{name:'Share my idea'})).toBeVisible();
  expect(failures,'uncaught browser errors').toEqual([]);
 });
 test('2. consultation validates required fields without submitting data',async({page})=>{
  await page.goto('/consultation',{waitUntil:'domcontentloaded'});
  await expect(page.getByLabel('Your name',{exact:true})).toBeVisible();
  await expect(page.getByLabel('Email address',{exact:true})).toBeVisible();
  await expect(page.locator('#projectDescription')).toBeVisible();
  // Never generate a Turnstile token or submit customer data on production.
  await expect(page.getByRole('button',{name:'Share my idea'})).toBeDisabled();
 });
 test('3. anonymous admin API does not expose inquiry records',async({request})=>{
  const response=await request.get('/api/admin/inquiries',{maxRedirects:0});
  expect([401,403,404,302,307,308], 'admin endpoint must reject or redirect anonymous access').toContain(response.status());
  const body=await response.text();
  expect(body).not.toMatch(/"inquiries"\s*:\s*\[/);
 });
});
