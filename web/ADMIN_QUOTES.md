# Admin quote drafts — PR for #79

Authenticated Cloudflare Access admin endpoints:
- `GET /api/admin/quotes?inquiryId=<uuid>` lists up to 50 quotes for one inquiry.
- `POST /api/admin/quotes` creates a draft; JSON body `{ "inquiryId": "<uuid>", "serviceName": "Quick fix", "deliverables": "Agreed work", "exclusions": "", "amountCents": 5000 }`.

Both require the same Access JWT authorization as inquiry admin endpoints. POST validates same-origin requests and strict size/field limits. It writes the draft and `commerce_events` record atomically using D1 `batch`. No customer-facing links, approval, checkout, or payment collection are implemented.

**Dependency:** Apply migration 0003 to the bound D1 environment before deploying this API. If missing, the endpoint returns 503; it does not silently create tables.

**Next PR:** approval state transitions with expiry, optimistic concurrency/version check, immutable approved quotes, and tests; follow with quote delivery and acceptance. Do not accept payments before these controls and Stripe verification are ready.
