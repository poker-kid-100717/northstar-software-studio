# Consultation inquiry abuse protection (issue #36)

The inquiry endpoint now **fails closed** unless all of these Cloudflare Pages bindings are configured in the deployed environment:

- `RESEND_API_KEY` — secret API key from Resend.
- `CONSULTATION_FROM_EMAIL` — verified sender address.
- `TURNSTILE_SITE_KEY` — public site key for the actual Pages domain.
- `TURNSTILE_SECRET_KEY` — secret key matching the site key.
- Optional: a Cloudflare WAF rate limiting rule on POST `/api/consultation-inquiries` (if available on your plan). Pages does not expose the native Worker rate limiting binding in this project.

**Important:** The application is designed to refuse submissions with HTTP 503 until these are provisioned. Deploy the bindings before merging or deploying this change to an actively used inquiry form. The website loads the public site key from GET `/api/consultation-inquiries`; no Turnstile secret is exposed to the browser.

Security behavior:
- Requires a valid Turnstile token and checks the verified hostname against the request host.
- Requires Turnstile verification; configure an edge WAF rate limiting rule separately when supported. Turnstile alone is **not** rate limiting.
- Rejects missing Turnstile configuration; does not require an unavailable Pages binding.
- Keeps the honeypot, strict JSON body size, enum and email validation.
- Does not log inquiry content, secrets, IPs, or Turnstile responses.

Validation checklist:
1. Configure Turnstile widget for the production Pages hostname and preview hostnames only when explicitly intended.
2. Check whether Cloudflare WAF rate limiting rules are available for the Pages hostname; if not, document that rate limiting remains an open follow-up.
3. Verify normal inquiry (valid challenge) delivers exactly one email.
4. Verify missing token, invalid token, and wrong hostname return 400/403 without email delivery.
5. If a WAF rate limit rule is configured, verify the edge blocks excess requests; otherwise do not claim rate limiting is active.
6. Verify mobile and keyboard access, expired token retry, and the consultation form's failure messaging.
7. Review Cloudflare WAF/Turnstile analytics without storing private inquiry text.

Payment enablement is **not** part of this issue.
