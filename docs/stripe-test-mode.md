# Stripe test mode — incomplete integration

This branch introduces a Stripe-signature-verified webhook skeleton and a checkout route that **refuses to create a payment** until transactional capacity reservation, persistent pending orders and session creation are implemented. The route also rejects non-test secret keys.

Do not turn Payments:Enabled on until a full reservation/expiration implementation, concurrency tests, order ownership, and verified end-to-end Stripe test runs are complete. Webhook must be registered to the deployed HTTPS endpoint; configure Stripe:WebhookSecret through secure environment secrets only.

No payment details or live credentials belong in source control. The product seed has PaymentEligible=false.
