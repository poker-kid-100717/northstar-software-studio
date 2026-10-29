import {defineConfig,devices} from '@playwright/test';
const origin=process.env.NORTHSTAR_STAGING_URL || '';
if (origin !== 'https://staging.northstar-software-studio.pages.dev') {
 throw new Error('Refusing origin outside the dedicated Northstar staging allowlist.');
}
export default defineConfig({
 testDir:'./staging-e2e',fullyParallel:false,workers:1,retries:0,timeout:45000,
 reporter:[['list'],['html',{outputFolder:'staging-report',open:'never'}],['junit',{outputFile:'staging-results.xml'}]],
 use:{baseURL:origin,trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'staging-chromium',use:{...devices['Desktop Chrome']}}]
});
