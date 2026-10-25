# Northstar Software Studio

Consulting, fixed-price Instant Fixes, and a private business operations console in one application.

## Architecture
- ASP.NET Core Web API and EF Core
- PostgreSQL
- Angular frontend (planned)
- Stripe hosted Checkout with verified, idempotent webhooks (planned)
- Private object storage for customer attachments (planned)
- Cloudflare deployment target

## Instant Fixes
15 database-seeded products across $30, $50 and $100 tiers. One issue, one deliverable, one reasonable revision; no ongoing support or guaranteed resolution outside scope.

## Status
Initial repository scaffold. **Not ready for payments or customer data.** Checkout, authentication, private storage, migrations and end-to-end tests must be completed before production use.

## Run
Install .NET SDK 10, then run `dotnet run --project src/Northstar.Api`. The initial health endpoint is `/health`.

Never commit Stripe keys, credentials, customer data or uploads.
