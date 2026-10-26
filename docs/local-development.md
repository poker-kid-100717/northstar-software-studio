# Local development (foundation branch)

## Requirements
.NET SDK 10, Docker with Compose, PostgreSQL 17 image.

## Setup
1. `docker compose up -d postgres`
2. Set `ConnectionStrings__Northstar` using the value in `.env.example` in your shell or user secrets (the .env file is not loaded automatically).
3. `dotnet tool install --global dotnet-ef --version 10.0.0`
4. `dotnet ef migrations add InitialInstantFixes --project src/Northstar.Api --startup-project src/Northstar.Api`
5. `dotnet ef database update --project src/Northstar.Api --startup-project src/Northstar.Api`
6. `dotnet run --project src/Northstar.Api`

Migration creation is intentionally a developer step until generated migrations are committed. Do not expose a database port publicly. Do not enable checkout before authenticated administration, atomic capacity reservation, Stripe webhook verification and secure private storage are implemented.

## Current API
- GET /health
- GET /api/instant-fixes
- GET /api/instant-fixes/{slug}

Catalog seeding is explicit, idempotent and disabled for checkout by default. No customer intake or payments are available yet.
