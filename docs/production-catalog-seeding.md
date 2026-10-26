# Production catalog initialization

The Northstar API reads the active catalog from PostgreSQL. A fresh production database will not contain the 15 seeded service products until migrations and catalog seeding are performed.

## Deployment sequence

1. Provision a PostgreSQL database and store `ConnectionStrings__Northstar` in the API host's secrets.
2. Apply EF Core migrations **before** starting the API. Do not set `ASPNETCORE_ENVIRONMENT=Development` to force migration or seeding in production.
3. Set `Catalog__SeedOnStartup=true` on the API host for the first startup. The API checks for pending migrations and then uses the existing idempotent `ProductSeed.SeedAsync` operation.
4. Verify `GET /api/instant-fixes` returns the expected 15 active products with $30/$50/$100 price tiers.
5. Remove `Catalog__SeedOnStartup` (or set to `false`) after successful initial seeding. Restart normally.

The opt-in does **not** migrate the schema, provision PostgreSQL, deploy the API, or configure Cloudflare routing. These remain separate infrastructure steps. Never enable checkout based solely on a populated catalog.

## Failure handling

If pending migrations exist, startup fails with an explicit migration-required error when the flag is enabled. If the database is unreachable or the schema is absent, seeding fails rather than showing fabricated products. Check API logs and migration status before retrying.

For local development, the existing development-only migrate-and-seed behavior remains unchanged.
