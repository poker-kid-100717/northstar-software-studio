# Inquiry lifecycle operations (#48)

## Deploy and verify

Production Pages builds run from `web/`; `web/functions` is the authoritative implementation. The legacy root intake file re-exports it to prevent accidental email-only acceptance.

1. Export/back up the dedicated D1 database and record the deployment commit. Use a staging D1 database and Turnstile test configuration for the first rehearsal. Apply migrations 0001–0004 in order if absent, then apply `web/migrations/0005_inquiry_lifecycle.sql` and `0006_inquiry_audit_actor.sql` once in order. ALTER COLUMN additions are deliberately not repeatable; use the D1 migration ledger where provisioned, and reconcile manual provisioning before adopting it.
2. Bind `INQUIRIES_DB`. Configure `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and the single owner's `CF_ACCESS_ADMIN_EMAIL`. Use a dedicated Access application with an explicit owner email allow policy on both `/admin*` and `/api/admin/*`, including previews. No shared service credentials or public record endpoints.
3. Configure `RESEND_API_KEY`, verified `CONSULTATION_FROM_EMAIL`, and optional `CONSULTATION_NOTIFY_EMAIL`. A missing/broken email configuration leaves a durable failed notification; missing storage or verification rejects intake.
4. After deploying code, submit synthetic data. Confirm the reference exists in D1, status/notes/follow-up work, anonymous and wrong-owner requests fail, and cross-origin updates fail. Simulate an email outage in staging: intake must save once, including concurrent submissions with one UUID Idempotency-Key; changing the body with that key returns 409.
5. Restore email, make the staging row due, then use **Retry due notifications**. Confirm one notification, sent state, and no second send. Type checks and offline database/security tests run in Validate Northstar; they do not prove live Cloudflare Access, D1 bindings or provider delivery.

## Retry and monitoring

The inquiry row is the durable outbox. An atomic two-minute lease coordinates intake and retries. Each delivery uses the stable provider idempotency key `inquiry/<reference>`. Failed attempts become due after one hour. The owner-only JSON POST `/api/admin/inquiries/retry` processes at most five due rows (up to 50 seconds); use the dashboard button until no rows are due. This PR does not provision a background scheduler. Check the dashboard daily and during an email outage. Automated production scheduling and provider operational readiness belong to #50.

Retries stop at eight attempts or 23 hours after creation, within Resend's 24-hour idempotency window. Older or exhausted records remain visible for owner reconciliation, never automatically discarded or resent. Before contacting the customer or manually resending, check provider delivery by reference; never reset the counter or reuse an expired provider deduplication window without reconciling. A lease lost after provider success may temporarily show pending; recovery reuses the same key. The original accepted request remains successful even if updating delivery state fails.

Monitor counts by `notification_status`, `notification_attempts`, and due leases. The dashboard exposes attempt count and a redacted error code. Investigate failed rows, aged pending rows, and spikes in 429/503. Log only route, status, aggregate counts and opaque reference; never dump bodies, headers, tokens, email content, provider responses or Access assertions.

Intake enforces 12 KB streamed bodies, validated lengths/enums, verified hostname and ten attempts per IP per UTC hour. Only a secret-keyed hourly IP digest is retained, expiring after two hours and pruned on subsequent requests. Shared networks can reach the limit; the form should ask users to retry later. Configure an edge WAF limit as an additional control when available. Owner mutations require explicit same-origin JSON and valid signed Access claims; internal non-browser callers must supply the same origin.

## Triage and privacy

Server search (including description and selected service), status filter, chronological/follow-up sorting and 50-record paging cover all records. Opening details marks read. Same normalized email flags possible duplicates for human review; it never discards separate customer requests. Status changes and their actor are atomically audited by a database trigger. Migration 0006 consumes actor attribution after each status/follow-up operation, so later direct database writes record system unless that operation explicitly supplies its actor; previous audit events remain unchanged. Failed conditional deletion does not leave a stale actor. Private notes use parameterized statements. Follow-up changes have a separate metadata audit in `inquiry_events`.

Export contains the newest 500 rows, omits descriptions and internal notes, quotes all cells, and prefixes formula-like values. Use `/api/admin/inquiries/export?offset=500` for the next batch. Store exports only in approved private storage and delete them after use.

Review open inquiries monthly. Archive closed opportunities after 90 days without activity. Review archived records older than 180 days for deletion, subject to legal holds and necessary contract/accounting retention. Delete only with exact reference confirmation; notes cascade away. An inquiry linked to any quote/order cannot be deleted through this endpoint. For a legitimate erasure request involving financial records, manually review retention duties and minimize PII in a separately reviewed migration; do not bypass foreign keys.

Deletion retains only opaque reference, actor and event type in `inquiry_events`; purge those events after 90 days unless a legal hold applies. Backups and exported copies inherit the same retention review and access restrictions. This is an owner-operated retention procedure, not an automatic purge job.

## Rollback

Stop intake/retry traffic before rollback. Roll back the application first while leaving migration 0005 applied; its additive columns and status trigger are compatible with the previous code. Preserve idempotency keys and outbox state. A pre-0005 application cannot provide retry/idempotency guarantees, so keep intake disabled until recovery.

Prefer a forward fix. To reverse the schema, export all post-backup inquiries and related quote/order/audit data, then restore the pre-migration D1 backup in an isolated database, reconcile new records, verify counts/foreign keys, and switch the binding during maintenance. Restoring a backup directly over a live database loses accepted inquiries. Do not drop the tables or discard post-backup records. Rehearse backup restore and binding rollback in staging before production deployment.

## Manual merge checklist

- Validate Northstar is green at the PR head.
- Staging migration and rollback rehearsal completed by the owner.
- Owner Access policy and anonymous denial checked on live preview routes.
- Synthetic inquiry persists during email outage, retries once, and triage/audit/delete protections work.
- Merge #48 manually first. #49 depends on this request/confirmation contract; do not merge its stacked PR before #48.
