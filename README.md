# Northstar Software Studio · FixIQ

[Visit the storefront](https://northstar-software-studio.pages.dev/) · [Source](https://github.com/poker-kid-100717/northstar-software-studio)

Northstar is an independent software-rescue product and fixed-price troubleshooting storefront for small businesses. **FixIQ** is its interactive first step: describe a broken integration, automation, data workflow, or application; receive a preliminary assessment and actionable checks; and explore narrowly scoped repair services.

> **Current status:** Working Angular storefront and client-side, rules-based FixIQ triage. This is **not** a production AI diagnostic engine. The triage does not inspect external systems, accept uploads, persist cases, or guarantee a root cause. Verify the live deployment before calling it production-ready for customers.

## What the MVP includes

- **FixIQ triage:** problem description, affected system, business impact, category-specific troubleshooting checklist, suggested scope and priority.
- **Privacy-conscious first step:** triage runs locally in the browser; descriptions are not sent to the server. Visitors are told not to enter secrets, health records, or personal data.
- **Instant Fixes:** catalog of narrowly scoped $30, $50, and $100 service options with intake/checkout UI and API-backed catalog.
- **Backend foundation:** ASP.NET Core 10 API, EF Core and PostgreSQL, persisted order/intake flows, Stripe integration and webhook handling in the codebase. These require correct secrets, infrastructure, operational controls, and end-to-end validation before accepting real customer payments.
- **Delivery:** Angular 20 frontend on Cloudflare Pages through GitHub Actions; .NET and database infrastructure are separate from the static Pages deployment.

## Architecture

```text
Visitor
  └── Cloudflare Pages · Angular 20
       ├── FixIQ triage (browser-only, rules-based)
       ├── Instant Fixes catalog and intake
       └── /api/* → ASP.NET Core 10 API (requires separate hosting)
                     ├── EF Core → PostgreSQL
                     └── Stripe Checkout / webhook handling (configuration required)
```

**Important:** Cloudflare Pages serves the frontend, not the ASP.NET Core API. Catalog and checkout functionality that depends on `/api/*` will not work in production until API hosting and routing are configured. A green frontend deployment does not prove that end-to-end ordering works.

## Run locally

Prerequisites: .NET SDK 10, Node.js 22, PostgreSQL and project-specific configuration.

```bash
# Terminal 1: API
dotnet run --project src/Northstar.Api

# Terminal 2: Angular frontend
cd web
npm install
npm start
```

The Angular dev server uses `web/proxy.conf.json` for API calls. Set up PostgreSQL and required development configuration before exercising API-dependent flows. The API health endpoint is `/health`.

To validate the frontend production bundle:

```bash
cd web
npm run build -- --configuration production
```

## Delivery and testing

- GitHub Actions validates Angular, .NET and PostgreSQL integration tests.
- `.github/workflows/deploy-cloudflare-pages.yml` builds the Angular production bundle, verifies the generated index and JS artifacts, and deploys `web/dist/northstar/browser` to Cloudflare Pages.
- Angular's `zone.js` polyfill is configured to prevent runtime `NG0908` during zone-based bootstrap.
- Deployment checks alone are not a substitute for opening the site, checking the browser console, and exercising API-dependent flows.

## Product roadmap

1. **FixIQ cases:** ASP.NET Core diagnostic-case API, structured evidence metadata, review queue and explicit consent.
2. **Secure intake:** file validation, private object storage, retention limits, audit logs, secrets/PII screening and access controls.
3. **Human-reviewed estimates:** clear scope, exclusions, fixed-price eligibility, payment and repair acceptance.
4. **Proof of repair:** before/after evidence, reproducible checks, tests and documented outcomes.
5. **FixIQ Watch:** opt-in monitoring for a small number of integrations, with alerting and paid remediation. No 24/7 response promises.
6. **Learning loop:** permissioned, anonymized symptom → cause → repair → verification patterns; evaluate AI assistance only with appropriate security and human oversight.

## Security and commercial boundaries

Never commit credentials, customer records, Stripe secrets, production logs or uploaded evidence. Do not submit sensitive business information to the public triage form. A preliminary assessment is not a professional guarantee or a substitute for production incident response. No live monitoring or automatic remediation is currently offered.

**Built as an independent product and portfolio project.** Northstar is not affiliated with an employer or client.
