# Northstar Software Studio

**Custom software consulting, free FixIQ triage, and fixed-scope Instant Fixes.**

[Public storefront](https://northstar-software-studio.pages.dev/) · [Staging Preview](https://staging.northstar-software-studio.pages.dev/) · [Engineering docs](docs/README.md) · [Launch gate (#111)](https://github.com/poker-kid-100717/northstar-software-studio/issues/111)

Northstar provides a consultation intake for new applications, integrations and automation work, plus an Instant Fixes catalog with clearly described $30, $50 and $100 scopes. **FixIQ** is a free, browser-only, rules-based preliminary assessment. It is **not** an AI root-cause diagnosis, production monitor, or automatic repair service.

## Current status (verified October 30, 2026 UTC)

| Area | What is implemented / verified | Limit |
| --- | --- | --- |
| Public storefront | Angular 20 application on Cloudflare Pages; consultation, FixIQ, Instant Fixes and quote routes | A green deploy is not a commercial launch sign-off |
| Consultation | Pages Function + D1 storage, Turnstile, idempotency/rate limiting and retryable email outbox | Don't submit sensitive records, credentials or production incident evidence |
| Owner operations | Admin inquiry dashboard, activity/status/follow-up and quote management; server-side Cloudflare Access JWT verification | The dedicated staging **edge Access app and owner policy remain unverified** |
| Quoting & payments | Customer quote review/acceptance; owner-gated hosted Stripe **TEST** Checkout; signed webhook to D1 and reconciliation | **No live Stripe charging or automatic fulfillment enabled** |
| Staging | Isolated Preview D1 and passing synthetic business/payment end-to-end runs | Signed duplicate-webhook replay and Access edge policy are outstanding in [#111](https://github.com/poker-kid-100717/northstar-software-studio/issues/111) |
| Email | Staging Preview Resend configuration, synthetic inquiry and independently confirmed provider delivery | Domain verification for a future custom sender remains a separate task |

**Evidence:** [latest staging acceptance](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/40993469083), [staging Preview deployment](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/40993400497), [Resend synthetic acceptance](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/40993539074). Resend independently reported `delivered` for the message matching the synthetic staging inquiry reference.

These results concern **staging and TEST payments**, not proof of production payment readiness. See [production acceptance](docs/production-acceptance.md) for the separate read-only production smoke gate.

## Architecture

The active **Cloudflare storefront** is not simply a static client for the .NET API. Production and Preview Pages deployments build from `web/`, which contains both Angular and the deployed **Pages Functions**.

~~~text
Browser
 ├─ Angular 20 storefront (web/src)
 │   ├─ FixIQ: local rules, no server-side problem-description upload
 │   ├─ Consultation / Instant Fixes
 │   ├─ Quote review and test Checkout experience
 │   └─ Owner inquiry/quote dashboard
 └─ Same-origin /api/*
     ├─ Cloudflare Pages Functions (web/functions)
     │   ├─ Consultation, owner admin, quote acceptance
     │   ├─ Stripe TEST Checkout, signed webhook, reconciliation
     │   └─ Resend delivery and durable retry state
     ├─ Cloudflare D1 (INQUIRIES_DB; isolated Preview/Production bindings)
     └─ Optional HTTPS API_ORIGIN proxy for legacy ASP.NET endpoints

Separate .NET 10 / PostgreSQL prototype (src/Northstar.Api)
 └─ Catalog/order service and EF Core code; NOT the active Pages Functions backend
~~~

The .NET/PostgreSQL API is retained as a **separate development/hosting track**. Do not assume that deploying Angular also deploys ASP.NET Core or provisions PostgreSQL. Catalog service calls made through `CatalogService` still depend on a separately hosted API/proxy; the current storefront's Instant Fixes browsing page also contains a built-in service listing.

The repository-level `functions/` directory is a **legacy compatibility entry point**. `web/functions/` is authoritative for deployed Pages Functions. Do not delete the root shim or change routing without checking Cloudflare's build root and both deploy workflows.

## Repository layout

| Path | Purpose |
| --- | --- |
| `web/src/` | Angular 20 pages, FixIQ, catalog and owner UI |
| `web/functions/` | Active Cloudflare Pages API, authentication and payments |
| `web/migrations/` | D1 schema migrations 0001–0007 |
| `src/Northstar.Api/` | Independent .NET 10 + EF Core/PostgreSQL track |
| `tests/` and `tests/Northstar.IntegrationTests/` | D1, Pages Function, webhook and .NET tests |
| `web/staging-e2e/`, `web/e2e/`, `web/acceptance/` | Staging business, browser and read-only production smoke tests |
| `.github/workflows/` | CI, protected staging deployments, production guardrails and diagnostics |
| `docs/` | [Documentation index](docs/README.md), operational runbooks, architecture and launch gates |

## Local development

**Storefront UI:** Node.js 22 and npm.

~~~bash
cd web
npm ci
npm start
~~~

Angular's `web/proxy.conf.json` forwards `/api` to the **separate local .NET server** on `localhost:5080`. `ng serve` alone **does not emulate** Cloudflare Pages Functions, D1, Access or Turnstile. To exercise these services end-to-end, use a properly configured isolated local Cloudflare environment or the protected staging workflow. Never point synthetic tests at production D1.

**Independent .NET track:** .NET SDK 10, Docker/Compose and the development PostgreSQL configuration (see [local setup](docs/local-development.md)).

~~~bash
docker compose up -d postgres
dotnet run --project src/Northstar.Api
~~~

Use development-only secrets, not credentials copied from Production or Preview.

## Validate a change

~~~bash
cd web
npm ci
npm run typecheck:functions
npm test
npm run build -- --configuration production
# Optional local browser checks:
npx playwright install chromium
npm run test:e2e
~~~

CI also runs the .NET build, PostgreSQL integration tests, D1 migration upgrade validation, browser accessibility checks and catalog parity checks. For staging payment acceptance use the **protected GitHub Actions** workflow; it needs scoped secrets and synthetic records unavailable to ordinary local runs.

- [Validate Northstar](.github/workflows/validate.yml) — pull requests and main.
- [Validate D1 migrations](.github/workflows/validate-d1-migrations.yml) — offline migration compatibility; remote checks are separate.
- [Deploy Northstar staging Preview](.github/workflows/deploy-staging-preview.yml) — Preview, isolated D1, protected environment.
- [Staging end-to-end acceptance](.github/workflows/staging-e2e-acceptance.yml) — synthetic inquiry/quote/Stripe TEST; automatically follows successful Preview deployment.
- [Deploy storefront to Cloudflare Pages](.github/workflows/deploy-cloudflare-pages.yml) — **production deployment** after the production D1 schema gate.
- [Production acceptance](.github/workflows/production-acceptance.yml) — read-only production smoke, **not** approval to enable payments.

**Deployment caution:** Merging a PR that changes `web/**` can trigger both the staging deployment and the separate **production** Pages workflow. Review CI and infrastructure impact before merging. Documentation-only changes do not match those deploy paths.

## Configuration and security

Values belong in Cloudflare project settings or **protected GitHub environments**, never in the repository or CI logs.

| Name | Scope / purpose |
| --- | --- |
| `INQUIRIES_DB` | D1 binding; Preview and Production **must be different databases** |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Public inquiry verification; staging uses test credentials |
| `RESEND_API_KEY`, `CONSULTATION_FROM_EMAIL` | Private email API key and sender; optional `CONSULTATION_NOTIFY_EMAIL` |
| `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `CF_ACCESS_ADMIN_EMAIL` | Owner JWT validation; **edge Access policy also required** |
| `QUOTE_ACCEPTANCE_ENABLED` | Staging-controlled quote flow |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | **Test-mode** Stripe API and webhook secrets |
| `STRIPE_CHECKOUT_TEST_ENABLED` | Gate for test-only Checkout; does not authorize live payments |

Checkout creation is owner-authenticated and rejects live Stripe keys. **Payment state is set only by a verified Stripe webhook**, never a success-page redirect. Do not disclose Access assertions, API keys, customer records or Resend message bodies in public artifacts. Consult [staging operations](docs/p0-staging-readiness.md), [inquiry operations](docs/inquiry-operations.md) and [Stripe reconciliation](docs/stripe-reconciliation-runbook.md).

## Launch readiness / next work

1. Verify or create the **dedicated staging Cloudflare Access application** covering `/admin`, `/admin/*`, `/api/admin` and `/api/admin/*`, owner-only. Keep the public Stripe webhook outside its scope; reconcile the new Access audience and protected staging JWT before changing Preview configuration.
2. Validate **signed Stripe TEST event replay/idempotency** against staging D1 and confirm the exact order has one transition. [PR #156](https://github.com/poker-kid-100717/northstar-software-studio/pull/156) contains additional hardening; [#159](https://github.com/poker-kid-100717/northstar-software-studio/pull/159) and [#161](https://github.com/poker-kid-100717/northstar-software-studio/pull/161) are related staging/test work. Do not assume open PRs are deployed.
3. Perform and record the separate **read-only production schema and public-route checks**, then close [#111](https://github.com/poker-kid-100717/northstar-software-studio/issues/111) only when all evidence is complete.
4. Before any customer launch, decide production order fulfillment, refund/reconciliation, privacy/retention and support policies; obtain **separate approval** for live charges.

A verified staging Resend message was delivered from the account's test-capable sender. A future branded sending domain requires its **own** DNS verification; that domain is not a prerequisite for the current staging test.

## Product principles

Focus on small, explicitly scoped improvements and human-reviewed results. The initial FixIQ assessment stays on the client; it does not access third-party systems or diagnose root causes. The service is not an emergency incident response line, does not promise guaranteed fixes, and never asks users to paste secrets.

Northstar is an independent product/portfolio project and is not affiliated with an employer or client.
