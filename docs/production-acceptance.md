# Production acceptance — read-only

The [Production acceptance](../.github/workflows/production-acceptance.yml) workflow runs Chromium read-only smoke tests after a successful **production** Pages deployment or from a manual dispatch. It must **never** submit an inquiry, create a quote, use Stripe or mutate D1.

## What the suite checks

- Public storefront root and consultation route return an app shell without uncaught browser errors.
- Consultation form renders and blocks an empty submission; **no production inquiry is sent**.
- Anonymous `GET /api/admin/inquiries` does not reveal records (401/403, Access login redirect, or another non-disclosing response).

The separate [production smoke workflow](../.github/workflows/smoke-production-storefront.yml) checks public route reachability, the configured public Turnstile site-key response, and anonymous denial. The [D1 migration validation](d1-migration-validation.md) gate inspects production schema **read-only**, not records or payment states.

## What it does **not** establish

- Owner-only edge Cloudflare Access protection against a non-owner (check [owner security matrix](../web/ADMIN_SECURITY_VERIFICATION.md)).
- Writable production D1, protected inquiry submission, or Resend delivery in Production.
- Any production Stripe Checkout, fulfillment or refunds.
- Merged open security/payment PRs or authorization for live charging.

Synthetic state-changing tests belong **only in isolated staging**, where [Staging end-to-end acceptance](../.github/workflows/staging-e2e-acceptance.yml) and the [Resend delivery verification](../.github/workflows/verify-staging-resend-delivery.yml) are run under the protected `northstar-staging` environment.

At the October 30, 2026 UTC documentation update the staging business and TEST payment workflow had passed. This is **separate** from the production release gate in [issue #111](https://github.com/poker-kid-100717/northstar-software-studio/issues/111).

## Run local read-only smoke

~~~bash
cd web
npm ci
npx playwright install chromium
npx playwright test --config playwright.acceptance.config.ts
~~~

The Playwright acceptance config defaults to the production Pages origin unless `NORTHSTAR_ACCEPTANCE_URL` is supplied. Do **not** point tests that write synthetic records or complete payments at production URLs.

Keep CI artifacts on short retention, review screenshots/traces for accidental customer data, and record GitHub Actions run links plus the tested SHA in the issue. Green smoke results do not authorize production payments or a deployment rollback.
