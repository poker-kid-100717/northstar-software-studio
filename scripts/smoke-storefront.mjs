#!/usr/bin/env node
// Read-only production health gate. Never sends inquiries or changes records.
// Override NORTHSTAR_URL to point at a preview deployment.
const site = new URL(process.env.NORTHSTAR_URL || 'https://northstar-software-studio.pages.dev');
if (site.protocol !== 'https:' || site.username || site.password || site.search || site.hash) {
  throw new Error('NORTHSTAR_URL must be a clean HTTPS origin');
}
const origin = site.origin;
const retryCount = Number(process.env.SMOKE_ATTEMPTS || 8);
const pauseMs = Number(process.env.SMOKE_RETRY_MS || 5000);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path) {
  return fetch(new URL(path, origin), {
    method: 'GET',
    redirect: 'manual',
    headers: { Accept: 'text/html, application/json' },
    signal: AbortSignal.timeout(10000),
    cache: 'no-store'
  });
}

async function check() {
  for (const path of ['/', '/instant-fixes', '/consultation']) {
    const res = await get(path);
    assert(res.status === 200, path + ': expected HTTP 200, received ' + res.status);
    assert((res.headers.get('content-type') || '').includes('text/html'), path + ': expected HTML');
    const html = await res.text();
    assert(/<html[\s>]/i.test(html) && /<script\b/i.test(html), path + ': Angular HTML shell absent');
    console.log('PASS public route ' + path);
  }

  // Proves the Cloudflare Pages Function was deployed, not replaced with SPA fallback.
  const config = await get('/api/consultation-inquiries');
  assert(config.status === 200, 'consultation config: HTTP ' + config.status);
  assert((config.headers.get('content-type') || '').includes('application/json'), 'consultation API returned HTML instead of JSON');
  const result = await config.json();
  assert(typeof result.siteKey === 'string' && result.siteKey.trim().length > 0,
    'consultation API is deployed but TURNSTILE_SITE_KEY is missing');
  console.log('PASS public consultation Function and Turnstile public site key');

  // Anonymous reads must never receive customer records.
  const admin = await get('/api/admin/inquiries');
  const location = admin.headers.get('location') || '';
  const accessRedirect = [301, 302, 303, 307, 308].includes(admin.status) &&
    (location.includes('/cdn-cgi/access/') || location.includes('cloudflareaccess.com'));
  const denied = admin.status === 401 || admin.status === 403 || accessRedirect;
  assert(denied, 'anonymous admin endpoint must deny access or redirect to Cloudflare Access; received ' +
    admin.status + (admin.status >= 300 && admin.status < 400 ? ' with redirect ' + location : ''));
  console.log('PASS anonymous admin access denied (HTTP ' + admin.status + ')');
}

let lastError;
for (let attempt = 1; attempt <= retryCount; attempt++) {
  try {
    await check();
    console.log('PASS read-only Northstar smoke gate at ' + origin);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error('Smoke attempt ' + attempt + '/' + retryCount + ': ' + String(error.message || error));
    if (attempt < retryCount) await new Promise(resolve => setTimeout(resolve, pauseMs));
  }
}
console.error('FAIL read-only Northstar smoke gate:', lastError);
process.exitCode = 1;
