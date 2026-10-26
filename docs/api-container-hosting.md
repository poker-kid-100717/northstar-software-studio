# Container deployment for Northstar API

Build from repository root:

```sh
docker build -f Dockerfile.api -t northstar-api:local .
```

The runtime listens on port 8080 as a non-root user. Deploy to a container host that supports .NET 10 and persistent external PostgreSQL.

Configure at the host (never in the image):

- `ConnectionStrings__Northstar`: PostgreSQL connection string stored as a secret
- `ASPNETCORE_ENVIRONMENT=Production`
- `Catalog__SeedOnStartup=true` **only after** migrations have been applied, then disable it
- HTTPS termination and routing from the public API origin to container port 8080

Verify `GET /health`, then `GET /api/instant-fixes` and a product detail endpoint. This Dockerfile does not provision the DB, migrate the schema, configure Cloudflare `API_ORIGIN`, or enable Stripe payments.
