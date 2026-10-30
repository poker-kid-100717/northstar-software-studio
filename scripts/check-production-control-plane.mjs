#!/usr/bin/env node
// Read-only control-plane preflight. No Cloudflare mutation or customer data access.
import {pathToFileURL} from 'node:url';
const account='961daf5c86645f2e06c6c86c6156db39';
const projectName='northstar-software-studio';
const expectedPreview='042bf88c-090e-43bd-969a-ff0f7d2feebd';
const expectedProduction='ef07d532-76a3-4a7e-bb1f-80fe4f021ec9';
class GuardError extends Error {}
function need(ok,message){if(!ok)throw new GuardError(message);}
function setting(config,name){return config?.env_vars?.[name]?.value;}
export function verify(project){
 need(project && project.name===projectName,'PROJECT_MISMATCH');
 const production=project.deployment_configs?.production,preview=project.deployment_configs?.preview;
 need(production&&preview,'MISSING_DEPLOYMENT_CONFIGURATION');
 const prodDB=production.d1_databases?.INQUIRIES_DB?.id;
 const previewDB=preview.d1_databases?.INQUIRIES_DB?.id;
 need(previewDB===expectedPreview,'STAGING_D1_MISMATCH');
 need(prodDB===expectedProduction&&prodDB!==previewDB,'PRODUCTION_D1_MISMATCH');
 need(setting(production,'CF_ACCESS_SERVICE_AUTH_ENABLED')!=='true','PRODUCTION_SERVICE_AUTH_MUST_BE_DISABLED');
 need(setting(production,'STRIPE_LIVE_ENABLED')!=='true' &&
      setting(production,'STRIPE_CHECKOUT_LIVE_ENABLED')!=='true','LIVE_STRIPE_FLAG_NOT_APPROVED');
 // Secrets cannot be verified by reading their values. Restrict this to
 // non-secret resource identity and boolean flags, not credential correctness.
 return {project:projectName,environment:'production',d1Isolated:true,serviceAuthNotEnabled:true,liveFlagsNotEnabled:true};
}
export async function run(env=process.env,fetcher=fetch){
 need(env.NORTHSTAR_STAGING_URL==='https://staging.northstar-software-studio.pages.dev','STAGING_ORIGIN_MISMATCH');
 need(env.STAGING_CLOUDFLARE_ACCOUNT_ID===account,'ACCOUNT_MISMATCH');
 need(!!env.STAGING_CLOUDFLARE_API_TOKEN,'MISSING_STAGING_READ_CREDENTIAL');
 const url='https://api.cloudflare.com/client/v4/accounts/'+account+'/pages/projects/'+projectName;
 let response;
 try{response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(20000),
   headers:{Authorization:'Bearer '+env.STAGING_CLOUDFLARE_API_TOKEN,Accept:'application/json'}});}
 catch{throw new GuardError('CLOUDFLARE_READ_FAILED');}
 need(response.status===200,'CLOUDFLARE_HTTP_'+response.status);
 let result;
 try{result=await response.json();}catch{throw new GuardError('CLOUDFLARE_JSON_INVALID');}
 need(result?.success===true,'CLOUDFLARE_API_UNSUCCESSFUL');
 return verify(result.result);
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  await run();
  console.log('PASS: read-only Pages project identity, isolated D1 and disabled live flags.');
  console.log('UNVERIFIED: production intake writes, external Access policies, Resend delivery and financial readiness.');
 }catch(error){
  console.error('FAIL: '+(error instanceof GuardError?error.message:'PRODUCTION_PREFLIGHT_FAILED'));
  process.exitCode=1;
 }
}
