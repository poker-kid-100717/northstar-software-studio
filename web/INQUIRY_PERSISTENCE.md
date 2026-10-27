# Consultation inquiry persistence (D1) — Phase 1

D1 storage is **required** for accepting inquiries after this change. Deploy only after the database and binding are provisioned. The endpoint returns HTTP 503 rather than silently accepting email-only inquiries when D1 is missing or a write fails.

## Provisioning (manual Cloudflare action)
1. Cloudflare dashboard → Storage & databases → D1 → Create database named `northstar-inquiries`.
2. Execute `web/migrations/0001_consultation_inquiries.sql` against that database (dashboard console or Wrangler D1 execute).
3. Pages → northstar-software-studio → Settings → Bindings → Add D1 database binding. Variable name: `INQUIRIES_DB`; choose `northstar-inquiries`. Set it for production and preview separately if needed.
4. Redeploy Pages after binding. Submit a test inquiry and verify its row exists in D1 and notification_status becomes sent. Do not post customer PII in GitHub issues or CI logs.

## Semantics
- When D1 is bound, a validated, Turnstile-verified inquiry is saved **before** email notification. A DB failure returns HTTP 503 and does not send email.
- When email fails after successful storage, response is `ok: true, notification: pending`; the record remains available for future recovery. This is **not** proof of delivery.
- Without a D1 binding, POST fails closed with HTTP 503 and no notification is sent. A missing Resend key after successful persistence records a pending notification instead of discarding the inquiry.
- No public list/detail endpoint is exposed. Owner authentication and admin UI are separate follow-up work.
- Pending notifications are **not automatically retried yet**. Do not rely on the dashboard for alerts until the retry/administration PR is merged.
- Treat inquiry data as personal information: least-privilege database access, defined retention, and deletion workflows are prerequisites for broad launch.

## Deployment gate for durable-only intake
Before deploying this PR, verify `INQUIRIES_DB` exists in **both** intended environments and migration `0001` is applied. Test a D1 write, temporarily disable the Resend sender in preview, and confirm the API returns a stored reference with `notification: pending`. Confirm a missing binding or failed database write returns 503 and does **not** send email. Keep this PR unmerged until preview checks pass. Roll back the deployment if D1 is unavailable; do not revert to email-only acceptance.
