# Northstar production read-only smoke gate

**Purpose:** Catch Cloudflare Pages routing, missing Functions, missing public Turnstile configuration, and anonymously exposed admin records following a deploy.

The workflow \`smoke-production-storefront.yml\` runs automatically after a successful storefront deploy. It can also be run manually in GitHub Actions. Locally:

\`\`\`bash
node scripts/smoke-storefront.mjs
NORTHSTAR_URL=https://preview-example.pages.dev node scripts/smoke-storefront.mjs
\`\`\`

Checks (no writes, test inquiry or email sent):

1. Public \`/\`, \`/instant-fixes\` and \`/consultation\` serve Angular HTML, not HTTP errors.
2. \`GET /api/consultation-inquiries\` returns JSON containing a nonempty **public** Turnstile site key; this detects a missing Pages Function or a missing site-key setting.
3. Anonymous \`GET /api/admin/inquiries\` returns 401/403 or a Cloudflare Access login redirect, never customer data.
4. Retry briefly to tolerate Pages propagation after deployment.

**Limits:** Loading Angular HTML does not prove that its JavaScript rendered 65 catalog services; a configured site key does not prove that Turnstile challenges complete. The GET check does not prove that the D1 binding/migrations, Turnstile secret, or Resend sender work. The anonymous negative test does not establish **non-owner** denial. Keep issues #37, #50 and #57 open until the separate real-browser and D1/Resend/admin acceptance tests are recorded.

Do **not** put credentials, JWTs, real customer records, live form submissions, or Cloudflare secrets in GitHub Actions logs. Follow \`web/ADMIN_SECURITY_VERIFICATION.md\` for the manual owner/non-owner matrix. Do not treat a green smoke gate as permission to enable payments.
