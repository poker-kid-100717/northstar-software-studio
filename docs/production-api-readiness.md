# Production API routing and deployment readiness

## Current failure

Cloudflare Pages deploys only the Angular static bundle. Angular requests `/api/instant-fixes` relative to the Pages origin. The development-only Angular proxy (`web/proxy.conf.json`) is not included in the production bundle. Without a production API route, the catalog displays its unavailable message. The API requires PostgreSQL and is not deployed by the Pages workflow.

## Deploy in this order

1. Provision a managed PostgreSQL database with backups and TLS. Record its private connection string in the API host's secrets; never commit it.
2. Deploy `src/Northstar.Api` to an ASP.NET Core 10 compatible host. Set `ConnectionStrings__Northstar` as a secret and `ASPNETCORE_ENVIRONMENT=Production`.
3. Apply EF Core migrations and run the `ProductSeed.SeedAsync` catalog seeding operation as a controlled deployment step. Currently `Program.cs` does both **only in Development**; do not change the production environment to Development to seed.
4. Verify `GET https://<api-host>/health` returns the expected service response and `GET https://<api-host>/api/instant-fixes` returns 15 active catalog products, with stable IDs, slugs, categories and prices. If not, stop and diagnose API logs and DB connectivity.
5. Configure a **same-origin** reverse proxy for `https://northstar-software-studio.pages.dev/api/*` to the hosted API, preserving paths and methods. A Cloudflare Worker/Pages Function proxy can do this; configure its upstream hostname as a secret or environment variable and restrict the upstream to a trusted HTTPS origin. Do not proxy to localhost.
6. Verify the **public** URL `https://northstar-software-studio.pages.dev/api/instant-fixes` returns JSON, then verify the catalog and a product detail page in a mobile browser.
7. Before enabling customer intake or payments, test request forwarding, webhook signatures, rate limits, CORS/origin behavior, error handling, persistence, and service ID linkage end-to-end. Catalog products currently have `PaymentEligible=false` intentionally.

## Acceptance criteria

- Static Pages deploy continues to work.
- Production `/api/instant-fixes` responds with the seeded catalog, not HTML/404.
- Product details use the same service slug/ID as the catalog.
- Failed upstream requests return controlled errors, without leaking configuration.
- No secrets in GitHub or the Angular bundle.
- Checkout is not enabled without real API/DB hosting and Stripe verification.

## Hosting cost

Cloudflare Pages does not host the existing ASP.NET Core API. A separately hosted .NET service and managed PostgreSQL instance incur their own charges or free-tier constraints. Obtain current prices before choosing a provider; don't assume a free tier is reliable for paying customers.
