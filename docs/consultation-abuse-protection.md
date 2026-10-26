# Consultation inquiry abuse protection (issue #36)

The inquiry endpoint now **fails closed** unless all of these Cloudflare Pages bindings are configured in the deployed environment:

- `RESEND_API_KEY` — secret API key from Resend.
- `CONSULTATION_FROM_EMAIL` — verified sender address.
- `TURNSTILE_SITE_KEY` — public site key for the actual Pages domain.
- `TURNSTILE_SECRET_KEY` — secret key matching the site key.
- `INQUIRY_RATE_LIMITER` — Cloudflare native rate limiting binding; use a small per-IP quota (recommended 5 requests per 10 minutes, or the nearest supported policy).

**Important:** The application is designed to refuse submissions with HTTP 503 until these are provisioned. Deploy the bindings before merging or deploying this change to an actively used inquiry form. The website loads the public site key from GET `/api/consultation-inquiries`; no Turnstile secret is exposed to the browser.

Security behavior:
- Requires a valid Turnstile token and checks the verified hostname against the request host.
- Limits submissions by `CF-Connecting-IP` using the Cloudflare rate limiting binding.
- Rejects missing rate-limit binding or untrusted client IP; does not silently bypass protections.
- Keeps the honeypot, strict JSON body size, enum and email validation.
- Does not log inquiry content, secrets, IPs, or Turnstile responses.

Validation checklist:
1. Configure Turnstile widget for the production Pages hostname and preview hostnames only when explicitly intended.
2. Configure rate limiting binding in Cloudflare Pages for both preview and production as needed.
3. Verify normal inquiry (valid challenge) delivers exactly one email.
4. Verify missing token, invalid token, and wrong hostname return 400/403 without email delivery.
5. Verify 429 when rate limit is exceeded, and 503 if the binding is unavailable.
6. Verify mobile and keyboard access, expired token retry, and the consultation form's failure messaging.
7. Review Cloudflare WAF/Turnstile analytics without storing private inquiry text.

Payment enablement is **not** part of this issue.
