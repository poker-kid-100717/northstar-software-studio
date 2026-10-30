# P0 staging acceptance — evidence and remaining gates

Tracking: [issue #111](https://github.com/poker-kid-100717/northstar-software-studio/issues/111) and [commercial launch #113](https://github.com/poker-kid-100717/northstar-software-studio/issues/113). **This is not permission to enable live Stripe charges or alter Production.**

## Last documented state — October 30, 2026 UTC

| Gate | State | Evidence |
| --- | --- | --- |
| Preview D1 isolated from Production | **PASS** | [protected Preview deployment](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/40993400497), [Resend settings preflight](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/40993180704) |
| Staging business/quote/Stripe TEST payment workflow | **PASS** | [staging E2E](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/40993469083) |
| Resend synthetic inquiry and independent provider delivery | **PASS** | [protected staging Resend run](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/40993539074); provider record matching inquiry reference (metadata in #111) |
| Protected GitHub staging environment | **PASS for current workflow execution** | Staging workflows used protected `northstar-staging` secrets |
| Dedicated edge Cloudflare Access application / exact owner-only allow policy | **BLOCKED / NOT VERIFIED** | [Access inventory audit](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/40984995283) found no application in the configured account |
| Signed Stripe TEST duplicate webhook replay against staging D1 | **NOT VERIFIED** | [PR #156](https://github.com/poker-kid-100717/northstar-software-studio/pull/156) adds tests/hardening; do not treat open source PR as deployed |
| Separate production read-only schema + smoke evidence | **NEEDS FINAL CLOSEOUT RECORD** | [production smoke workflow](../.github/workflows/smoke-production-storefront.yml), [production D1 validation](d1-migration-validation.md) |

**A passing staging workflow is not the same as provider delivery or a configured Access edge application.** Resend was verified independently; Access remains the critical unresolved security gate.

## Remaining work

1. Review [owner Access protection matrix](../web/ADMIN_SECURITY_VERIFICATION.md). Confirm account, create/verify a dedicated **Preview-only** Access application protecting `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*` for the single owner. The signed Stripe webhook endpoint **must remain reachable without edge Access login**. [Protected Access bootstrap workflow](../.github/workflows/configure-northstar-owner-access.yml) supports a dry-run and a guarded apply.
2. Access applications have distinct JWT **audiences**. Coordinate the protected `STAGING_CF_ACCESS_JWT` identity credential and **Preview-only** `CF_ACCESS_AUD` with the new app. Do not blindly change the audience: doing so can break quote/admin tests and Turnstile staging test safety checks. Repeat negative anonymous/non-owner tests.
3. Demonstrate a duplicate signed Stripe TEST webhook delivery against staging D1. Verify one `payment_confirmed` transition for the exact matching order and no mutation to unrelated orders. Review the unmerged [webhook hardening](https://github.com/poker-kid-100717/northstar-software-studio/pull/156), [test extraction](https://github.com/poker-kid-100717/northstar-software-studio/pull/159) and [Preview-only deployment](https://github.com/poker-kid-100717/northstar-software-studio/pull/161) before choosing a safe release path.
4. Run/confirm independent **read-only production** D1 schema + storefront smoke. Log the exact workflow URLs and commit SHA in #111. No synthetic production records or live payment tests.
5. Close #111 **only** after all rows above pass with evidence and any staging synthetic test data has a documented cleanup/retention approach.

## Operational rules

- Preview `INQUIRIES_DB`: `042bf88c-090e-43bd-969a-ff0f7d2feebd`; Production must be a different D1 database. Always re-verify at operation time.
- Resend Preview: `RESEND_API_KEY` as an encrypted secret; `CONSULTATION_FROM_EMAIL` as Preview text. Protect notifications and never print recipient data/provider body in logs.
- Stripe: TEST keys only; signed events set D1 payment state, not redirects. No live payment activation.
- Staging tests require protected `NORTHSTAR_STAGING_URL`, `STAGING_CF_ACCESS_JWT`, `STAGING_TURNSTILE_TEST_TOKEN` and, for relevant quote workflows, a fresh single-use test token. Never publish secret values.
- Don't run the production D1 migration apply or deployment as part of a staging-only documentation task.
