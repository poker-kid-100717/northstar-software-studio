# Railway API + Neon PostgreSQL: production deployment

**Provisioning is a separate account action.** This repository contains no Railway or Neon credentials. Confirm current costs and budget limits before provisioning.

## 1. Neon

Create one PostgreSQL project/database. Choose a region close to the Railway service. Enable TLS and retain the connection string in your secret manager, not the repository. For Npgsql, ensure the provider connection string is in keyword format (`Host=...;Database=...;Username=...;Password=...;SSL Mode=Require`), not a `postgresql://` URI.

## 2. Railway

Create a service from the GitHub repository. Set the Dockerfile path to `Dockerfile.api` and expose container port `8080`. Configure:
- `ConnectionStrings__Northstar` = Neon Npgsql connection string (secret)
- `ASPNETCORE_ENVIRONMENT` = `Production`
- `Catalog__SeedOnStartup` = `false` initially

Create the Railway public HTTPS domain. Verify `GET /health` succeeds. Do not enable Stripe live payments yet.

## 3. Database migrations (one-time / on schema changes)

GitHub Actions workflow **Build production EF migration bundle** produces a Linux x64 `efbundle` artifact **without accessing your database**. Run the downloaded bundle only in a trusted Linux environment with the Neon connection string provided securely as `ConnectionStrings__Northstar`. For example, from a trusted terminal with the secret already injected into the environment:

```sh
chmod +x ./efbundle
./efbundle
```

The EF bundle reads the design-time connection string from the environment. Verify the migration completed successfully before starting the seed. Never print the connection string in CI logs. Do not automatically migrate on API startup.

## 4. Catalog seed

Temporarily set `Catalog__SeedOnStartup=true` on Railway and restart the API. The initializer refuses pending migrations, then seeds the 15 catalog products idempotently. Verify `GET /api/instant-fixes` returns all 15 active services, then set the flag back to `false` and restart.

## 5. Cloudflare Pages

Set Pages `API_ORIGIN` to the Railway HTTPS origin, ending in `/` and **without** `/api`. Deploy the storefront workflow and verify `https://northstar-software-studio.pages.dev/api/instant-fixes` returns JSON, then test catalog cards, detail pages and intake.

## 6. Safety gates

- Confirm actual monthly spend and alert thresholds in Railway and Neon.
- Configure Neon backup/recovery appropriate for customer order records.
- Check that Pages Functions are actually deployed by Wrangler, not merely present in the repository.
- Ensure webhook and intake routes preserve request bodies and appropriate authentication; test Stripe signatures before enabling payments.
- No production secrets in GitHub Actions artifacts, frontend code or commits.
