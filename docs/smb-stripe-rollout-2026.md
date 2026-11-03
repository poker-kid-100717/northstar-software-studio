# SMB fixed-price Stripe rollout (November 2026)

## Proposed storefront
- $25: Website Quick Update; Google Review QR Kit.
- $50: Google Business Profile Cleanup; Contact and Booking Button Setup.
- $100: Local Visibility Starter; Website Lead Capture Setup.
- $250+: template-based one-page website, **inquiry and custom quote only**.
- Existing developer-focused fixes remain available, but storefront positioning emphasizes local businesses.

## Critical implementation gap
The new Angular catalog is a **display-layer change only**. The existing customer intake calls `/api/checkout/test`, while the deployed Stripe Checkout endpoint `/api/checkout/session` requires owner authentication, an accepted quote token, and Stripe test keys. The current catalog's $25 prices must not be treated as an authoritative server-side charge amount. Existing API/product seed, parity checks, and the checkout workflow must be updated together before accepting orders. Do not enable public checkout or live payments based on this branch.

## Required follow-up before merge/deployment
1. Add canonical catalog entries and server-side prices to active D1/Pages Functions, and reconcile .NET seed and catalog parity checks.
2. Build a public order-intake path with spam protection, customer confirmation, server-side product lookup, scope review, capacity limits and idempotency.
3. Create owner-approved quotes/orders and customer Stripe TEST Checkout sessions; server must determine amount, currency, order ID and service name. Keep live mode disabled.
4. Persist webhook-verified payment state independently of fulfillment, handle duplicate/out-of-order signed events, refunds, reconciliation, and failed checkout.
5. Add $250+ website inquiry/quote flow without an upfront charge.
6. Test catalog prices, customer journey, owner dashboard, Stripe TEST checkout, webhook signature/duplicates, D1 isolation, and Resend notifications.
7. Verify staging and production deployment workflows before merge; changes to web/ can trigger production deployment. Require separate explicit approval before live Stripe charging.

## Customer-facing scope
One agreed deliverable, one revision, existing access, no guaranteed search rankings or lead volume. Never collect passwords or API keys in forms. External provider subscriptions and major migrations excluded.
