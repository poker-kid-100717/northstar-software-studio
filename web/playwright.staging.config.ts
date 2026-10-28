import {defineConfig,devices} from '@playwright/test';
const origin=process.env.NORTHSTAR_STAGING_URL || '';
if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin) || !origin.includes('preview') && !origin.includes('staging')) {
 throw new Error('NORTHSTAR_STAGING_URL must be an explicitly named HTTPS staging/preview origin.');
}
if (origin.includes('northstar-software-studio.pages.dev')) throw new Error('Refusing production origin.');
export default defineConfig({
 testDir:'./staging-e2e',fullyParallel:false,workers:1,retries:0,timeout:45000,
 reporter:[['list'],['html',{outputFolder:'staging-report',open:'never'}],['junit',{outputFile:'staging-results.xml'}]],
 use:{baseURL:origin,trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'staging-chromium',use:{...devices['Desktop Chrome']}}]
});
