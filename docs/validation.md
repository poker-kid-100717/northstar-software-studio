# Source, staging and production validation

## Local + pull request checks

[Validate Northstar](../.github/workflows/validate.yml) runs Angular/Pages Functions checks, inquiry security and payment tests, catalog parity, a .NET build, PostgreSQL integration tests and browser accessibility checks. [Validate D1 migrations](../.github/workflows/validate-d1-migrations.yml) covers D1 migration upgrade compatibility without production writes.

~~~bash
cd web
npm ci
npm run typecheck:functions
npm test
npm run build -- --configuration production
npm run test:e2e
~~~

A passing CI build does **not** prove that cloud resources, Access policies or provider delivery work.

## Staging Preview

The protected [Preview deployment](../.github/workflows/deploy-staging-preview.yml) checks the D1 binding separation. A successful deploy triggers [staging end-to-end acceptance](../.github/workflows/staging-e2e-acceptance.yml), which tests synthetic inquiry, owner access, quotes, and hosted Stripe **TEST** Checkout/webhook behavior. The separate [Resend verification](../.github/workflows/verify-staging-resend-delivery.yml) checks synthetic notification state. Always confirm the **same reference** has a provider status of `delivered`, not merely queued/sent.

At the October 30, 2026 UTC documentation update, [staging acceptance](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/40993469083) and [Resend acceptance](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/40993539074) had passed. These do **not** close [P0 issue #111](https://github.com/poker-kid-100717/northstar-software-studio/issues/111) until the dedicated edge Access owner policy and signed duplicate-event replay are verified.

## Production boundaries

- Changes to `web/**` merged into `main` match the **production** [Pages deploy workflow](../.github/workflows/deploy-cloudflare-pages.yml) as well as the staging workflow; review the blast radius before merging.
- Production D1 schema checks are read-only unless an explicitly authorized protected migration workflow is run.
- [Production acceptance](../.github/workflows/production-acceptance.yml) and [production smoke](../.github/workflows/smoke-production-storefront.yml) are read-only and cannot authorize live payment collection.
- Documentation-only updates do not trigger either Pages deploy path filter.

For review and release rules see [CONTRIBUTING](../CONTRIBUTING.md).
