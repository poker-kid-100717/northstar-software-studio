# Stripe test-mode reconciliation and incident runbook

**Scope:** Northstar Cloudflare Pages + D1 test-mode checkout. **Do not enable live payments based on this document.** No customer data or secrets belong in logs, issues, or screenshots.

## Invariants

- Browser redirects, customer claims, and checkout creation never set `service_orders.status='paid'`.
- Only a verified Stripe webhook can transition an awaiting-payment order to paid.
- Match Stripe checkout session ID, order ID, payment intent, amount (integer cents), currency and test-mode status.
- Treat every webhook as at-least-once delivery. Duplicates must never create another fulfillment or audit transition.
- Never mark refunded without confirmed Stripe refund evidence and a reviewed state transition.

## Daily test-mode reconciliation

1. Use Stripe **test mode** dashboard and the correct staging D1 binding. Do not paste API keys or full customer information into a ticket.
2. Query orders with `status='awaiting_payment'` and a non-null `provider_checkout_session_id`, ordered oldest first. Record only order ID, session ID and timestamps.
2a. Separately query orders marked `paid` but not yet fulfilled, and verify the provider session remains paid and its payment intent has no refund or dispute. Pause fulfillment and investigate any mismatch. Do not infer Stripe state from D1 alone.
3. Retrieve each matching session **from Stripe** using a secret stored in the runtime, not browser input. Verify `livemode=false`, `payment_status=paid`, matching `client_reference_id`, `metadata.order_id`, `amount_total`, `currency`, and payment intent.
4. Compare against `payment_webhook_events` and `commerce_events`. A paid session without a paid order is an exception; investigate webhook delivery and endpoint configuration.
5. Use Stripe's supported event redelivery/retry tooling for the exact signed event after fixing the cause. **Do not manually UPDATE the order to paid** or synthesize a webhook signature.
6. Re-query the order and confirm one `payment_confirmed` audit event and one `paid_at` timestamp. Document the exception without personal information.
7. Escalate ambiguous payment intents, mismatched amounts, refunds, disputed payments, or stale orders for manual investigation. Do not unlock fulfillment.

## Safe read-only D1 checks

```sql
SELECT id, status, amount_cents, currency, provider_checkout_session_id,
       provider_payment_intent_id, paid_at, updated_at
FROM service_orders
WHERE provider_checkout_session_id IS NOT NULL AND status='awaiting_payment'
ORDER BY updated_at ASC LIMIT 100;

-- Separate second pass: verify locally paid but unfulfilled orders with Stripe.
-- Confirm which statuses denote fulfillment before changing this predicate.
SELECT id, status, amount_cents, currency, provider_checkout_session_id,
       provider_payment_intent_id, paid_at, updated_at
FROM service_orders
WHERE status='paid' AND provider_checkout_session_id IS NOT NULL
ORDER BY paid_at ASC LIMIT 100;

SELECT provider_event_id, event_type, order_id, received_at, processed_at
FROM payment_webhook_events
WHERE processed_at IS NULL
ORDER BY received_at ASC LIMIT 100;

SELECT entity_id, event_type, old_status, new_status, created_at
FROM commerce_events
WHERE entity_type='order' AND event_type='payment_confirmed'
ORDER BY created_at DESC LIMIT 100;
```

## Failure scenarios

| Symptom | Response |
| --- | --- |
| Signature rejected | Check endpoint secret, raw-body handling, clock skew and Stripe endpoint mapping. Never bypass verification. |
| Provider retries | Expect duplicates; verify only one payment transition and one audit entry. |
| Paid in Stripe, awaiting in D1 | Inspect signed delivery logs, then redeliver the original event and recheck. |
| D1 paid, Stripe unpaid | Stop fulfillment and investigate immediately. Do not trust local state without provider confirmation. |
| Refund or chargeback | Stop automatic fulfillment and handle as an exception until refund/dispute event support and audit are implemented. |
| Checkout session expired | Do not reuse it or manually mark paid; review quote validity before a new session. |

## Production launch blockers

- Automated concurrency/replay tests with real D1 semantics, including duplicate event IDs and different event IDs for one session.
- Safe automated reconciliation job with Stripe API verification and least-privilege credentials.
- Verified handling of refunds, disputes, out-of-order events and asynchronous payment failures.
- End-to-end Stripe test-mode checkout + signed webhook staging evidence, CI green, operational alerting and owner sign-off.
- Explicit approval before enabling any live-payment feature flag.
