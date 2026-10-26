# Secure commerce foundation (migration 0003)

This migration adds **data structures only**. It does not enable payments, create checkout sessions, or modify the public consultation form.

## Deployment

1. Back up the existing `northstar-inquiries` D1 database.
2. Apply `web/migrations/0003_commerce_foundation.sql` to the intended D1 environment (preview first, then production) using the existing Cloudflare deployment process.
3. Verify the four new tables and indexes exist; confirm existing inquiry submissions still work.
4. Do not enable any payment endpoint until the remaining PRs and test-mode end-to-end checks are complete.

## Intended lifecycle

- A customer submits an **inquiry** (no purchase).
- Each order has a `consult` flag: `1` means consultation; `0` means another service. SQLite stores this bit as an INTEGER constrained to 0 or 1; the default is 0. The order-creation API must set it deliberately for consultation orders.
- An administrator creates a **draft quote**, explicitly approves its deliverables, exclusions, amount in USD cents and expiry, and sends it.
- A customer accepts an unexpired approved quote. A single order is then created for the immutable accepted quote version.
- Payment is performed through Stripe-hosted checkout **only after** server-side price/quote verification. A signed, deduplicated Stripe webhook is the source of truth for paid status.
- Delivery and revisions are tracked against the order, with audit events.

## Engineering invariants for upcoming PRs

- Never trust prices, quote status, or payment status from client input.
- The order amount must match the approved accepted quote amount; enforce in the server transaction before creating an order or checkout.
- Once approved/sent/accepted, quote pricing and deliverables are immutable. Revisions require a new quote ID/version.
- Use D1 atomic batches for state changes and `commerce_events` inserts.
- Enforce legal status transitions in application code with conditional updates; reject stale writes.
- Only mark paid after verifying the Stripe webhook signature and checking expected account, currency, amount, order ID, and payment state.
- Insert webhook event IDs idempotently; do not mark processed before the order transition succeeds.
- Keep customer-facing quote links opaque, expiring, and appropriately authenticated/authorized.
- No secrets, card numbers, protected health information, or credentials in D1 or audit details.
- Refund handling, tax requirements, and customer terms must be finalized before production checkout.

## Current limits

SQLite constraints cannot independently validate cross-table quote/order amounts or guarantee an audit insert accompanies a state update. These must be enforced by the future API transaction and integration tests. This migration alone is **not** a production-ready payment system.
