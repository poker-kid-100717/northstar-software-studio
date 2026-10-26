# Local PostgreSQL migration workflow

## Before starting

Use a disposable database for the first migration. The previous app used EF Core `EnsureCreatedAsync`, which **does not create migration history**. Do not run `MigrateAsync` against an existing EnsureCreated database: EF will attempt to create tables that already exist.

## Generate a versioned initial migration

Install .NET SDK 10 and EF Core CLI 10.0.x, then:

```bash
docker compose up -d postgres
dotnet tool install --global dotnet-ef --version 10.0.0
dotnet ef migrations add InitialSchema --project src/Northstar.Api --startup-project src/Northstar.Api --output-dir Data/Migrations
```

Commit the generated migration and model snapshot to this repository. **Do not enable automatic migrations until this committed baseline exists.**

For a disposable local database that was previously created with EnsureCreated, use `docker compose down -v` **only if you intend to delete all its data**, then recreate it. Never use that command on a database containing customer data.

After the initial migration is committed, use `dotnet ef database update --project src/Northstar.Api --startup-project src/Northstar.Api` to migrate a fresh database. Production migrations must be reviewed and applied as a separate deployment step.

## Stripe checkout validation

Payments stay off by default. Test using a separate disposable database and Stripe test-mode keys. Verify pending order creation, checkout redirect, signed webhook, duplicate event replay, expired reservations, invalid signatures and capacity exhaustion. Never commit credentials or real customer data.

## Automated checks

GitHub Actions runs a disposable PostgreSQL 17 database and executes `tests/Northstar.IntegrationTests`. The suite intentionally uses `EnsureCreated` only in its isolated `northstar_test` database to validate current model behavior; it is **not** a migration test. Versioned migrations and a migration upgrade test are still required before production. Never enable live checkout based solely on this test suite.
