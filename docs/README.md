# Northstar engineering documentation

Start with the [repository README](../README.md) for **current architecture, local commands, and staging status**. Some older notes in this directory document the **separate ASP.NET Core/PostgreSQL track** rather than the deployed Cloudflare Pages Functions/D1 storefront. Do not use a legacy runbook to configure or deploy the Pages Functions backend.

## Active Cloudflare Pages / D1 storefront

| Topic | Reference |
| --- | --- |
| Staging and P0 completion evidence | [P0 staging readiness](p0-staging-readiness.md) and [staging E2E](staging-e2e-acceptance.md) |
| Preview environment setup | [staging-preview-configuration](staging-preview-configuration.md) |
| Inquiry lifecycle, retries, retention | [inquiry-operations](inquiry-operations.md), [consultation-abuse-protection](consultation-abuse-protection.md) |
| Owner Access security | [web/ADMIN_SECURITY_VERIFICATION.md](../web/ADMIN_SECURITY_VERIFICATION.md) |
| Quotes and ordering | [web/ADMIN_QUOTES.md](../web/ADMIN_QUOTES.md), [web/COMMERCE_FOUNDATION.md](../web/COMMERCE_FOUNDATION.md) |
| Signed Stripe TEST webhooks/reconciliation | [Stripe reconciliation runbook](stripe-reconciliation-runbook.md) |
| D1 migration validation | [D1 migration validation](d1-migration-validation.md), [D1 production runner](d1-production-runner.md) |
| Production read-only checks | [production smoke gate](production-smoke-gate.md), [production acceptance](production-acceptance.md) |
| UI and testing | [inquiry-experience-testing](inquiry-experience-testing.md), [validation](validation.md) |

**Live boundaries:** `web/src` is the Angular frontend; `web/functions` implements the deployed Pages APIs; `web/migrations` are D1 migrations. Production deployments and staging Preview deployments are **separate GitHub workflows**. An isolated staging acceptance pass does not enable live Stripe payments.

## Separate .NET 10 / PostgreSQL development track

These documents describe a separate API in `src/Northstar.Api` and are retained for reference; they are **not instructions for configuring the Pages Functions/D1 backend**.

- [Local .NET development](local-development.md) — PostgreSQL and EF Core.
- [API container hosting](api-container-hosting.md), [Railway/Neon options](railway-neon-deployment.md), [database migrations](database-migrations.md).
- [Cloudflare API proxy](cloudflare-api-proxy.md) and [production API readiness](production-api-readiness.md) — only the optional catalog/API_ORIGIN proxy track.
- [Legacy .NET Stripe test-mode design](stripe-test-mode.md) and [Stripe test checkout](stripe-test-checkout.md) — do not confuse `Payments__TestEnabled` with active Pages `STRIPE_CHECKOUT_TEST_ENABLED`.

## Operational safety

Never paste API keys, Access JWTs, customer records, quote tokens or provider message bodies into docs, PR comments or CI artifacts. Use protected GitHub environment secrets; verify Preview/Production D1 separation before every staging write. The deployment and production migration workflows are **not** interchangeable.

The [P0 acceptance issue #111](https://github.com/poker-kid-100717/northstar-software-studio/issues/111) is the source of truth for missing edge Access policy, signed webhook replay, and final closeout. Use the actual recorded run links before describing a feature as production-ready.
