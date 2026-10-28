import { defineConfig, devices } from '@playwright/test';
const target = process.env.NORTHSTAR_ACCEPTANCE_URL || 'https://northstar-software-studio.pages.dev';
if (!/^https:\/\/[a-z0-9.-]+(?::443)?\/?$/i.test(target)) throw new Error('NORTHSTAR_ACCEPTANCE_URL must be an HTTPS origin (no path, credentials, or query)');
export default defineConfig({
 testDir:'./acceptance', timeout:30000, expect:{timeout:10000},
 fullyParallel:false, workers:1, retries:1,
 reporter:[['list'],['html',{outputFolder:'acceptance-report',open:'never'}],['junit',{outputFile:'acceptance-results.xml'}]],
 use:{baseURL:target,trace:'retain-on-failure',screenshot:'only-on-failure',actionTimeout:10000},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
});
