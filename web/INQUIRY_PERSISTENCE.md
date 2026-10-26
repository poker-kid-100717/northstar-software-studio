# Consultation inquiry persistence (D1) — Phase 1

This change introduces **optional** Cloudflare D1 persistence. Existing email-only production submissions continue to work until the database is provisioned and bound. Do not advertise a durable inquiry history before the binding is active.

## Provisioning (manual Cloudflare action)
1. Cloudflare dashboard → Storage & databases → D1 → Create database named `northstar-inquiries`.
2. Execute `web/migrations/0001_consultation_inquiries.sql` against that database (dashboard console or Wrangler D1 execute).
3. Pages → northstar-software-studio → Settings → Bindings → Add D1 database binding. Variable name: `INQUIRIES_DB`; choose `northstar-inquiries`. Set it for production and preview separately if needed.
4. Redeploy Pages after binding. Submit a test inquiry and verify its row exists in D1 and notification_status becomes sent. Do not post customer PII in GitHub issues or CI logs.

## Semantics
- When D1 is bound, a validated, Turnstile-verified inquiry is saved **before** email notification. A DB failure returns HTTP 503 and does not send email.
- When email fails after successful storage, response is `ok: true, notification: pending`; the record remains available for future recovery. This is **not** proof of delivery.
- Without a binding, the original email-only behavior remains. The response reports `stored: false`.
- No public list/detail endpoint is exposed. Owner authentication and admin UI are separate follow-up work.
- Pending notifications are **not automatically retried yet**. Do not rely on the dashboard for alerts until the retry/administration PR is merged.
- Treat inquiry data as personal information: least-privilege database access, defined retention, and deletion workflows are prerequisites for broad launch.
