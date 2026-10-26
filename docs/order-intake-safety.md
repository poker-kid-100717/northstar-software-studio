# Intake safety gate
This branch introduces a **preview-only** order-intake form and server-side validation. The endpoint returns a quoted price and a disclaimer but deliberately does not persist customer information, create orders, reserve capacity, or collect payments. This avoids accidentally treating unverified submissions as paid orders. Do not use this form for real customer requests.

Production requires atomic capacity reservation, Stripe Checkout sessions with metadata, signed and idempotent webhook processing, secure private uploads, privacy disclosures, authenticated admin, email notifications, and verified refunds. Do not enable payment eligibility before those controls are implemented.
