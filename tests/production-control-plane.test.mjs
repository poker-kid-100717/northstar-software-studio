import test from 'node:test';
import assert from 'node:assert/strict';
import {verify,run} from '../scripts/check-production-control-plane.mjs';
const account='961daf5c86645f2e06c6c86c6156db39';
const staging='https://staging.northstar-software-studio.pages.dev';
const project=()=>({
 name:'northstar-software-studio',
 deployment_configs:{
  preview:{d1_databases:{INQUIRIES_DB:{id:'042bf88c-090e-43bd-969a-ff0f7d2feebd'}}},
  production:{d1_databases:{INQUIRIES_DB:{id:'ef07d532-76a3-4a7e-bb1f-80fe4f021ec9'}}}
 }
});
test('known production and staging databases are read-only and isolated',()=>{
 assert.equal(verify(project()).d1Isolated,true);
});
test('rejects wrong project and D1 binding destinations',()=>{
 const cases=[
  p=>p.name='some-other-project',
  p=>p.deployment_configs.preview.d1_databases.INQUIRIES_DB.id='wrong',
  p=>p.deployment_configs.production.d1_databases.INQUIRIES_DB.id='wrong',
  p=>p.deployment_configs.production.d1_databases.INQUIRIES_DB.id=p.deployment_configs.preview.d1_databases.INQUIRIES_DB.id,
  p=>delete p.deployment_configs.preview,
  p=>delete p.deployment_configs.production
 ];
 for(const mutate of cases){const p=project();mutate(p);assert.throws(()=>verify(p),/MISMATCH|MISSING/);}
});
test('fail closed when live charging or production service auth flags are enabled',()=>{
 for(const name of ['CF_ACCESS_SERVICE_AUTH_ENABLED','STRIPE_LIVE_ENABLED','STRIPE_CHECKOUT_LIVE_ENABLED']){
  const p=project();p.deployment_configs.production.env_vars={[name]:{value:'true'}};
  assert.throws(()=>verify(p),/DISABLED|NOT_APPROVED/);
 }
});
test('remote check never writes or follows redirects or logs secrets',async()=>{
 const env={NORTHSTAR_STAGING_URL:staging,STAGING_CLOUDFLARE_ACCOUNT_ID:account,STAGING_CLOUDFLARE_API_TOKEN:'synthetic-secret'};
 let calls=0;
 const result=await run(env,async (url,init)=>{
  calls++;
  assert.equal(init.redirect,'error');
  assert.equal(init.method,undefined,'must be GET');
  assert.equal(init.headers.Authorization,'Bearer synthetic-secret');
  assert.ok(url.startsWith('https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/'));
  return Response.json({success:true,result:project()});
 });
 assert.equal(calls,1);
 assert.equal(result.liveFlagsNotEnabled,true);
 assert.ok(!JSON.stringify(result).includes('synthetic-secret'));
});
test('requires exact account/staging origin and explicit credential',async()=>{
 const base={NORTHSTAR_STAGING_URL:staging,STAGING_CLOUDFLARE_ACCOUNT_ID:account,STAGING_CLOUDFLARE_API_TOKEN:'synthetic'};
 for(const changed of [{NORTHSTAR_STAGING_URL:'https://northstar-software-studio.pages.dev'},
  {STAGING_CLOUDFLARE_ACCOUNT_ID:'wrong'}, {STAGING_CLOUDFLARE_API_TOKEN:''}]){
  await assert.rejects(run({...base,...changed},()=>{throw Error('should never fetch');}),/MISMATCH|MISSING/);
 }
});
