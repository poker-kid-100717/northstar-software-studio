# Northstar launch checklist (as of 2026-11-02)

Code for the storefront, quoting, Stripe TEST checkout, webhook, refund reconciliation, owner orders and notification outbox is merged. What remains is **owner action and evidence**. Nothing here authorizes live charges. Never put secrets, JWTs or customer data in issues, PRs or logs.

## A. Owner actions (an agent cannot do these)

| # | Action | Where | Closes / unblocks |
|---|--------|-------|-------------------|
| 1 | Approve the two waiting runs for the protected `northstar-staging` environment: [Access diagnostic](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/41266882993) and [Pages/D1 isolation check](https://github.com/poker-kid-100717/northstar-software-studio/actions/runs/41266926702) | GitHub → Actions → run → Review deployments | #111 prerequisites |
| 2 | Create or verify the **staging Cloudflare Access application** covering `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*` (owner email only; keep `/api/stripe/webhook` and public routes outside it) | Cloudflare Zero Trust | #111, #57 |
| 3 | Add `charge.refunded` to the **TEST** Stripe webhook for `/api/stripe/webhook` | Stripe dashboard (test mode) | refund acceptance (#82) |
| 4 | Set protected-environment secrets: `STAGING_CF_ACCESS_JWT`, `STAGING_TURNSTILE_TEST_TOKEN`, a freshly seeded single-use `STAGING_QUOTE_TOKEN`, `NORTHSTAR_STAGING_URL` | GitHub → Settings → Environments → `northstar-staging` | staging E2E |
| 5 | Decide fulfillment, refund, privacy-retention and support policies (#38, #64, #63) | docs / owner | #84 review item |
| 6 | Explicit written sign-off before enabling any production payment flag (see `docs/live-payment-activation-gate.md`) | owner | #84, #113 |

## B. Evidence runs (agent can run once A1-A4 are done)

1. Trigger `staging-e2e-acceptance.yml`; capture inquiry → admin read-back → quote acceptance. Reseed the quote token before each rerun.
2. Complete hosted Stripe **TEST** Checkout; reconcile order, webhook event and audit row (exactly one transition).
3. Send a signed duplicate webhook; confirm no second transition. Send `charge.refunded`; confirm refund reconciliation.
4. Correlate a fresh notification with Resend delivery and mailbox receipt (metadata only in artifacts).
5. Run the read-only production schema and smoke gates ([production acceptance](production-acceptance.md)). Never point staging tests at production.
6. Record run links and dates on #111, then close it.

## C. Remaining code work

- #25: stable service-ID mapping and per-service deep links (category mapping from FixIQ shipped).
- #21 / #22: authoritative backend catalog and service-to-order traceability, only if the .NET track is to be hosted. The storefront does not need it.

## D. Commercial validation (#113)

Not code. Define one ICP, publish the scoped offers, instrument the funnel, build a 30-prospect list, and obtain 2 paid engagements before more feature work.

## Issue triage

| Likely closable after evidence in B | Needs owner decision | Keep open |
|---|---|---|
| #57, #58-#62, #78-#83 (verify each against merged code first) | #38, #63, #64, #84 | #113, #66, #39 |
