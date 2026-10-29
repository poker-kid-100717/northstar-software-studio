# P0 staging readiness and acceptance runbook

Tracks #111 and #113. **No production changes or live Stripe charges are authorized by this runbook.**

## Stage 1: establish isolated resources (required before running acceptance)
- [ ] Confirm Cloudflare Pages Preview `INQUIRIES_DB` points to D1 `042bf88c-090e-43bd-969a-ff0f7d2feebd`; record production database ID privately and verify it differs.
- [ ] Confirm a dedicated staging Cloudflare Access app, audience, allowed owner identity, and staging-only hostname. Never use production Access audience.
- [ ] Review `scripts/Configure-NorthstarStaging.ps1` in default dry-run mode; apply only after identity and bindings are confirmed. It requires a scoped Pages API token, not one committed to Git.
- [ ] Deploy staging preview branch and inspect active Preview variables without printing secrets.
- [ ] Create protected GitHub environment `northstar-staging` with approval rules, `NORTHSTAR_STAGING_URL` variable and `STAGING_CF_ACCESS_JWT`, `STAGING_TURNSTILE_TEST_TOKEN`, `STAGING_QUOTE_TOKEN` secrets. Keep all separate from production.

## Stage 2: prepare single-use synthetic test
- [ ] Create and send an approved synthetic quote on staging D1; record its fresh 64-character hex acceptance token **only** in protected environment secrets. Acceptance can occur only once, but the token remains a sensitive read credential until expiry. Keep it protected after acceptance and seed a fresh quote/token for each rerun.
- [ ] Use staging-only Resend configuration and a mailbox authorized to receive test mail; do not use real customer email addresses.
- [ ] Run `.github/workflows/staging-e2e-acceptance.yml` via manual workflow dispatch. Save run URL, timestamp, commit SHA, outcome and non-sensitive failure details in #111.
- [ ] Verify synthetic inquiry persisted and is visible to authenticated admin, quote accepted once, replay rejected with HTTP 409 and `QUOTE_CONFLICT`, and notification state durable. PR #115 adds the automated replay assertion; until it is merged, record a separate staging POST using the same token and original expectedVersion and verify that exact response.
- [ ] Verify **actual Resend delivery** separately with provider event status and a staging mailbox receipt; a successful workflow alone is not delivery evidence.

## Stage 3: independent production read-only checks
- [ ] Confirm production D1 binding differs from staging and perform read-only schema validation.
- [ ] Check production health and public pages without writing records or enabling payments.
- [ ] Document rollback and cleanup of synthetic staging records.

## Evidence / decision record
| Check | Result | Evidence URL / date |
|---|---|---|
| Preview vs production D1 separation | Pending | |
| Staging Access and environment protection | Pending | |
| Manual E2E workflow | Pending | |
| Resend provider delivery and mailbox receipt | Pending | |
| Production read-only smoke | Pending | |

Do not close #111 until every required row is supported by evidence. Do not label production payment-ready until Stripe replay/concurrency, refund, reconciliation, out-of-order events and test-mode checkout are validated. Explicit owner approval is required before any live charges.
