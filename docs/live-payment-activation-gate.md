# P5: live-payment activation gate (currently disabled)

## Status

**No approval to enable live Stripe payments exists.** The active Pages checkout
handler accepts `sk_test_` keys only; the webhook accepts signed Stripe TEST
events with `livemode: false`. This document and its CI regression are a
preparation checklist, not a live Stripe feature or launch sign-off.

## Separate approvals and evidence required

- [ ] Beta #111 closed with current passing isolated staging inquiry/admin/quote
  E2E, Resend provider delivery and mailbox receipt, and read-only production checks.
- [ ] Full Stripe TEST payment + signed webhook persisted in the exact order,
  duplicate/reordered/refund handling, and authenticated reconciliation verified.
- [ ] Customer-facing service terms, pricing, eligibility, support, cancellation,
  refund policy, customer notices and privacy/retention reviewed.
- [ ] Paid fulfillment workflow, identity/authorization, deliverable tracking,
  customer confirmation and notification retries implemented and rehearsed.
- [ ] Production logging/alerts, incident response, data backup/recovery,
  Stripe account status and tax/legal requirements assessed.
- [ ] Separate payment provider credentials/configuration for production
  provisioned **only after explicit owner approval**, with rollback documented.
- [ ] Reviewed, manually approved production change enabling payment handling.
  Verify live charges explicitly remain disabled before that approval.

## Invariants

A test-only endpoint must never accept `sk_live_` or process Stripe events with
`livemode: true`, even when test feature flags are enabled. The
`tests/live-payment-gates.test.mjs` regression checks those invariants using
synthetic credentials. It does not certify future live-payment implementation.

Do not add live keys, customer payment details, session cookies, or webhook secrets
to GitHub code, PR descriptions, logs, screenshots or ChatGPT messages.
Keep any future live implementation in a separate reviewed change with an
explicit owner go/no-go and testable emergency disable mechanism.
