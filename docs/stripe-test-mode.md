# Stripe test mode — incomplete integration

> **Legacy .NET track:** The `Payments:TestEnabled` and `Stripe:WebhookSecret` settings described below apply to the ASP.NET Core/PostgreSQL prototype, **not** the deployed Pages Functions/D1 Stripe TEST endpoints. Pages uses `STRIPE_CHECKOUT_TEST_ENABLED`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. As of October 30, 2026, staging paid/MATCH acceptance passed; separate duplicate-event replay and edge Access checks remain open in [#111](https://github.com/poker-kid-100717/northstar-software-studio/issues/111).

This branch introduces a Stripe-signature-verified webhook skeleton and a checkout route that **refuses to create a payment** until transactional capacity reservation, persistent pending orders and session creation are implemented. The route also rejects non-test secret keys.

Do not turn Payments:Enabled on until a full reservation/expiration implementation, concurrency tests, order ownership, and verified end-to-end Stripe test runs are complete. Webhook must be registered to the deployed HTTPS endpoint; configure Stripe:WebhookSecret through secure environment secrets only.

No payment details or live credentials belong in source control. The product seed has PaymentEligible=false.
