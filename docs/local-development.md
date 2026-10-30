# Local development

Northstar contains two backend tracks. The **deployed** storefront uses `web/functions` (Cloudflare Pages Functions and D1). The **separate .NET API** under `src/Northstar.Api` uses PostgreSQL.

## Angular 20 UI (Node.js 22)

~~~bash
cd web
npm ci
npm start
~~~

The Angular dev server uses `web/proxy.conf.json` to forward `/api` to a **local .NET API** at `http://localhost:5080` if one is running. This does not emulate Cloudflare Pages Functions, D1, Access, Resend or Turnstile. Use an isolated Cloudflare development setup or the protected staging workflow to test those integrations; **never** point synthetic tests at Production.

Validate UI and functions source:

~~~bash
cd web
npm run typecheck:functions
npm test
npm run build -- --configuration production
npx playwright install chromium
npm run test:e2e
~~~

The default Playwright E2E configuration runs an isolated local storefront web server on port 4173.

## Separate .NET 10 / PostgreSQL API

Requirements: .NET SDK 10 and Docker/Compose. From the repository root:

~~~bash
docker compose up -d postgres
# Supply a development-only connection string in the shell or .NET user secrets.
# ConnectionStrings__Northstar=Host=localhost;Port=5432;Database=northstar;Username=northstar;Password=local_dev_only
dotnet run --project src/Northstar.Api
~~~

`.env.example` documents the local-only example but is **not automatically loaded** into .NET or your shell. Docker Compose binds PostgreSQL to localhost. The API **automatically applies its committed EF Core migrations and seeds the catalog in Development**; do not create a new Initial migration on every start. Endpoints include `GET /health` and `GET /api/instant-fixes`.

This API is not the active Pages Functions/D1 backend. Hosting and configuring the optional HTTPS `API_ORIGIN` proxy is a separate undertaking.

## Credentials and data

Do not use production/staging provider secrets in local .env files, commit customer data or expose PostgreSQL publicly. For staging D1 validation and provider email/payment tests see [P0 readiness](p0-staging-readiness.md) and [staging E2E](staging-e2e-acceptance.md).
