# Stripe test checkout

> **Legacy .NET track:** This document describes the `src/Northstar.Api`/PostgreSQL Stripe test integration, not the active `web/functions/api/checkout/session.ts` and D1 webhook flow. For the deployed Pages TEST checkout, see [README](../README.md), [Stripe reconciliation](stripe-reconciliation-runbook.md) and [P0 staging readiness](p0-staging-readiness.md).

This branch introduces persisted orders and Stripe **test** Checkout Sessions. It never accepts live keys. Default Payments:TestEnabled is false and all seeded products remain PaymentEligible=false. Configure Stripe__SecretKey, Stripe__WebhookSecret, Payments__PublicOrigin and Payments__TestEnabled via environment variables; explicitly mark a product PaymentEligible in the database after reviewing capacity.

Checkout uses a PostgreSQL transaction-scoped advisory lock around capacity checks and order creation, persists the order before requesting a hosted Stripe session, and commits the order/session atomically. Session expiry is 30 minutes. Stripe webhook validates signature and timestamp, event uniqueness, session ID, amount, and livemode=false. Delayed paid events for expired reservations are flagged RequiresPaymentReview for manual reconciliation; do not fulfill automatically.

**Limitations before production:** No owner authentication/dashboard, refunds, customer notices, automated reconciliation for abandoned sessions, or versioned production migrations. Local development currently uses EnsureCreated and must not be treated as a production migration strategy. Keep Payments:TestEnabled=false outside controlled test environments. Do not collect real customer data.
