# Production acceptance — Playwright

The initial automated live acceptance suite is **read-only**, uses Chromium, and runs after successful **Deploy storefront to Cloudflare Pages** executions or manually via Actions > **Production acceptance (read-only)**. It publishes JUnit, HTML, screenshots, and failure traces. Set optional repository variable `NORTHSTAR_ACCEPTANCE_URL` to the actual production HTTPS origin (otherwise defaults to the Pages domain). Ensure the origin is reachable from GitHub-hosted runners.

Coverage:
- **1 Storefront:** HTTP, visible app shell, consultation route, uncaught browser exceptions.
- **2 Consultation:** form availability and no accidental empty-form submission. Actual submission and D1 persistence are **not** verified.
- **3 Admin:** anonymous inquiry API must not disclose records. Authenticated owner dashboard is **not** verified.
- **4 Notifications:** **not yet automated**; requires a staging Resend integration and delivery reconciliation.
- **5 Quotes:** **not yet automated**; requires staging seeded inquiries/quotes, authenticated test owner, scoped acceptance links, and cleanup.

Next phase: build a dedicated staging D1 database + Pages preview deployment, synthetic test records with cleanup, Cloudflare Access test authentication, Turnstile test configuration, and Resend test-mode verification. Only then enable state-changing end-to-end tests 2–5. Never use production customer data, real payment methods, or shared administrator credentials in CI. Don't silently mark unimplemented scenarios as passing.

To run locally:
```powershell
cd web
npm ci
npx playwright install chromium
npx playwright test --config playwright.acceptance.config.ts
```

This workflow is a **post-deployment monitor**, not a pre-deployment gate or rollback system. It cannot certify production write paths or external delivery. Restrict GitHub Actions report access, as browser traces may contain page content.
